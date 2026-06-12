const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

async function adminLogin(req, res) {
  const { email, password, event_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!event_id) return res.status(400).json({ error: 'Please select an event' });
  try {
    const { data: admin, error } = await supabase.from('admin_users').select('*').eq('email', email.toLowerCase()).single();
    if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: admin.id, role: 'admin', name: admin.name, event_id });
    res.json({ token, name: admin.name, role: 'admin', event_id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function attendeeLogin(req, res) {
  const { email, password, event_id } = req.body;
  if (!email || !password || !event_id) return res.status(400).json({ error: 'Email, password, and event_id required' });
  try {
    const { data: attendee, error } = await supabase.from('attendees').select('id, name, email, event_id, qr_code, photo_url, password_hash, pronouns, headline, about_me, city, visible_in_directory, title, company').eq('email', email.toLowerCase()).eq('event_id', event_id).single();
    if (error || !attendee) return res.status(401).json({ error: 'Invalid credentials' });
    if (!attendee.password_hash) return res.status(403).json({ error: 'Password not set — please set your password first' });
    const valid = await bcrypt.compare(password, attendee.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const { data: eventData } = await supabase.from('events').select('header_color').eq('id', attendee.event_id).single();
    const headerColor = eventData?.header_color || '#9D2235';
    const token = signToken({ id: attendee.id, role: 'attendee', event_id: attendee.event_id, name: attendee.name, header_color: headerColor });
    res.json({ token, name: attendee.name, email: attendee.email, role: 'attendee', qr_code: attendee.qr_code, event_id: attendee.event_id, header_color: headerColor, photo_url: attendee.photo_url || null, pronouns: attendee.pronouns || null, headline: attendee.headline || null, about_me: attendee.about_me || null, city: attendee.city || null, visible_in_directory: attendee.visible_in_directory || false, title: attendee.title || null, company: attendee.company || null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function attendeeSetPassword(req, res) {
  const { email, event_id, password } = req.body;
  if (!email || !event_id || !password) return res.status(400).json({ error: 'Email, event_id, and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const { data: attendee, error } = await supabase.from('attendees').select('id, password_hash').eq('email', email.toLowerCase()).eq('event_id', event_id).single();
    if (error || !attendee) return res.status(404).json({ error: 'Attendee not found' });
    const hash = await bcrypt.hash(password, 12);
    await supabase.from('attendees').update({ password_hash: hash }).eq('id', attendee.id);
    res.json({ message: 'Password set successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function monitorLogin(req, res) {
  const { event_id, pin } = req.body;
  if (!event_id || !pin) return res.status(400).json({ error: 'event_id and pin required' });
  try {
    const { data: monitors, error } = await supabase.from('monitors').select('*').eq('event_id', event_id);
    if (error || !monitors?.length) return res.status(401).json({ error: 'Invalid PIN' });
    let matched = null;
    for (const monitor of monitors) {
      const valid = await bcrypt.compare(String(pin), monitor.pin_hash);
      if (valid) { matched = monitor; break; }
    }
    if (!matched) return res.status(401).json({ error: 'Invalid PIN' });
    const token = signToken({ id: matched.id, role: 'monitor', event_id: matched.event_id, name: matched.name });
    res.json({ token, name: matched.name, role: 'monitor', event_id: matched.event_id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function vendorLogin(req, res) {
  const { email, password, event_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    let query = supabase.from('vendors').select('*').eq('email', email.toLowerCase());
    if (event_id) query = query.eq('event_id', event_id);
    const { data: vendors, error } = await query;
    if (error || !vendors?.length) return res.status(401).json({ error: 'Invalid credentials' });
    // If multiple vendors with same email (different events), pick the right one
    let vendor = vendors[0];
    let valid = false;
    for (const v of vendors) {
      if (await bcrypt.compare(password, v.password_hash)) { vendor = v; valid = true; break; }
    }
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: vendor.id, role: 'vendor', company: vendor.company_name, event_id: vendor.event_id });
    res.json({ token, company: vendor.company_name, role: 'vendor', event_id: vendor.event_id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function vendorRegister(req, res) {
  const { email, password, company_name, access_code, event_id } = req.body;
  if (!email || !password || !company_name || !access_code || !event_id) 
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    // Validate access code against event
    const { data: event } = await supabase.from('events').select('vendor_access_code, name').eq('id', event_id).single();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.vendor_access_code || access_code !== event.vendor_access_code) 
      return res.status(401).json({ error: 'Invalid access code' });

    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase.from('vendors').insert({ 
      email: email.toLowerCase(), password_hash: hash, company_name, event_id 
    }).select('id, company_name').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      throw error;
    }
    res.status(201).json({ message: 'Vendor registered successfully', id: data.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function verifyToken(req, res) {
  res.json({ valid: true, user: req.user });
}

module.exports = { adminLogin, attendeeLogin, attendeeSetPassword, monitorLogin, vendorLogin, vendorRegister, verifyToken };
