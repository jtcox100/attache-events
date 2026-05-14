const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Get all partners for an event (with their speakers)
router.get('/event/:event_id', authenticate, async (req, res) => {
  try {
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .eq('event_id', req.params.event_id)
      .order('name', { ascending: true });
    if (error) throw error;

    // Get speaker assignments for all partners
    const partnerIds = (partners || []).map(p => p.id);
    const { data: assignments } = await supabase
      .from('partner_speakers')
      .select('partner_id, speakers(*)')
      .in('partner_id', partnerIds.length ? partnerIds : ['none']);

    // Map speakers to partners
    const speakerMap = {};
    (assignments || []).forEach(a => {
      if (!speakerMap[a.partner_id]) speakerMap[a.partner_id] = [];
      speakerMap[a.partner_id].push(a.speakers);
    });

    res.json((partners || []).map(p => ({ ...p, speakers: speakerMap[p.id] || [] })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Create partner
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { event_id, name, description, address, phone, email } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: 'event_id and name are required' });
  try {
    const { data, error } = await supabase
      .from('partners')
      .insert({ event_id, name, description, address, phone, email })
      .select().single();
    if (error) throw error;
    res.status(201).json({ ...data, speakers: [] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update partner
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, description, address, phone, email } = req.body;
  try {
    const { data, error } = await supabase
      .from('partners')
      .update({ name, description, address, phone, email })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete partner
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('partners').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Partner deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Upload partner logo
router.post('/:id/logo', authenticate, requireAdmin, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const ext = req.file.originalname.split('.').pop().toLowerCase() || 'png';
    const filename = `partner-logos/${req.params.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('event-assets')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(filename);
    await supabase.from('partners').update({ logo_url: urlData.publicUrl }).eq('id', req.params.id);
    res.json({ logo_url: urlData.publicUrl });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Upload failed' }); }
});

// Update speaker assignments for a partner
router.put('/:id/speakers', authenticate, requireAdmin, async (req, res) => {
  const { speaker_ids } = req.body;
  try {
    // Remove all existing assignments
    await supabase.from('partner_speakers').delete().eq('partner_id', req.params.id);
    // Add new ones
    if (speaker_ids?.length) {
      await supabase.from('partner_speakers').insert(
        speaker_ids.map(speaker_id => ({ partner_id: req.params.id, speaker_id }))
      );
    }
    res.json({ message: 'Speakers updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
