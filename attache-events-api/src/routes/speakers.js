const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Get all speakers for an event
router.get('/event/:event_id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('speakers')
      .select('*')
      .eq('event_id', req.params.event_id)
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Create speaker
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { event_id, name, title, company, bio } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: 'event_id and name are required' });
  try {
    const { data, error } = await supabase
      .from('speakers')
      .insert({ event_id, name, title, company, bio })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update speaker
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, title, company, bio } = req.body;
  try {
    const { data, error } = await supabase
      .from('speakers')
      .update({ name, title, company, bio })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete speaker
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('speakers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Speaker deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Upload speaker photo
router.post('/:id/photo', authenticate, requireAdmin, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const filename = `speaker-photos/${req.params.id}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('event-assets')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(filename);
    await supabase.from('speakers').update({ photo_url: urlData.publicUrl }).eq('id', req.params.id);
    res.json({ photo_url: urlData.publicUrl });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Upload failed' }); }
});

module.exports = router;
