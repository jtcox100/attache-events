const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all messages for an event (admin)
router.get('/admin/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('broadcast_messages')
      .select('*')
      .eq('event_id', req.params.event_id)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Create a new message (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { event_id, message, scheduled_at } = req.body;
  if (!event_id || !message || !scheduled_at) return res.status(400).json({ error: 'event_id, message and scheduled_at are required' });
  try {
    const { data, error } = await supabase
      .from('broadcast_messages')
      .insert({ event_id, message, scheduled_at })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete / cancel a message (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('broadcast_messages').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Message deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get unread messages for an attendee (polling endpoint)
router.get('/unread/:event_id', authenticate, async (req, res) => {
  if (req.user.role !== 'attendee') return res.status(403).json({ error: 'Attendee access required' });
  try {
    const now = new Date().toISOString();
    // Get all sent messages for this event (broadcast + targeted to this attendee)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: messages } = await supabase
      .from('broadcast_messages')
      .select('id, message, sent_at, attendee_id')
      .eq('event_id', req.params.event_id)
      .not('sent_at', 'is', null)
      .gte('sent_at', cutoff)
      .or(`attendee_id.is.null,attendee_id.eq.${req.user.id}`)
      .order('sent_at', { ascending: false });

    if (!messages?.length) return res.json([]);

    // Get already read message IDs for this attendee
    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('attendee_id', req.user.id)
      .in('message_id', messages.map(m => m.id));

    const readIds = new Set((reads || []).map(r => r.message_id));
    const unread = messages.filter(m => !readIds.has(m.id));
    res.json(unread);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Mark a message as sent immediately (admin send now)
router.post('/:id/sent', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('broadcast_messages')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Mark a message as read
router.post('/:id/read', authenticate, async (req, res) => {
  if (req.user.role !== 'attendee') return res.status(403).json({ error: 'Attendee access required' });
  try {
    await supabase.from('message_reads').upsert(
      { message_id: req.params.id, attendee_id: req.user.id },
      { onConflict: 'message_id,attendee_id' }
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
