const express = require('express');
const router = express.Router();
const { authenticate, requireMonitor } = require('../middleware/auth');
const supabase = require('../db/supabase');

// Insert a session_attendance row if not already present.
// Returns 'already_scanned' if the attendee is already in the room, otherwise 'admit'.
async function recordAttendance(attendee, session_id, monitor_id) {
  const { data: existing } = await supabase
    .from('session_attendance')
    .select('id')
    .eq('attendee_id', attendee.id)
    .eq('session_id', session_id)
    .single();
  if (existing) {
    return { scan_result: 'already_scanned', attendance_id: existing.id, attendee_name: attendee.name, company: attendee.company };
  }
  const { data: inserted } = await supabase.from('session_attendance').insert({
    attendee_id: attendee.id,
    session_id,
    monitor_id,
    scanned_at: new Date().toISOString(),
  }).select('id').single();
  return { scan_result: 'admit', attendance_id: inserted?.id || null, attendee_name: attendee.name, company: attendee.company };
}

// Scan a QR code against a session.
// HARD RULE: an attendee can never be admitted unless they have checked in at the
// front desk (event_checkins). Session registration is the soft/overridable layer.
//
//   front-desk check-in? | registered? | result
//   ---------------------+-------------+----------------------------------------
//   no                   | (any)       | no_door_checkin  -> hard block, no admit
//   yes                  | yes         | admit            -> auto-admitted
//   yes                  | no          | override_available -> monitor decides
router.get('/scan/:qr_code/session/:session_id', authenticate, requireMonitor, async (req, res) => {
  const { qr_code, session_id } = req.params;
  try {
    const { data: attendee, error: attErr } = await supabase
      .from('attendees')
      .select('id, name, company, event_id')
      .eq('qr_code', qr_code)
      .single();
    if (attErr || !attendee) {
      return res.json({ scan_result: 'invalid', attendee_name: null, company: null });
    }

    const { data: reg } = await supabase
      .from('session_registrations')
      .select('status')
      .eq('attendee_id', attendee.id)
      .eq('session_id', session_id)
      .single();
    const { data: checkin } = await supabase
      .from('event_checkins')
      .select('checked_in_at')
      .eq('attendee_id', attendee.id)
      .eq('event_id', attendee.event_id)
      .single();

    const isRegistered = reg && reg.status === 'registered';
    const hasDoorCheckin = !!checkin;

    // HARD RULE: no front-desk check-in => never admit, no override possible.
    if (!hasDoorCheckin) {
      return res.json({
        scan_result: 'no_door_checkin',
        attendee_name: attendee.name,
        company: attendee.company,
        registration_status: reg?.status || null,
      });
    }

    // Front-desk check-in confirmed past this point.

    // Checked in but not registered for THIS session => monitor must decide.
    // Do NOT auto-admit; surface the override prompt instead (unless already in the room).
    if (!isRegistered) {
      const { data: existing } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('attendee_id', attendee.id)
        .eq('session_id', session_id)
        .single();
      if (existing) {
        return res.json({ scan_result: 'already_scanned', attendee_name: attendee.name, company: attendee.company });
      }
      return res.json({
        scan_result: 'override_available',
        attendee_name: attendee.name,
        company: attendee.company,
        registration_status: reg?.status || null,
      });
    }

    // Registered + checked in => auto-admit.
    const result = await recordAttendance(attendee, session_id, req.user.id);
    res.json({ ...result, registration_status: reg.status, door_checkin_at: checkin.checked_in_at });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Monitor override: admit an attendee who is checked in at the front desk but is
// NOT registered for this session. Triggered when the monitor taps "Admit" on the
// override prompt. The front-desk check-in HARD RULE is re-verified here so the
// override can never bypass it, regardless of what the client sends.
router.post('/admit/:qr_code/session/:session_id', authenticate, requireMonitor, async (req, res) => {
  const { qr_code, session_id } = req.params;
  try {
    const { data: attendee, error: attErr } = await supabase
      .from('attendees')
      .select('id, name, company, event_id')
      .eq('qr_code', qr_code)
      .single();
    if (attErr || !attendee) {
      return res.json({ scan_result: 'invalid', attendee_name: null, company: null });
    }

    // Re-enforce the hard rule server-side.
    const { data: checkin } = await supabase
      .from('event_checkins')
      .select('checked_in_at')
      .eq('attendee_id', attendee.id)
      .eq('event_id', attendee.event_id)
      .single();
    if (!checkin) {
      return res.json({
        scan_result: 'no_door_checkin',
        attendee_name: attendee.name,
        company: attendee.company,
      });
    }

    const result = await recordAttendance(attendee, session_id, req.user.id);
    res.json({ ...result, override: result.scan_result === 'admit' });
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
      .select('id, scanned_at, attendees(name, company)')
      .eq('session_id', req.params.session_id)
      .order('scanned_at', { ascending: true });
    if (error) throw error;
    const attendees = (data || []).map(r => ({
      id: r.id,
      name: r.attendees?.name,
      company: r.attendees?.company,
      scanned_at: r.scanned_at
    }));
    res.json({ count: attendees.length, attendees });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Remove an attendee from the room (delete their session_attendance row).
// Used by the monitor's per-attendee "Remove" button; headcount adjusts on the client.
router.delete('/attendance/:id', authenticate, requireMonitor, async (req, res) => {
  try {
    const { error } = await supabase.from('session_attendance').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Removed from room' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
