const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticate, requireVendor } = require('../middleware/auth');
const supabase = require('../db/supabase');

// Public vendor list for attendees
router.get('/list', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, company_name, email')
      .order('company_name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Scan QR code
router.get('/scan/:qr_code', authenticate, requireVendor, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select('id, name, email, company, title, event_id')
      .eq('qr_code', req.params.qr_code)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Attendee not found' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save a lead
router.post('/leads', authenticate, requireVendor, async (req, res) => {
  const { attendee_id, event_id, note } = req.body;
  if (!attendee_id || !event_id) return res.status(400).json({ error: 'attendee_id and event_id required' });
  try {
    const { data, error } = await supabase
      .from('vendor_leads')
      .upsert({ vendor_id: req.user.id, attendee_id, event_id, note: note || null, captured_at: new Date().toISOString() }, { onConflict: 'vendor_id,attendee_id,event_id' })
      .select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Lead saved', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leads
router.get('/leads', authenticate, requireVendor, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_leads')
      .select('id, note, captured_at, event_id, attendees(name, email, company, title), events(name)')
      .eq('vendor_id', req.user.id)
      .order('captured_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Email leads to vendor
router.post('/leads/export', authenticate, requireVendor, async (req, res) => {
  try {
    const { data: vendor } = await supabase.from('vendors').select('email, company_name').eq('id', req.user.id).single();
    if (!vendor?.email) return res.status(400).json({ error: 'No email address on file' });

    const { data, error } = await supabase
      .from('vendor_leads')
      .select('captured_at, note, event_id, attendees(name, email, company, title), events(name)')
      .eq('vendor_id', req.user.id)
      .order('captured_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'No leads to export yet' });

    const rows = [
      ['Name','Email','Company','Title','Event','Note','Captured At'],
      ...data.map(l => [l.attendees?.name||'',l.attendees?.email||'',l.attendees?.company||'',l.attendees?.title||'',l.events?.name||'',l.note||'',new Date(l.captured_at).toLocaleString()])
    ];
    const csv = rows.map(r => r.map(c => ('"' + String(c).replace(/"/g, '""') + '"')).join(',')).join('\n');

    const tableRows = data.map(l => '<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (l.attendees?.name||'') + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (l.attendees?.email||'') + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (l.attendees?.company||'') + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (l.attendees?.title||'') + '</td><td style="padding:6px 10px;border-bottom:1px solid #eee">' + (l.note||'') + '</td></tr>').join('');

    await axios.post('https://api.smtp2go.com/v3/email/send', {
      api_key: process.env.SMTP2GO_API_KEY,
      to: [vendor.email],
      sender: (process.env.RESET_FROM_NAME || 'London Technology Showcase') + ' <' + (process.env.RESET_FROM_EMAIL || 'no-reply@attachegroup.com') + '>',
      subject: 'Your leads from the London Technology Showcase',
      html_body: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem"><h2 style="color:#262D33">Your Leads</h2><p style="color:#6b7280">Hi ' + vendor.company_name + ', here are your ' + data.length + ' captured lead' + (data.length !== 1 ? 's' : '') + ' from the event. A CSV is attached.</p><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#262D33;color:#fff"><th style="padding:8px 10px;text-align:left">Name</th><th style="padding:8px 10px;text-align:left">Email</th><th style="padding:8px 10px;text-align:left">Company</th><th style="padding:8px 10px;text-align:left">Title</th><th style="padding:8px 10px;text-align:left">Note</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>',
      attachments: [{ filename: 'leads.csv', fileblob: Buffer.from(csv).toString('base64'), mimetype: 'text/csv' }]
    });

    res.json({ message: 'Leads sent to ' + vendor.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
