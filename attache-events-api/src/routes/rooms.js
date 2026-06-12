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
    // Get old capacity before update
    const { data: oldRoom } = await supabase.from('rooms').select('capacity').eq('id', req.params.id).single();

    const { data, error } = await supabase.from('rooms').update({ name, capacity, track }).eq('id', req.params.id).select().single();
    if (error) throw error;

    // If capacity increased, promote waitlisted attendees for all sessions in this room
    console.log(`[room-update] old capacity: ${oldRoom?.capacity}, new capacity: ${capacity}`);
    if (capacity > (oldRoom?.capacity || 0)) {
      console.log(`[room-update] capacity increased, checking waitlists`);
      const { data: sessions } = await supabase.from('sessions').select('id').eq('room_id', req.params.id);
      for (const session of (sessions || [])) {
        // How many seats are now available?
        const { count: registered } = await supabase.from('session_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('status', 'registered');
        const available = capacity - (registered || 0);
        if (available <= 0) continue;

        // Promote up to `available` waitlisted attendees using promoteOrOffer
        const { data: waitlisted } = await supabase.from('session_registrations')
          .select('id, attendee_id')
          .eq('session_id', session.id)
          .eq('status', 'waitlisted')
          .order('registered_at', { ascending: true })
          .limit(available);

        const { promoteOrOffer } = require('../services/waitlistService');
        for (const w of (waitlisted || [])) {
          await promoteOrOffer(session.id, w).catch(console.error);
        }
        if (waitlisted?.length) console.log(`[room-capacity] Processed ${waitlisted.length} waitlisted for session ${session.id}`);
      }
    }

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
