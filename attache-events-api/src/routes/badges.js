const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');
const { generateBadgePDF } = require('../services/badgeService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/event/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const showTitle = req.query.show_title !== 'false';
    const [attendeesRes, eventRes] = await Promise.all([
      supabase.from('attendees').select('id, name, email, company, title, qr_code, eventbrite_registered_at').eq('event_id', req.params.event_id).order('eventbrite_registered_at', { ascending: true, nullsFirst: false }),
      supabase.from('events').select('id, name, badge_logo_url, badge_logo_width, badge_logo_height').eq('id', req.params.event_id).single()
    ]);
    if (attendeesRes.error) throw attendeesRes.error;
    if (!attendeesRes.data?.length) return res.status(404).json({ error: 'No attendees found' });
    const pdfBuffer = await generateBadgePDF(attendeesRes.data, eventRes.data || {}, false, showTitle);
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
    // Include timestamp to bust CDN cache on re-upload
    const filename = `badge-logos/${req.params.event_id}-${Date.now()}.${ext}`;
    // Delete old logo first if exists
    const { data: existing } = await supabase.from('events').select('badge_logo_url').eq('id', req.params.event_id).single();
    if (existing?.badge_logo_url) {
      const oldPath = existing.badge_logo_url.split('/event-assets/')[1];
      if (oldPath) await supabase.storage.from('event-assets').remove([oldPath]).catch(() => {});
    }
    const { error: uploadErr } = await supabase.storage.from('event-assets').upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
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

// Generate partner badges for an event (POST to support additional badges)
router.post('/partners/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { additional = [] } = req.body;
    const { data: event } = await supabase.from('events').select('*').eq('id', req.params.event_id).single();
    const { data: partners } = await supabase.from('partners').select('*').eq('event_id', req.params.event_id);

    const partnerMap = {};
    (partners || []).forEach(p => { partnerMap[p.id] = p; });

    const badges = [];

    // Partner speaker badges
    for (const partner of (partners || [])) {
      const { data: pSpeakers } = await supabase
        .from('partner_speakers').select('speakers(*)').eq('partner_id', partner.id);
      if (pSpeakers?.length) {
        for (const ps of pSpeakers) {
          const sp = ps.speakers;
          if (sp) badges.push({ name: sp.name, title: sp.title || '', company: partner.name, is_partner: true, partner_logo_url: partner.logo_url, qr_code: partner.id });
        }
      } else {
        badges.push({ name: partner.name, title: '', company: '', is_partner: true, partner_logo_url: partner.logo_url, qr_code: partner.id });
      }
    }

    // Additional manually entered badges
    for (const extra of additional) {
      if (!extra.name?.trim() || !extra.partner_id) continue;
      const partner = partnerMap[extra.partner_id];
      if (partner) {
        badges.push({ name: extra.name.trim(), title: extra.title || '', company: partner.name, is_partner: true, partner_logo_url: partner.logo_url, qr_code: partner.id });
      }
    }

    if (!badges.length) return res.status(404).json({ error: 'No badges to generate' });

    const pdfBuffer = await generateBadgePDF(badges, event);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="partner-badges.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate partner badges' }); }
});

// Single partner badge
router.get('/partner/:partner_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: partner } = await supabase.from('partners').select('*').eq('id', req.params.partner_id).single();
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    const { data: event } = await supabase.from('events').select('*').eq('id', partner.event_id).single();
    const { data: pSpeakers } = await supabase.from('partner_speakers').select('speakers(*)').eq('partner_id', partner.id);

    const badges = [];
    if (pSpeakers?.length) {
      for (const ps of pSpeakers) {
        const sp = ps.speakers;
        if (sp) badges.push({ name: sp.name, title: sp.title || '', company: partner.name, is_partner: true, partner_logo_url: partner.logo_url, qr_code: partner.id });
      }
    } else {
      badges.push({ name: partner.name, title: '', company: '', is_partner: true, partner_logo_url: partner.logo_url, qr_code: partner.id });
    }

    const pdfBuffer = await generateBadgePDF(badges, event);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="partner-badge-${partner.name}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate partner badge' }); }
});

// Generate exhibitor badges
router.get('/exhibitors/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: event } = await supabase.from('events').select('*').eq('id', req.params.event_id).single();
    const { data: exhibitors } = await supabase
      .from('exhibitors')
      .select('*, partners(name, logo_url)')
      .eq('event_id', req.params.event_id)
      .order('name');
    if (!exhibitors?.length) return res.status(404).json({ error: 'No exhibitors found' });

    const badges = exhibitors.map(ex => ({
      name: ex.name,
      title: ex.title || '',
      company: ex.partners?.name || '',
      is_partner: true,
      partner_logo_url: ex.partners?.logo_url || null,
      qr_code: ex.id
    }));

    const pdfBuffer = await generateBadgePDF(badges, event);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="exhibitor-badges.pdf"');
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate exhibitor badges' }); }
});

// Combined partner badges — speakers + exhibitors in one PDF
router.get('/all-partner/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data: event } = await supabase.from('events').select('*').eq('id', req.params.event_id).single();
    const { data: partners } = await supabase.from('partners').select('*').eq('event_id', req.params.event_id);

    const badges = [];

    // Speaker badges
    for (const partner of (partners || [])) {
      const { data: pSpeakers } = await supabase
        .from('partner_speakers').select('speakers(*)').eq('partner_id', partner.id);
      if (pSpeakers?.length) {
        for (const ps of pSpeakers) {
          const sp = ps.speakers;
          if (sp) badges.push({ name: sp.name, title: sp.title || '', company: partner.name, is_partner: true, partner_logo_url: partner.logo_url, qr_code: sp.id });
        }
      }
    }

    // Exhibitor badges
    const { data: exhibitors } = await supabase
      .from('exhibitors').select('*, partners(name, logo_url)').eq('event_id', req.params.event_id).order('name');
    for (const ex of (exhibitors || [])) {
      badges.push({ name: ex.name, title: ex.title || '', company: ex.partners?.name || '', is_partner: true, partner_logo_url: ex.partners?.logo_url || null, qr_code: ex.id });
    }

    if (!badges.length) return res.status(404).json({ error: 'No speakers or exhibitors found' });

    const pdfBuffer = await generateBadgePDF(badges, event);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="partner-badges.pdf"');
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate badges' }); }
});

// Ad-hoc badge print — accepts array of people (attendees, speakers, exhibitors)
router.post('/adhoc/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { people } = req.body;
    if (!people?.length) return res.status(400).json({ error: 'No people provided' });
    const { data: event } = await supabase.from('events').select('*').eq('id', req.params.event_id).single();

    const badges = [];
    for (const p of people) {
      let partner_logo_url = p.partner_logo_url || null;

      // For speakers, look up partner logo via partner_speakers junction
      if (p._type === 'speaker' && !partner_logo_url) {
        const { data: ps } = await supabase
          .from('partner_speakers')
          .select('partners(logo_url, name)')
          .eq('speaker_id', p.id)
          .limit(1);
        if (ps?.length) {
          partner_logo_url = ps[0].partners?.logo_url || null;
          if (!p.company && ps[0].partners?.name) p.company = ps[0].partners.name;
        }
      }

      badges.push({
        name: p.name,
        title: p.title || '',
        company: p.company || '',
        qr_code: p.qr_code || p.id,
        is_partner: p._type === 'speaker' || p._type === 'exhibitor' || p.is_partner || false,
        partner_logo_url
      });
    }

    const pdfBuffer = await generateBadgePDF(badges, event || {}, false, true);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="adhoc-badges.pdf"');
    res.send(pdfBuffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate badges' }); }
});

module.exports = router;
