const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticate, requireAdmin, requireMonitor } = require('../middleware/auth');

// Submit a survey response (public — works logged in or not)
router.post('/submit', async (req, res) => {
  const { event_id, session_id, attendee_id, name, email,
    q_topic_useful, q_presenter_rating, q_adoption_likelihood, q_overall_satisfaction,
    q_followup_yn, q_followup_text, q_similar_material_yn, q_similar_material_text,
    q_purchase_process } = req.body;

  if (!event_id || !session_id || !name || !email) {
    return res.status(400).json({ error: 'event_id, session_id, name and email are required' });
  }

  try {
    // Check session has started
    const { data: sessionData } = await supabase.from('sessions').select('start_time, title').eq('id', session_id).single();
    if (sessionData && new Date(sessionData.start_time) > new Date()) {
      return res.status(400).json({ error: 'This session has not started yet' });
    }

    // Check attendance — attendee must have been scanned in (if attendee_id provided)
    if (attendee_id) {
      const { data: attended } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('session_id', session_id)
        .eq('attendee_id', attendee_id)
        .single();
      if (!attended) return res.status(403).json({ error: 'You can only submit a survey for sessions you attended' });
    }

    // Check for duplicate by attendee_id OR email + session
    const dupQuery = supabase.from('survey_responses').select('id').eq('session_id', session_id);
    if (attendee_id) {
      const { data: byId } = await dupQuery.eq('attendee_id', attendee_id).single();
      if (byId) return res.status(409).json({ error: 'You have already submitted a survey for this session' });
    }
    const { data: byEmail } = await supabase.from('survey_responses').select('id').eq('session_id', session_id).eq('email', email.toLowerCase().trim()).single();
    if (byEmail) return res.status(409).json({ error: 'A survey has already been submitted with this email for this session' });

    const { error } = await supabase.from('survey_responses').insert({
      event_id, session_id, attendee_id: attendee_id || null,
      name, email: email.toLowerCase().trim(),
      q_topic_useful, q_presenter_rating, q_adoption_likelihood, q_overall_satisfaction,
      q_followup_yn, q_followup_text: q_followup_yn ? q_followup_text : null,
      q_similar_material_yn, q_similar_material_text: q_similar_material_yn ? q_similar_material_text : null,
      q_purchase_process
    });
    if (error) throw error;
    res.status(201).json({ message: 'Survey submitted — thank you!' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You have already submitted a survey for this session' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// Get all responses for an event (admin)
router.get('/results/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*, sessions(title, start_time)')
      .eq('event_id', req.params.event_id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get survey count for a session (monitor)
router.get('/count/:event_id', authenticate, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  try {
    const { count, error } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', req.params.event_id)
      .eq('session_id', session_id);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Draw a random winner from survey respondents (monitor or admin)
router.get('/draw/:event_id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'monitor') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Please select a session before drawing a winner' });
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('name, email')
      .eq('event_id', req.params.event_id)
      .eq('session_id', session_id);
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'No survey responses for this session yet' });
    const winner = data[Math.floor(Math.random() * data.length)];
    res.json({ winner_name: winner.name, winner_email: winner.email, total_entries: data.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Export CSV
router.get('/results/:event_id/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*, sessions(title)')
      .eq('event_id', req.params.event_id)
      .order('submitted_at', { ascending: true });
    if (error) throw error;

    const rows = [
      ['Session', 'Name', 'Email', 'Topic Useful', 'Presenter', 'Adoption Likelihood', 'Overall', 'Follow Up?', 'Follow Up Topic', 'Similar Material?', 'Similar Material Detail', 'Purchase Process', 'Submitted'],
      ...(data || []).map(r => [
        r.sessions?.title || '',
        r.name, r.email,
        r.q_topic_useful, r.q_presenter_rating, r.q_adoption_likelihood, r.q_overall_satisfaction,
        r.q_followup_yn ? 'Yes' : 'No', r.q_followup_text || '',
        r.q_similar_material_yn ? 'Yes' : 'No', r.q_similar_material_text || '',
        r.q_purchase_process || '',
        new Date(r.submitted_at).toLocaleString()
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="survey-results.csv"');
    res.send(csv);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Clear all survey responses for an event (testing only)
router.delete('/clear/:event_id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('survey_responses')
      .delete()
      .eq('event_id', req.params.event_id);
    if (error) throw error;
    res.json({ message: 'All survey responses cleared' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
