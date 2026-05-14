const express = require('express');
const router = express.Router();
const { authenticate, requireMonitor } = require('../middleware/auth');
const supabase = require('../db/supabase');

router.get('/scan/:qr_code/session/:session_id', authenticate, requireMonitor, async (req, res) => {
  const { qr_code, session_id } = req.params;
  try {
    const { data: attendee, error: attErr } = await supabase.from('attendees').select('id, name, company, event_id').eq('qr_code', qr_code).single();
    if (attErr || !attendee) return res.json({ scan_result: 'not_registered', attendee_name: null, company: null });

    const { data: reg } = await supabase.from('session_registrations').select('status').eq('attendee_id', attendee.id).eq('session_id', session_id).single();
    const { data: checkin } = await supabase.from('event_checkins').select('checked_in_at').eq('attendee_id', attendee.id).eq('event_id', attendee.event_id).single();

    let scan_result;
    if (!reg || reg.status === 'cancelled') scan_result = 'not_registered';
    else if (reg.status === 'registered' && checkin) scan_result = 'admit';
    else if (reg.status === 'registered' && !checkin) scan_result = 'no_door_checkin';
    else scan_result = 'not_registered';

    if (scan_result === 'admit' || scan_result === 'no_door_checkin') {
      // Check if already scanned into this session
      const { data: existing } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('attendee_id', attendee.id)
        .eq('session_id', session_id)
        .single();

      if (existing) {
        // Already scanned — return distinct result, don't insert again
        return res.json({ scan_result: 'already_scanned', attendee_name: attendee.name, company: attendee.company });
      }

      await supabase.from('session_attendance').insert({ attendee_id: attendee.id, session_id, monitor_id: req.user.id, scanned_at: new Date().toISOString() });
    }

    res.json({ scan_result, attendee_name: attendee.name, company: attendee.company, registration_status: reg?.status || null, door_checkin_at: checkin?.checked_in_at || null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/sessions/:event_id', authenticate, requireMonitor, async (req, res) => {
  try {
    const { data, error } = await supabase.from('session_capacity').select('session_id, title, room_name, start_time, end_time, registered_count, capacity').eq('event_id', req.params.event_id).eq('is_mandatory', false).order('start_time', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get current scan count and attendee list for a session
router.get('/scan-count/:session_id', authenticate, requireMonitor, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('session_attendance')
      .select('scanned_at, attendees(name, company)')
      .eq('session_id', req.params.session_id)
      .order('scanned_at', { ascending: true });
    if (error) throw error;
    const attendees = (data || []).map(r => ({
      name: r.attendees?.name,
      company: r.attendees?.company,
      scanned_at: r.scanned_at
    }));
    res.json({ count: attendees.length, attendees });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
