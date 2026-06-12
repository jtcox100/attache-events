const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');

router.get('/', eventsController.getAllEvents);
router.get('/:id', eventsController.getEvent);
router.post('/', authenticate, requireAdmin, eventsController.createEvent);
router.put('/:id', authenticate, requireAdmin, eventsController.updateEvent);

// Upload floor plan image
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/:id/floor-plan', authenticate, requireAdmin, upload.single('floor_plan'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const ext = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
    const filename = `floor-plans/${req.params.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('event-assets')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(filename);
    await supabase.from('events').update({ floor_plan_url: urlData.publicUrl }).eq('id', req.params.id);
    res.json({ floor_plan_url: urlData.publicUrl });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Upload failed' }); }
});

module.exports = router;
