const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');
const { generateBadgePDF } = require('../services/badgeService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/event/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [attendeesRes, eventRes] = await Promise.all([
      supabase.from('attendees').select('id, name, email, company, title, qr_code').eq('event_id', req.params.event_id).order('name', { ascending: true }),
      supabase.from('events').select('id, name, badge_logo_url, badge_logo_width, badge_logo_height').eq('id', req.params.event_id).single()
    ]);
    if (attendeesRes.error) throw attendeesRes.error;
    if (!attendeesRes.data?.length) return res.status(404).json({ error: 'No attendees found' });
    const pdfBuffer = await generateBadgePDF(attendeesRes.data, eventRes.data || {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="badges.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate badges' }); }
});

router.get('/preview/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [attendeesRes, eventRes] = await Promise.all([
      supabase.from('attendees').select('id, name, email, company, title, qr_code').eq('event_id', req.params.event_id).order('name', { ascending: true }).limit(1),
      supabase.from('events').select('id, name, badge_logo_url, badge_logo_width, badge_logo_height').eq('id', req.params.event_id).single()
    ]);
    if (!attendeesRes.data?.length) return res.status(404).json({ error: 'No attendees found' });
    const pdfBuffer = await generateBadgePDF(attendeesRes.data, eventRes.data || {}, true);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="badge-preview.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate preview' }); }
});

router.post('/logo/:event_id', authenticate, requireAdmin, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const filename = `badge-logos/${req.params.event_id}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('event-assets').upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(filename);
    const { width, height } = getImageDimensions(req.file.buffer);
    await supabase.from('events').update({ badge_logo_url: urlData.publicUrl, badge_logo_width: width, badge_logo_height: height }).eq('id', req.params.event_id);
    res.json({ message: 'Logo uploaded successfully', url: urlData.publicUrl, width, height });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to upload logo' }); }
});

function getImageDimensions(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] === 0xFF && (buffer[i+1] === 0xC0 || buffer[i+1] === 0xC2)) {
      return { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
    }
    i += 2 + buffer.readUInt16BE(i + 2);
  }
  return { width: 1000, height: 400 };
}

// Single badge — specific attendee at specific label position (1-6)
router.get('/single/:event_id/:attendee_id', authenticate, requireAdmin, async (req, res) => {
  const position = parseInt(req.query.position || '1');
  if (position < 1 || position > 6) return res.status(400).json({ error: 'Position must be 1–6' });
  try {
    const [attendeeRes, eventRes] = await Promise.all([
      supabase.from('attendees').select('id, name, email, company, title, qr_code').eq('id', req.params.attendee_id).single(),
      supabase.from('events').select('id, name, badge_logo_url, badge_logo_width, badge_logo_height').eq('id', req.params.event_id).single()
    ]);
    if (!attendeeRes.data) return res.status(404).json({ error: 'Attendee not found' });

    // Build a 6-slot array with the attendee only at the chosen position (1-indexed)
    const slots = Array(6).fill(null);
    slots[position - 1] = attendeeRes.data;

    const pdfBuffer = await generateBadgePDF(slots, eventRes.data || {});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="badge-${attendeeRes.data.name}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate badge' }); }
});

module.exports = router;
