const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');

router.get('/event/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('rooms').select('*').eq('event_id', req.params.event_id).order('track').order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { event_id, name, capacity, track } = req.body;
  if (!event_id || !name || !capacity) return res.status(400).json({ error: 'event_id, name, and capacity required' });
  try {
    const { data, error } = await supabase.from('rooms').insert({ event_id, name, capacity, track: track || null }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, capacity, track } = req.body;
  try {
    const { data, error } = await supabase.from('rooms').update({ name, capacity, track }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('rooms').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Room deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
