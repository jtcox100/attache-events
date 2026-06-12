const supabase = require('../db/supabase');
const { promoteOrOffer } = require('../services/waitlistService');
const axios = require('axios');

async function getSessionsByEvent(req, res) {
  try {
    const { data, error } = await supabase.from('session_capacity').select('*').eq('event_id', req.params.event_id).order('start_time', { ascending: true });
    if (error) throw error;
    if (req.user.role === 'attendee') {
      const { data: regs } = await supabase.from('session_registrations').select('session_id, status').eq('attendee_id', req.user.id).neq('status', 'cancelled');
      const regMap = {};
      (regs || []).forEach(r => { regMap[r.session_id] = r.status; });
      return res.json(data.map(s => ({ ...s, my_status: regMap[s.session_id] || null })));
    }
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function getSession(req, res) {
  try {
    const { data, error } = await supabase.from('sessions').select('*, rooms(name, capacity, track)').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Session not found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function createSession(req, res) {
  const { event_id, room_id, title, description_brief, description_full, speaker_id, speaker_name, speaker_title, speaker_company, speaker_bio, speaker_photo_url, track, start_time, end_time, is_mandatory } = req.body;
  if (!event_id || !room_id || !title || !start_time || !end_time) return res.status(400).json({ error: 'event_id, room_id, title, start_time, end_time required' });
  try {
    const { data, error } = await supabase.from('sessions').insert({ event_id, room_id, title, description_brief, description_full, speaker_id: speaker_id || null, speaker_name, speaker_title, speaker_company, speaker_bio, speaker_photo_url, track: track || null, start_time, end_time, is_mandatory: is_mandatory || false }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function updateSession(req, res) {
  const fields = ['room_id', 'title', 'description_brief', 'description_full', 'speaker_id', 'speaker_name', 'speaker_title', 'speaker_company', 'speaker_bio', 'speaker_photo_url', 'start_time', 'end_time', 'is_mandatory'];
  const update = {};
  fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  try {
    const { data, error } = await supabase.from('sessions').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function deleteSession(req, res) {
  try {
    const { error } = await supabase.from('sessions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Session deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function bulkCreateSessions(req, res) {
  const { event_id, sessions } = req.body;
  if (!event_id || !Array.isArray(sessions) || sessions.length === 0) return res.status(400).json({ error: 'event_id and sessions array required' });
  try {
    const records = sessions.map(s => ({ event_id, room_id: s.room_id, title: s.title, description_brief: s.description_brief || null, description_full: s.description_full || null, speaker_name: s.speaker_name || null, speaker_title: s.speaker_title || null, speaker_company: s.speaker_company || null, speaker_bio: s.speaker_bio || null, track: s.track || null, start_time: s.start_time, end_time: s.end_time, is_mandatory: s.is_mandatory || false }));
    const { data, error } = await supabase.from('sessions').insert(records).select();
    if (error) throw error;
    res.status(201).json({ message: `${data.length} sessions created`, sessions: data });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function registerForSession(req, res) {
  const session_id = req.params.id;
  const attendee_id = req.user.id;
  try {
    // Get target session
    const { data: targetSession } = await supabase.from('sessions').select('start_time, end_time, title').eq('id', session_id).single();
    if (!targetSession) return res.status(404).json({ error: 'Session not found' });
    if (new Date(targetSession.end_time) < new Date()) return res.status(400).json({ error: 'This session has already ended' });

    // Check for time conflicts with existing registrations
    const { data: existingRegs } = await supabase
      .from('session_registrations')
      .select('session_id, sessions(title, start_time, end_time, is_mandatory)')
      .eq('attendee_id', attendee_id)
      .in('status', ['registered']);

    const targetStart = new Date(targetSession.start_time);
    const targetEnd = new Date(targetSession.end_time);

    for (const reg of (existingRegs || [])) {
      if (!reg.sessions) continue;
      const s = reg.sessions;
      const sStart = new Date(s.start_time);
      const sEnd = new Date(s.end_time);
      if (targetStart < sEnd && targetEnd > sStart) {
        return res.status(409).json({ error: `Time conflict — you already have "${s.title}" at this time` });
      }
    }

    // Get capacity
    const { data: cap } = await supabase.from('session_capacity').select('seats_remaining').eq('session_id', session_id).single();
    if (!cap) return res.status(404).json({ error: 'Session not found' });
    const status = cap.seats_remaining > 0 ? 'registered' : 'waitlisted';

    // Check if a record already exists (including cancelled)
    const { data: existing } = await supabase.from('session_registrations').select('id, status').eq('attendee_id', attendee_id).eq('session_id', session_id).single();

    if (existing) {
      const reRegisterable = ['cancelled', 'declined', 'expired'];
      if (reRegisterable.includes(existing.status)) {
        // Re-register by updating the existing record
        const { error } = await supabase.from('session_registrations').update({ status }).eq('id', existing.id);
        if (error) throw error;
        return res.status(201).json({ message: status === 'waitlisted' ? "You've been added to the waitlist. Please check your email occasionally in case a spot opens up!" : 'Successfully registered', status });
      } else {
        return res.status(409).json({ error: 'Already registered for this session' });
      }
    }

    // Fresh registration
    const { error } = await supabase.from('session_registrations').insert({ attendee_id, session_id, status });
    if (error) throw error;
    res.status(201).json({ message: status === 'waitlisted' ? "You've been added to the waitlist. Please check your email occasionally in case a spot opens up!" : 'Successfully registered', status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function cancelRegistration(req, res) {
  const session_id = req.params.id;
  const attendee_id = req.user.id;
  try {
    const { error } = await supabase.from('session_registrations').update({ status: 'cancelled' }).eq('attendee_id', attendee_id).eq('session_id', session_id);
    if (error) throw error;
    // Promote next waitlisted attendee (handles conflicts via promoteOrOffer)
    const { data: nextWaitlisted } = await supabase
      .from('session_registrations')
      .select('id, attendee_id')
      .eq('session_id', session_id)
      .eq('status', 'waitlisted')
      .order('registered_at', { ascending: true })
      .limit(1).single();

    if (nextWaitlisted) {
      try {
        await promoteOrOffer(session_id, nextWaitlisted);
      } catch (err) {
        console.error('[waitlist] promoteOrOffer failed:', err.message);
      }
    }
    res.json({ message: 'Registration cancelled' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

module.exports = { getSessionsByEvent, getSession, createSession, updateSession, deleteSession, bulkCreateSessions, registerForSession, cancelRegistration };
