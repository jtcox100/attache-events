const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [headers.map(h => `"${h}"`).join(','), ...rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
}

function sendCSV(res, filename, data) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCSV(data));
}

router.get('/attendance-by-session/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('session_attendance').select('scanned_at, sessions(title, start_time, rooms(name)), attendees(name, email, company)').eq('sessions.event_id', req.params.event_id).order('scanned_at', { ascending: true });
    if (error) throw error;
    sendCSV(res, `attendance-by-session.csv`, data.map(r => ({ session: r.sessions?.title || '', room: r.sessions?.rooms?.name || '', start_time: r.sessions?.start_time || '', attendee_name: r.attendees?.name || '', email: r.attendees?.email || '', company: r.attendees?.company || '', scanned_at: r.scanned_at })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/attendance-by-attendee/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('session_attendance').select('scanned_at, attendees(name, email, company), sessions(title, start_time)').eq('sessions.event_id', req.params.event_id);
    if (error) throw error;
    sendCSV(res, `attendance-by-attendee.csv`, data.map(r => ({ attendee_name: r.attendees?.name || '', email: r.attendees?.email || '', company: r.attendees?.company || '', session: r.sessions?.title || '', session_start: r.sessions?.start_time || '', scanned_at: r.scanned_at })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/checkins/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('event_checkins').select('checked_in_at, attendees(name, email, company)').eq('event_id', req.params.event_id).order('checked_in_at', { ascending: true });
    if (error) throw error;
    sendCSV(res, `checkins.csv`, data.map(r => ({ name: r.attendees?.name || '', email: r.attendees?.email || '', company: r.attendees?.company || '', checked_in_at: r.checked_in_at })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/no-shows/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: attendees, error } = await supabase.from('attendees').select('id, name, email, company').eq('event_id', req.params.event_id);
    if (error) throw error;
    const { data: checkins } = await supabase.from('event_checkins').select('attendee_id').eq('event_id', req.params.event_id);
    const checkedInIds = new Set((checkins || []).map(c => c.attendee_id));
    sendCSV(res, `no-shows.csv`, attendees.filter(a => !checkedInIds.has(a.id)));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/summary/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [checkinSummary, sessionCapacity] = await Promise.all([
      supabase.from('event_checkin_summary').select('*').eq('event_id', req.params.event_id).single(),
      supabase.from('session_capacity').select('*').eq('event_id', req.params.event_id).eq('is_mandatory', false).order('start_time', { ascending: true })
    ]);
    res.json({ checkin: checkinSummary.data || {}, sessions: sessionCapacity.data || [] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Reset all session scans for an event
router.delete('/reset-scans/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all session ids for this event
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('event_id', req.params.event_id);

    if (!sessions?.length) return res.json({ message: 'No sessions found' });

    const sessionIds = sessions.map(s => s.id);
    const { error } = await supabase
      .from('session_attendance')
      .delete()
      .in('session_id', sessionIds);

    if (error) throw error;
    res.json({ message: `Scan data cleared for ${sessionIds.length} sessions` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;

// Registrations overview — all attendees with session count
router.get('/registrations/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: attendees, error } = await supabase
      .from('attendees')
      .select('id, name, email, company, title, manually_edited, eventbrite_registered_at, qr_code')
      .eq('event_id', req.params.event_id)
      .order('eventbrite_registered_at', { ascending: false, nullsFirst: false });
    if (error) throw error;

    const { data: regs } = await supabase
      .from('session_registrations')
      .select('attendee_id, status, sessions(is_mandatory)')
      .eq('status', 'registered')
      .in('attendee_id', attendees.map(a => a.id));

    const regMap = {};
    (regs || []).forEach(r => {
      if (r.sessions?.is_mandatory) return; // exclude mandatory sessions
      if (!regMap[r.attendee_id]) regMap[r.attendee_id] = 0;
      regMap[r.attendee_id]++;
    });

    const result = attendees.map(a => ({
      ...a,
      session_count: regMap[a.id] || 0
    }));

    // CSV export if requested
    if (req.query.format === 'csv') {
      const rows = [
        ['Name', 'Email', 'Company', 'Title', 'Sessions Registered'],
        ...result.map(a => [a.name, a.email, a.company || '', a.title || '', a.session_count])
      ];
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="registrations.csv"`);
      return res.send(csv);
    }

    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Live session attendance — scanned in by monitors
router.get('/live-attendance/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('session_capacity')
      .select('session_id, title, room_name, start_time, end_time, capacity, registered_count, is_mandatory')
      .eq('event_id', req.params.event_id)
      .eq('is_mandatory', false)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Get scan counts from session_attendance
    const sessionIds = (sessions || []).map(s => s.session_id);
    const { data: scans } = await supabase
      .from('session_attendance')
      .select('session_id, attendee_id, scanned_at, attendees(name, company)')
      .in('session_id', sessionIds)
      .order('scanned_at', { ascending: false });

    // Build scan count map
    const scanMap = {};
    (scans || []).forEach(s => {
      if (!scanMap[s.session_id]) scanMap[s.session_id] = [];
      scanMap[s.session_id].push({ name: s.attendees?.name, company: s.attendees?.company, scanned_at: s.scanned_at });
    });

    const now = new Date();
    const result = (sessions || []).map(s => ({
      ...s,
      scanned_count: (scanMap[s.session_id] || []).length,
      scans: scanMap[s.session_id] || [],
      is_live: new Date(s.start_time) <= now && new Date(s.end_time) >= now
    }));

    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});
