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
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
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
