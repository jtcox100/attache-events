const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get speakers for a session
router.get('/:session_id/speakers', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('session_speakers')
      .select('speaker_id, speakers(*)')
      .eq('session_id', req.params.session_id);
    if (error) throw error;
    res.json((data || []).map(r => r.speakers));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update speakers for a session
router.put('/:session_id/speakers', authenticate, requireAdmin, async (req, res) => {
  const { speaker_ids } = req.body;
  try {
    await supabase.from('session_speakers').delete().eq('session_id', req.params.session_id);
    if (speaker_ids?.length) {
      await supabase.from('session_speakers').insert(
        speaker_ids.map(speaker_id => ({ session_id: req.params.session_id, speaker_id }))
      );
    }
    // Also update legacy speaker_id with first speaker for backwards compat
    const primary = speaker_ids?.[0] || null;
    await supabase.from('sessions').update({ speaker_id: primary }).eq('id', req.params.session_id);
    res.json({ message: 'Speakers updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
