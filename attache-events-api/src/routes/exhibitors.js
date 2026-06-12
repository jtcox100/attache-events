const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all exhibitors for an event
router.get('/event/:event_id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('exhibitors')
      .select('*, partners(id, name, logo_url)')
      .eq('event_id', req.params.event_id)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Add exhibitor
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { event_id, partner_id, name, title } = req.body;
  if (!event_id || !partner_id || !name) return res.status(400).json({ error: 'event_id, partner_id and name required' });
  try {
    const { data, error } = await supabase.from('exhibitors')
      .insert({ event_id, partner_id, name, title: title || null })
      .select('*, partners(id, name, logo_url)').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update exhibitor
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { partner_id, name, title } = req.body;
  try {
    const { data, error } = await supabase.from('exhibitors')
      .update({ partner_id, name, title: title || null })
      .eq('id', req.params.id)
      .select('*, partners(id, name, logo_url)').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete exhibitor
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await supabase.from('exhibitors').delete().eq('id', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
