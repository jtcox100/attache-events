const supabase = require('../db/supabase');

async function getAllEvents(req, res) {
  try {
    const { data, error } = await supabase.from('events').select('id, name, event_date, venues(name)').order('event_date', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function getEvent(req, res) {
  try {
    const { data, error } = await supabase.from('events').select('*, venues(*)').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Event not found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function createEvent(req, res) {
  const { name, event_date, venue_id } = req.body;
  if (!name || !event_date || !venue_id) return res.status(400).json({ error: 'name, event_date, and venue_id required' });
  try {
    const { data, error } = await supabase.from('events').insert({ name, event_date, venue_id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function updateEvent(req, res) {
  const { name, event_date, venue_id, wifi_network, wifi_password, badge_logo_url, badge_logo_width, badge_logo_height, floor_plan_url } = req.body;
  try {
    const update = {};
    if (name !== undefined) update.name = name;
    if (event_date !== undefined) update.event_date = event_date;
    if (venue_id !== undefined) update.venue_id = venue_id;
    if (wifi_network !== undefined) update.wifi_network = wifi_network;
    if (wifi_password !== undefined) update.wifi_password = wifi_password;
    if (badge_logo_url !== undefined) update.badge_logo_url = badge_logo_url;
    if (badge_logo_width !== undefined) update.badge_logo_width = badge_logo_width;
    if (badge_logo_height !== undefined) update.badge_logo_height = badge_logo_height;
    if (floor_plan_url !== undefined) update.floor_plan_url = floor_plan_url;
    const { data, error } = await supabase.from('events').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

module.exports = { getAllEvents, getEvent, createEvent, updateEvent };
