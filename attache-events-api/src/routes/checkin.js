const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { attendee_id, event_id } = req.body;
  if (!attendee_id || !event_id) return res.status(400).json({ error: 'attendee_id and event_id required' });
  try {
    const { data, error } = await supabase.from('event_checkins').insert({ attendee_id, event_id, checked_in_by: req.user.id }).select().single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Attendee already checked in' });
      throw error;
    }
    res.status(201).json({ message: 'Checked in successfully', checked_in_at: data.checked_in_at });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:attendee_id', authenticate, requireAdmin, async (req, res) => {
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });
  try {
    const { error } = await supabase.from('event_checkins').delete().eq('attendee_id', req.params.attendee_id).eq('event_id', event_id);
    if (error) throw error;
    res.json({ message: 'Check-in reversed successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/summary/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('event_checkin_summary').select('*').eq('event_id', req.params.event_id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/recent/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('event_checkins').select('checked_in_at, attendee_id, attendees(name, company)').eq('event_id', req.params.event_id).order('checked_in_at', { ascending: false }).limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
