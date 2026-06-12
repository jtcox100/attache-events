const express = require('express');
const router = express.Router();
const attendeesController = require('../controllers/attendeesController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const supabase = require('../db/supabase');

router.get('/public/:event_id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select('id, name, title, company, photo_url, pronouns, headline, about_me, city, visible_in_directory')
      .eq('event_id', req.params.event_id)
      .eq('visible_in_directory', true)
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get single attendee public profile
router.get('/public/profile/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select('id, name, title, company, photo_url, pronouns, headline, about_me, city, visible_in_directory')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Attendee not found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/search', authenticate, requireAdmin, attendeesController.searchAttendees);
router.get('/event/:event_id', authenticate, requireAdmin, attendeesController.getAttendeesByEvent);
router.get('/me/profile', authenticate, attendeesController.getMyProfile);
router.get('/qr/:qr_code', authenticate, attendeesController.getAttendeeByQR);
// Add walk-in attendee (admin only) — creates attendee and checks them in
router.post('/walkin', authenticate, requireAdmin, async (req, res) => {
  const { event_id, name, email, company, title } = req.body;
  if (!event_id || !name || !email) return res.status(400).json({ error: 'event_id, name and email are required' });
  try {
    // Check if already registered
    const { data: existing } = await supabase
      .from('attendees')
      .select('id, name')
      .eq('event_id', event_id)
      .eq('email', email.toLowerCase().trim())
      .single();
    if (existing) return res.status(409).json({ error: `${existing.name} is already registered with that email` });

    // Generate a unique QR code
    const qr_code = `WALKIN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const eventbrite_registered_at = new Date().toISOString();

    // Insert attendee
    const { data: attendee, error } = await supabase
      .from('attendees')
      .insert({ event_id, name, email: email.toLowerCase().trim(), company: company || null, title: title || null, qr_code, eventbrite_registered_at })
      .select('id, name, email, company, title, qr_code')
      .single();
    if (error) throw error;

    // Auto check-in
    await supabase.from('event_checkins').insert({ attendee_id: attendee.id, event_id, checked_in_at: new Date().toISOString() });

    res.status(201).json({ ...attendee, checked_in: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Look up attendee by exact QR code
router.get('/by-qr', authenticate, requireAdmin, async (req, res) => {
  const { qr_code, event_id } = req.query;
  if (!qr_code || !event_id) return res.status(400).json({ error: 'qr_code and event_id required' });
  console.log('[by-qr] looking up qr_code:', JSON.stringify(qr_code), 'length:', qr_code.length, 'event_id:', event_id);
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select('id, name, email, company, title, qr_code, checked_in_at:event_checkins(checked_in_at)')
      .eq('event_id', event_id)
      .eq('qr_code', qr_code)
      .single();
    console.log('[by-qr] result:', data ? data.name : 'null', 'error:', error?.message);
    if (error || !data) return res.status(404).json(null);
    // Flatten checked_in_at
    const checked_in_at = data.checked_in_at?.[0]?.checked_in_at || null;
    res.json({ ...data, checked_in_at });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, requireAdmin, attendeesController.getAttendee);

// Attendee Snapshot: a single attendee's full day — front-desk check-in,
// every room they were scanned into, and the survey tied to each session.
router.get('/:id/snapshot', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: attendee } = await supabase
      .from('attendees')
      .select('id, name, email, company, title, event_id')
      .eq('id', id)
      .single();
    if (!attendee) return res.status(404).json({ error: 'Attendee not found' });
    const eventId = attendee.event_id;

    // Front-desk check-in (may not exist)
    const { data: checkinRows } = await supabase
      .from('event_checkins')
      .select('checked_in_at')
      .eq('attendee_id', id)
      .eq('event_id', eventId)
      .limit(1);
    const checkin = checkinRows && checkinRows[0] ? checkinRows[0] : null;

    // Room scans, with the session + room they belong to
    const { data: attendance } = await supabase
      .from('session_attendance')
      .select('scanned_at, sessions(id, title, start_time, end_time, rooms(name))')
      .eq('attendee_id', id);

    // Surveys: matched by attendee_id, plus any submitted by email without a link
    const { data: byId } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('event_id', eventId)
      .eq('attendee_id', id);
    const surveys = byId || [];
    if (attendee.email) {
      const { data: byEmail } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('event_id', eventId)
        .eq('email', attendee.email.toLowerCase().trim());
      (byEmail || []).forEach(s => {
        if (!surveys.find(x => x.session_id === s.session_id)) surveys.push(s);
      });
    }
    const surveyBySession = {};
    surveys.forEach(s => { surveyBySession[s.session_id] = s; });

    const sessions = (attendance || [])
      .filter(r => r.sessions)
      .map(r => ({
        session_id: r.sessions.id,
        title: r.sessions.title,
        room_name: r.sessions.rooms?.name || null,
        start_time: r.sessions.start_time,
        end_time: r.sessions.end_time,
        scanned_at: r.scanned_at,
        survey: surveyBySession[r.sessions.id] || null,
      }))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    res.json({
      attendee: { id: attendee.id, name: attendee.name, email: attendee.email, company: attendee.company, title: attendee.title },
      checkin,
      sessions,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});



// Upload profile photo (attendee uploads their own)
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/me/photo', authenticate, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const attendeeId = req.user.id;
    const ext = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
    const filename = `profile-photos/${attendeeId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('event-assets')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(filename);

    await supabase.from('attendees').update({ photo_url: urlData.publicUrl }).eq('id', attendeeId);

    res.json({ photo_url: urlData.publicUrl });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to upload photo' }); }
});

// Update own profile (attendee)
router.put('/me/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'attendee') return res.status(403).json({ error: 'Attendee access required' });
  const { name, company, title, pronouns, headline, about_me, city, visible_in_directory } = req.body;
  try {
    const update = {};
    if (name !== undefined) update.name = name;
    if (company !== undefined) update.company = company;
    if (title !== undefined) update.title = title;
    if (pronouns !== undefined) update.pronouns = pronouns;
    if (headline !== undefined) update.headline = headline;
    if (about_me !== undefined) update.about_me = about_me;
    if (city !== undefined) update.city = city;
    if (visible_in_directory !== undefined) update.visible_in_directory = visible_in_directory;
    // If name, title or company changed, mark as manually edited to protect from sync overwrite
    if (name !== undefined || company !== undefined || title !== undefined) {
      update.manually_edited = true;
    }
    const { data, error } = await supabase
      .from('attendees')
      .update(update)
      .eq('id', req.user.id)
      .select('id, name, title, company, photo_url, pronouns, headline, about_me, city, visible_in_directory')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update attendee (admin only) — sets manually_edited flag
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, email, company, title } = req.body;
  try {
    const { data, error } = await supabase
      .from('attendees')
      .update({ name, email, company, title, manually_edited: true })
      .eq('id', req.params.id)
      .select('id, name, email, company, title, manually_edited')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Delete walk-in attendee (admin only — walk-ins only)
router.delete('/walkin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Confirm it's a walk-in before deleting
    const { data: attendee } = await supabase
      .from('attendees')
      .select('id, qr_code')
      .eq('id', req.params.id)
      .single();
    if (!attendee) return res.status(404).json({ error: 'Attendee not found' });
    if (!attendee.qr_code?.startsWith('WALKIN-')) return res.status(403).json({ error: 'Only walk-in attendees can be deleted' });

    await supabase.from('attendees').delete().eq('id', req.params.id);
    res.json({ message: 'Walk-in attendee deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Clear manually_edited flag (allow sync to overwrite again)
router.post('/:id/reset-edit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendees')
      .update({ manually_edited: false })
      .eq('id', req.params.id)
      .select('id, name')
      .single();
    if (error) throw error;
    res.json({ message: 'Edit flag cleared', data });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
