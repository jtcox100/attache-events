import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function StarRating({ value, onChange, label }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#262D33', margin: '0 0 0.5rem', lineHeight: 1.4 }}>{label}</p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange(n)} type="button"
            style={{ width: 44, height: 44, borderRadius: 8, border: `2px solid ${value === n ? '#9D2235' : '#D5D5D4'}`,
              backgroundColor: value === n ? '#9D2235' : '#fff', color: value === n ? '#fff' : '#262D33',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s' }}>
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>Poor / Low</span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>Excellent / High</span>
      </div>
    </div>
  );
}

export default function SurveyForm() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const sessionId = params.get('session');
  const eventId = params.get('event');
  const [session, setSession] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Read directly from localStorage in case auth context hasn't hydrated yet
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const prefillName = user?.name || storedUser?.name || '';
  const prefillEmail = storedUser?.email || '';

  const [form, setForm] = useState({
    name: prefillName,
    email: prefillEmail,
    q_topic_useful: 0,
    q_presenter_rating: 0,
    q_adoption_likelihood: 0,
    q_overall_satisfaction: 0,
    q_followup_yn: null,
    q_followup_text: '',
    q_similar_material_yn: null,
    q_similar_material_text: '',
    q_purchase_process: ''
  });

  useEffect(() => {
    if (sessionId) {
      api.get(`/api/sessions/${sessionId}`)
        .then(r => setSession(r.data))
        .catch(console.error);
    }
  }, [sessionId]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return; }
    if (!form.q_topic_useful || !form.q_presenter_rating || !form.q_adoption_likelihood || !form.q_overall_satisfaction) {
      setError('Please complete all ratings'); return;
    }
    if (form.q_followup_yn === null || form.q_similar_material_yn === null) {
      setError('Please answer all yes/no questions'); return;
    }
    setError(''); setSubmitting(true);
    try {
      await api.post('/api/survey/submit', {
        event_id: eventId, session_id: sessionId,
        attendee_id: user?.id || null, ...form
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally { setSubmitting(false); }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
  const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: 72 };

  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center', border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#262D33', margin: '0 0 0.5rem' }}>Thank you!</h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 1rem' }}>Your survey has been submitted. You've been entered into the draw for the $50 prize!</p>
        <div style={{ backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '0.75rem', fontSize: 13, color: '#9D2235' }}>
          The winner will be announced by the room monitor at the end of the session.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f8f8' }}>
      <div style={{ backgroundColor: '#9D2235', padding: '1rem 1.25rem' }}>
        <img src="/attache-logo.png" alt="Attache" style={{ height: 36, display: 'block', marginBottom: '0.5rem' }} />
        <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Session Survey</h1>
        {session && <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '2px 0 0' }}>{session.title}</p>}
      </div>
      <form onSubmit={handleSubmit} style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 13, color: '#374151', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Thank you for attending! Each completed survey is entered into a draw for a <strong>$50 prize</strong> announced at the end of the session.
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Your name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="First and last name" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="your@email.com" />
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 1rem' }}>Ratings (1 = Poor, 5 = Excellent)</p>
          <StarRating value={form.q_topic_useful} onChange={v => set('q_topic_useful', v)} label="Was the topic covered of use to you?" />
          <StarRating value={form.q_presenter_rating} onChange={v => set('q_presenter_rating', v)} label="Please rate the presenter" />
          <StarRating value={form.q_adoption_likelihood} onChange={v => set('q_adoption_likelihood', v)} label="Rate the likelihood of your organization adopting this or similar technology in the next 12 months?" />
          <StarRating value={form.q_overall_satisfaction} onChange={v => set('q_overall_satisfaction', v)} label="Overall satisfaction with the session" />
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#262D33', margin: '0 0 0.5rem', lineHeight: 1.4 }}>Was there anything in the presentation you would like us to follow up on?</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={() => set('q_followup_yn', v)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${form.q_followup_yn === v ? '#9D2235' : '#D5D5D4'}`,
                    backgroundColor: form.q_followup_yn === v ? '#9D2235' : '#fff', color: form.q_followup_yn === v ? '#fff' : '#262D33',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
            {form.q_followup_yn && <textarea value={form.q_followup_text} onChange={e => set('q_followup_text', e.target.value)} style={textareaStyle} placeholder="What topic?" />}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#262D33', margin: '0 0 0.5rem', lineHeight: 1.4 }}>Would you be interested in material on a similar topic from this or another vendor?</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={() => set('q_similar_material_yn', v)}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${form.q_similar_material_yn === v ? '#9D2235' : '#D5D5D4'}`,
                    backgroundColor: form.q_similar_material_yn === v ? '#9D2235' : '#fff', color: form.q_similar_material_yn === v ? '#fff' : '#262D33',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
            {form.q_similar_material_yn && <textarea value={form.q_similar_material_text} onChange={e => set('q_similar_material_text', e.target.value)} style={textareaStyle} placeholder="What topic or vendor?" />}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#262D33', marginBottom: '0.5rem', lineHeight: 1.4 }}>
            If you are interested in this technology / offering and foresee a purchase decision in the months ahead, how can one of the host companies participate in that process?
          </label>
          <textarea value={form.q_purchase_process} onChange={e => set('q_purchase_process', e.target.value)} style={{ ...textareaStyle, minHeight: 96 }} placeholder="Optional" />
        </div>

        {error && <p style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '0.75rem', fontSize: 13, marginBottom: '1rem' }}>{error}</p>}

        <button type="submit" disabled={submitting}
          style={{ width: '100%', padding: '0.9rem', borderRadius: 10, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1, marginBottom: '2rem' }}>
          {submitting ? 'Submitting...' : 'Submit Survey & Enter Draw'}
        </button>
      </form>
    </div>
  );
}
