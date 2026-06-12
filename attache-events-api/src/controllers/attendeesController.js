const supabase = require('../db/supabase');

async function getAttendeesByEvent(req, res) {
  try {
    const { data, error } = await supabase.from('attendees').select('id, name, email, company, title, qr_code, imported_at').eq('event_id', req.params.event_id).order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function getAttendee(req, res) {
  try {
    const { data, error } = await supabase.from('attendees').select('id, name, email, company, title, qr_code, imported_at, event_id').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Attendee not found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function getAttendeeByQR(req, res) {
  try {
    const { data, error } = await supabase.from('attendees').select('id, name, email, company, title, event_id, qr_code').eq('qr_code', req.params.qr_code).single();
    if (error || !data) return res.status(404).json({ error: 'Attendee not found' });
    const { data: checkin } = await supabase.from('event_checkins').select('checked_in_at').eq('attendee_id', data.id).eq('event_id', data.event_id).single();
    res.json({ ...data, checked_in_at: checkin?.checked_in_at || null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function searchAttendees(req, res) {
  const { event_id, q } = req.query;
  if (!event_id || !q) return res.status(400).json({ error: 'event_id and q are required' });
  if (q.trim().length < 2) return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  try {
    const search = q.trim().toLowerCase();
    const { data, error } = await supabase.from('attendees').select('id, name, email, company, qr_code, event_id').eq('event_id', event_id).or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`).order('name', { ascending: true }).limit(10);
    if (error) throw error;
    const ids = data.map(a => a.id);
    const { data: checkins } = await supabase.from('event_checkins').select('attendee_id, checked_in_at').eq('event_id', event_id).in('attendee_id', ids);
    const checkinMap = {};
    (checkins || []).forEach(c => { checkinMap[c.attendee_id] = c.checked_in_at; });
    res.json(data.map(a => ({ ...a, checked_in_at: checkinMap[a.id] || null })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function getMyProfile(req, res) {
  if (req.user.role !== 'attendee') return res.status(403).json({ error: 'Attendee access required' });
  try {
    const { data, error } = await supabase.from('attendees').select('id, name, email, company, title, qr_code, event_id').eq('id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Profile not found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

module.exports = { getAttendeesByEvent, getAttendee, getAttendeeByQR, searchAttendees, getMyProfile };
