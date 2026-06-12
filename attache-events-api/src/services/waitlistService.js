const supabase = require('../db/supabase');
const crypto = require('crypto');
const axios = require('axios');

const APP_URL = process.env.APP_URL || 'https://attache-events.pages.dev';
const API_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'https://events-api-production-ca81.up.railway.app';

async function promoteOrOffer(session_id, candidate) {
  const { data: thisSession } = await supabase.from('sessions')
    .select('title, start_time, end_time, event_id, rooms(name)')
    .eq('id', session_id).single();
  const { data: attendee } = await supabase.from('attendees')
    .select('name, email').eq('id', candidate.attendee_id).single();

  // Check for conflict
  const { data: conflicts } = await supabase
    .from('session_registrations')
    .select('id, session_id, sessions(start_time, end_time, title)')
    .eq('attendee_id', candidate.attendee_id)
    .eq('status', 'registered');

  const conflicting = (conflicts || []).find(reg => {
    const s = reg.sessions;
    if (!s) return false;
    return new Date(thisSession.start_time) < new Date(s.end_time) &&
           new Date(thisSession.end_time) > new Date(s.start_time);
  });

  const startTime = new Date(thisSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(thisSession.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const roomName = thisSession.rooms?.name || '';

  if (!conflicting) {
    // No conflict — promote directly
    await supabase.from('session_registrations').update({ status: 'registered' }).eq('id', candidate.id);
    console.log(`[waitlist] Promoted ${attendee?.email} to ${thisSession.title}`);

    if (attendee?.email) {
      await axios.post('https://api.smtp2go.com/v3/email/send', {
        api_key: process.env.SMTP2GO_API_KEY,
        to: [attendee.email],
        sender: `${process.env.RESET_FROM_NAME || 'London Technology Showcase'} <${process.env.RESET_FROM_EMAIL || 'no-reply@attachegroup.com'}>`,
        subject: `You're in! A spot opened up in "${thisSession.title}"`,
        html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="color:#262D33">Good news, ${attendee.name}!</h2>
          <p style="color:#374151">A spot has opened up and you've been moved from the waitlist to <strong>registered</strong>.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:1rem;margin:1rem 0">
            <p style="font-weight:700;color:#262D33;margin:0 0 4px">${thisSession.title}</p>
            <p style="color:#6b7280;font-size:14px;margin:0">${startTime} – ${endTime} · ${roomName}</p>
          </div>
          <p style="color:#9ca3af;font-size:12px">London Technology Showcase · Attache Group Inc.</p>
        </div>`
      }).catch(err => console.error('[waitlist] Email failed:', err.message));

      // In-app notification
      const scheduled_at = new Date().toISOString();
      await supabase.from('broadcast_messages').insert({
        event_id: thisSession.event_id,
        attendee_id: candidate.attendee_id,
        message: `🎉 Good news! A spot opened up — you're now registered for "${thisSession.title}" (${startTime} – ${endTime}, ${roomName})`,
        scheduled_at,
        sent_at: scheduled_at
      }).catch(console.error);
    }
  } else {
    // Has conflict — send 10-minute choice email
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from('waitlist_tokens').insert({
      token,
      attendee_id: candidate.attendee_id,
      session_registration_id: candidate.id,
      conflicting_registration_id: conflicting.id,
      session_id,
      expires_at
    });

    const acceptUrl = `${API_URL}/api/waitlist/accept/${token}`;
    const declineUrl = `${API_URL}/api/waitlist/decline/${token}`;

    console.log(`[waitlist] Conflict detected for ${attendee?.email}, sending choice email`);

    if (attendee?.email) {
      await axios.post('https://api.smtp2go.com/v3/email/send', {
        api_key: process.env.SMTP2GO_API_KEY,
        to: [attendee.email],
        sender: `${process.env.RESET_FROM_NAME || 'London Technology Showcase'} <${process.env.RESET_FROM_EMAIL || 'no-reply@attachegroup.com'}>`,
        subject: `⚡ 10-minute offer: Spot opened in "${thisSession.title}"`,
        html_body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="color:#262D33">Hi ${attendee.name} — a spot just opened up!</h2>
          <p style="color:#374151">A seat is available in <strong>${thisSession.title}</strong> (${startTime} – ${endTime}, ${roomName}), but you're currently registered for <strong>${conflicting.sessions?.title}</strong> at the same time.</p>
          <p style="color:#9D2235;font-weight:600">⏰ You have 10 minutes to decide — after that this offer expires.</p>
          <div style="margin:1.5rem 0">
            <a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#0D7B72;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px">✅ Switch to ${thisSession.title}</a>
            <a href="${declineUrl}" style="display:inline-block;padding:12px 24px;background:#6b7280;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">❌ Keep Current Session</a>
          </div>
          <p style="color:#6b7280;font-size:13px">If you switch, your current session registration will be cancelled automatically.</p>
          <p style="color:#9ca3af;font-size:12px">London Technology Showcase · Attache Group Inc.</p>
        </div>`
      }).catch(err => console.error('[waitlist] Choice email failed:', err.message));
    }
  }
}

module.exports = { promoteOrOffer };
