require('dotenv').config();
const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://attache-events-app.pages.dev',
  credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for public read-only endpoints needed at login
    if (req.method === 'GET' && req.path.startsWith('/api/events')) return true;
    if (req.method === 'GET' && req.path.startsWith('/api/sessions/event/')) return true;
    return false;
  }
});
app.use(limiter);

app.use('/api/auth',      require('./src/routes/auth'));
app.use('/api/events',    require('./src/routes/events'));
app.use('/api/rooms',     require('./src/routes/rooms'));
app.use('/api/sessions',  require('./src/routes/sessions'));
app.use('/api/attendees', require('./src/routes/attendees'));
app.use('/api/checkin',   require('./src/routes/checkin'));
app.use('/api/monitor',   require('./src/routes/monitor'));
app.use('/api/vendor',    require('./src/routes/vendor'));
app.use('/api/sync',      require('./src/routes/sync'));
app.use('/api/survey',    require('./src/routes/survey'));
app.use('/api/messages',  require('./src/routes/messages'));
app.use('/api/speakers',  require('./src/routes/speakers'));
app.use('/api/exhibitors', require('./src/routes/exhibitors'));
app.use('/api/waitlist', require('./src/routes/waitlist').router);
app.use('/api/partners',  require('./src/routes/partners'));
app.use('/api/password',  require('./src/routes/passwordReset'));
app.use('/api/reports',   require('./src/routes/reports'));
app.use('/api/badges',    require('./src/routes/badges'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Attache Events API v6 running on port ${PORT}`);
});

// Send scheduled broadcast messages every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date().toISOString();
    const { data: due } = await supabase
      .from('broadcast_messages')
      .select('id')
      .is('sent_at', null)
      .lte('scheduled_at', now);
    if (due?.length) {
      for (const msg of due) {
        await supabase.from('broadcast_messages').update({ sent_at: now }).eq('id', msg.id);
      }
      console.log(`[messages] Sent ${due.length} scheduled message(s)`);
    }
  } catch (err) { console.error('[messages] Cron error:', err.message); }
});

// Auto-sync Eventbrite once daily at 2:00 AM for all events
const supabase = require('./src/db/supabase');
const { syncEventbrite } = require('./src/services/syncService');

// Check for expired waitlist tokens every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    const now = new Date().toISOString();
    // Find expired unused tokens
    const { data: expired } = await supabase
      .from('waitlist_tokens')
      .select('id, session_id, session_registration_id')
      .eq('used', false)
      .lt('expires_at', now);

    if (!expired?.length) return;
    console.log(`[waitlist-cron] Processing ${expired.length} expired token(s)`);

    for (const token of expired) {
      // Mark token as expired
      await supabase.from('waitlist_tokens').update({ used: true, action: 'expired' }).eq('id', token.id);
      // Mark their waitlist registration as expired too
      await supabase.from('session_registrations').update({ status: 'expired' }).eq('id', token.session_registration_id);

      // Try next person on waitlist
      const { data: next } = await supabase
        .from('session_registrations')
        .select('id, attendee_id')
        .eq('session_id', token.session_id)
        .eq('status', 'waitlisted')
        .order('registered_at', { ascending: true })
        .limit(1).single();

      if (next) {
        const { promoteOrOffer } = require('./src/services/waitlistService');
        await promoteOrOffer(token.session_id, next).catch(console.error);
        console.log(`[waitlist-cron] Offered spot to next in line for session ${token.session_id}`);
      }
    }
  } catch (err) { console.error('[waitlist-cron] Error:', err.message); }
});

cron.schedule('0 2 * * *', async () => {
  console.log('[cron] Running daily Eventbrite sync...');
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, name');

    if (error) { console.error('[cron] Failed to fetch events:', error.message); return; }
    if (!events?.length) { console.log('[cron] No events to sync'); return; }

    for (const event of events) {
      try {
        const result = await syncEventbrite(event.id);
        console.log(`[cron] Synced "${event.name}": ${result.created} new, ${result.updated} updated`);
      } catch (err) {
        console.error(`[cron] Failed to sync "${event.name}":`, err.message);
      }
    }
  } catch (err) {
    console.error('[cron] Scheduler error:', err.message);
  }
});
