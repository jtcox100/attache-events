const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');

async function syncEventbrite(event_id) {
  const { data: creds, error: credErr } = await supabase.from('eventbrite_credentials').select('*').eq('event_id', event_id).single();
  if (credErr || !creds) throw new Error('No Eventbrite credentials found for this event');
  if (!creds.eventbrite_event_id) throw new Error('No Eventbrite event ID found in credentials');

  const attendees = await fetchAllAttendees(creds.access_token, creds.eventbrite_event_id);
  let created = 0, updated = 0;

  for (const eb of attendees) {
    const profile = eb.profile || {};
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const email = profile.email?.toLowerCase();
    const eventbrite_id = String(eb.id);
    if (!email) continue;

    let company = profile.company || null;
    let title = profile.job_title || null;
    const answers = eb.answers || [];
    for (const answer of answers) {
      const question = (answer.question || '').toLowerCase().trim();
      const value = answer.answer || null;
      if (question.includes('organization') || question.includes('company')) { if (value) company = value; }
      if (question.includes('job title') || question.includes('title')) { if (value) title = value; }
    }

    let qr_code = null;
    const barcodes = eb.barcodes || [];
    if (barcodes.length > 0 && barcodes[0].barcode) qr_code = barcodes[0].barcode;
    const eventbrite_registered_at = eb.created ? new Date(eb.created).toISOString() : null;

    const { data: existing } = await supabase.from('attendees').select('id, qr_code, manually_edited').eq('event_id', event_id).eq('eventbrite_id', eventbrite_id).single();

    if (existing) {
      if (existing.manually_edited) {
        // Skip overwriting manually edited attendees — only update QR code and registration date
        const safeUpdate = {};
        if (qr_code && existing.qr_code !== qr_code) safeUpdate.qr_code = qr_code;
        if (eventbrite_registered_at) safeUpdate.eventbrite_registered_at = eventbrite_registered_at;
        if (Object.keys(safeUpdate).length > 0) {
          await supabase.from('attendees').update(safeUpdate).eq('id', existing.id);
        }
      } else {
        const updateData = { name, email, company, title };
        if (qr_code && existing.qr_code !== qr_code) updateData.qr_code = qr_code;
        if (eventbrite_registered_at) updateData.eventbrite_registered_at = eventbrite_registered_at;
        await supabase.from('attendees').update(updateData).eq('id', existing.id);
      }
      updated++;
    } else {
      await supabase.from('attendees').insert({ event_id, name, email, company, title, qr_code: qr_code || uuidv4(), eventbrite_id, eventbrite_registered_at });
      created++;
    }
  }

  await supabase.from('eventbrite_credentials').update({ last_synced_at: new Date().toISOString() }).eq('event_id', event_id);
  return { message: 'Sync complete', created, updated, total: attendees.length, synced_at: new Date().toISOString() };
}

async function fetchAllAttendees(access_token, eventbrite_event_id) {
  const allAttendees = [];
  let page = 1, hasMore = true;
  while (hasMore) {
    const response = await axios.get(`https://www.eventbriteapi.com/v3/events/${eventbrite_event_id}/attendees/`, {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { page, status: 'attending', expand: 'answers,barcodes' }
    });
    const { attendees, pagination } = response.data;
    allAttendees.push(...(attendees || []));
    hasMore = pagination?.has_more_items || false;
    page++;
  }
  return allAttendees;
}

module.exports = { syncEventbrite };
