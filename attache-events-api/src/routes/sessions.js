const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');

// Specific named routes FIRST — before any /:id patterns
router.get('/event/:event_id', authenticate, sessionsController.getSessionsByEvent);

router.post('/bulk', authenticate, requireAdmin, sessionsController.bulkCreateSessions);

router.post('/swap-rooms', authenticate, requireAdmin, async (req, res) => {
  const { session_id_a, session_id_b } = req.body;
  if (!session_id_a || !session_id_b) return res.status(400).json({ error: 'Two session IDs required' });
  try {
    const { data: a } = await supabase.from('sessions').select('id, title, room_id, event_id').eq('id', session_id_a).single();
    const { data: b } = await supabase.from('sessions').select('id, title, room_id, event_id').eq('id', session_id_b).single();
    if (!a || !b) return res.status(404).json({ error: 'One or both sessions not found' });
    const { data: roomA } = await supabase.from('rooms').select('name').eq('id', a.room_id).single();
    const { data: roomB } = await supabase.from('rooms').select('name').eq('id', b.room_id).single();
    await supabase.from('sessions').update({ room_id: b.room_id }).eq('id', a.id);
    await supabase.from('sessions').update({ room_id: a.room_id }).eq('id', b.id);
    const message = `📍 Room change: "${a.title}" has moved to ${roomB.name}, and "${b.title}" has moved to ${roomA.name}. Please check the schedule for updated locations.`;
    console.log('[swap-rooms] inserting broadcast, event_id:', a.event_id, 'message:', message.slice(0,50));
    const now = new Date().toISOString();
    const { error: msgErr } = await supabase.from('broadcast_messages').insert({ event_id: a.event_id, message, scheduled_at: now, sent_at: now });
    if (msgErr) console.error('[swap-rooms] broadcast insert error:', msgErr.message);
    else console.log('[swap-rooms] broadcast sent successfully');
    res.json({ message: 'Rooms swapped and attendees notified', notification: message });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// /:id/speakers before /:id
router.get('/:id/speakers', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('session_speakers')
      .select('speaker_id, speakers(*)')
      .eq('session_id', req.params.id);
    if (error) throw error;
    res.json((data || []).map(r => r.speakers).filter(Boolean));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/speakers', authenticate, requireAdmin, async (req, res) => {
  const { speaker_ids } = req.body;
  try {
    await supabase.from('session_speakers').delete().eq('session_id', req.params.id);
    if (speaker_ids?.length) {
      await supabase.from('session_speakers').insert(
        speaker_ids.map(speaker_id => ({ session_id: req.params.id, speaker_id }))
      );
    }
    const primary = speaker_ids?.[0] || null;
    await supabase.from('sessions').update({ speaker_id: primary }).eq('id', req.params.id);
    res.json({ message: 'Speakers updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/register', authenticate, sessionsController.cancelRegistration);
router.post('/:id/register', authenticate, sessionsController.registerForSession);

// Generic /:id routes LAST
router.get('/:id', authenticate, sessionsController.getSession);
router.post('/', authenticate, requireAdmin, sessionsController.createSession);
router.put('/:id', authenticate, requireAdmin, sessionsController.updateSession);
router.delete('/:id', authenticate, requireAdmin, sessionsController.deleteSession);

module.exports = router;
