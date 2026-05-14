const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const syncService = require('../services/syncService');
const supabase = require('../db/supabase');

router.post('/eventbrite/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await syncService.syncEventbrite(req.params.event_id);
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Sync failed' }); }
});

router.get('/status/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('eventbrite_credentials').select('last_synced_at, sync_schedule, account_name').eq('event_id', req.params.event_id).single();
    if (error || !data) return res.status(404).json({ error: 'No credentials found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
