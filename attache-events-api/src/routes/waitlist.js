const express = require('express');
const { promoteOrOffer } = require('../services/waitlistService');
const router = express.Router();
const supabase = require('../db/supabase');
const crypto = require('crypto');

const APP_URL = process.env.APP_URL || 'https://attache-events.pages.dev';
const API_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
  : 'https://events-api-production-ca81.up.railway.app';

// Accept offer — switch to new session
router.get('/accept/:token', async (req, res) => {
  try {
    const { data: record } = await supabase
      .from('waitlist_tokens')
      .select('*')
      .eq('token', req.params.token)
      .single();

    if (!record) return res.send(page('❌ Invalid Link', 'This link is invalid or has already been used.'));
    if (record.used) return res.send(page('⚠️ Already Used', 'This link has already been used.'));
    if (new Date(record.expires_at) < new Date()) return res.send(page('⏰ Expired', 'This offer has expired — the spot may have gone to the next person on the waitlist.'));

    // Cancel conflicting session
    await supabase.from('session_registrations').update({ status: 'cancelled' }).eq('id', record.conflicting_registration_id);
    // Promote to new session
    await supabase.from('session_registrations').update({ status: 'registered' }).eq('id', record.session_registration_id);
    // Mark token used
    await supabase.from('waitlist_tokens').update({ used: true, action: 'accepted' }).eq('id', record.id);

    // Get session details for confirmation
    const { data: session } = await supabase.from('sessions').select('title, start_time, end_time, rooms(name)').eq('id', record.session_id).single();
    const startTime = new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    res.send(page('✅ You\'re In!', `You are now registered for <strong>${session.title}</strong> (${startTime} – ${endTime}, ${session.rooms?.name}). Your previous session has been cancelled. See you there!`));
  } catch (err) { console.error(err); res.send(page('❌ Error', 'Something went wrong. Please contact the event organizer.')); }
});

// Decline offer — keep current session
router.get('/decline/:token', async (req, res) => {
  try {
    const { data: record } = await supabase
      .from('waitlist_tokens')
      .select('*')
      .eq('token', req.params.token)
      .single();

    if (!record) return res.send(page('❌ Invalid Link', 'This link is invalid or has already been used.'));
    if (record.used) return res.send(page('⚠️ Already Used', 'This link has already been used.'));
    if (new Date(record.expires_at) < new Date()) return res.send(page('⏰ Expired', 'This offer has already expired.'));

    // Mark token used and waitlist registration as declined
    await supabase.from('waitlist_tokens').update({ used: true, action: 'declined' }).eq('id', record.id);
    await supabase.from('session_registrations').update({ status: 'declined' }).eq('id', record.session_registration_id);

    // Try next person on waitlist
    const { data: nextWaitlisted } = await supabase
      .from('session_registrations')
      .select('id, attendee_id')
      .eq('session_id', record.session_id)
      .eq('status', 'waitlisted')
      .order('registered_at', { ascending: true })
      .limit(1).single();

    if (nextWaitlisted) {
      // Trigger promotion for next person (reuse existing logic via direct call)
      await promoteOrOffer(record.session_id, nextWaitlisted);
    }

    res.send(page('👍 Got It', 'No problem — you\'ll keep your current session. Your spot on the waitlist has been passed to the next person.'));
  } catch (err) { console.error(err); res.send(page('❌ Error', 'Something went wrong. Please contact the event organizer.')); }
});

// Helper to render simple HTML response pages
function page(title, message) {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
  .card{background:#fff;border-radius:12px;padding:2rem;max-width:400px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.1)}
  h1{color:#262D33;font-size:24px}p{color:#6b7280;line-height:1.6}
  a{display:inline-block;margin-top:1rem;padding:10px 24px;background:#9D2235;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style>
  </head><body><div class="card"><h1>${title}</h1><p>${message}</p>
  <a href="${APP_URL}/techshow">Back to App</a></div></body></html>`;
}

module.exports = { router };
