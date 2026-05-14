const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');

const FROM_EMAIL = process.env.RESET_FROM_EMAIL || 'noreply@attachegroup.com';
const FROM_NAME = process.env.RESET_FROM_NAME || 'London Technology Showcase';
const APP_URL = process.env.APP_URL || 'https://attache-events.pages.dev';

async function sendEmail(to, subject, html) {
  const response = await axios.post('https://api.smtp2go.com/v3/email/send', {
    api_key: process.env.SMTP2GO_API_KEY,
    to: [to],
    sender: `${FROM_NAME} <${FROM_EMAIL}>`,
    subject,
    html_body: html
  });
  return response.data;
}

// Request password reset
router.post('/request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { data: attendee } = await supabase
      .from('attendees')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always return success to prevent email enumeration
    if (!attendee) return res.json({ message: 'If that email is registered, you will receive a reset link shortly' });

    // Invalidate any existing tokens
    await supabase.from('password_reset_tokens').update({ used: true }).eq('attendee_id', attendee.id).eq('used', false);

    // Create new token valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from('password_reset_tokens').insert({ attendee_id: attendee.id, token, expires_at });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    console.log(`[password-reset] Sending to ${attendee.email} via SMTP2GO`);
    console.log(`[password-reset] SMTP2GO_API_KEY set: ${!!process.env.SMTP2GO_API_KEY}`);
    console.log(`[password-reset] Reset URL: ${resetUrl}`);

    const result = await sendEmail(
      attendee.email,
      'Reset your event app password',
      `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="color: #262D33; margin: 0 0 1rem;">Password Reset Request</h2>
          <p style="color: #374151; margin: 0 0 1rem;">Hi ${attendee.name},</p>
          <p style="color: #374151; margin: 0 0 1.5rem;">We received a request to reset your password for the London Technology Showcase app. Click the button below to set a new password.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #9D2235; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 1.5rem;">Reset Password</a>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 0.5rem;">This link expires in 1 hour.</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">London Technology Showcase · Attache Group Inc.</p>
        </div>
      `
    );

    console.log(`[password-reset] SMTP2GO result:`, JSON.stringify(result));
    res.json({ message: 'If that email is registered, you will receive a reset link shortly' });
  } catch (err) {
    console.error('[password-reset] Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// Validate vendor reset token — MUST be before /validate/:token
router.get('/vendor/validate/:token', async (req, res) => {
  try {
    console.log('[vendor-validate] called with token:', req.params.token.substring(0, 10) + '...');
    const { data: tokenRecord } = await supabase
      .from('password_reset_tokens')
      .select('id, expires_at, used, vendor_id')
      .eq('token', req.params.token)
      .not('vendor_id', 'is', null)
      .single();
    console.log('[vendor-validate] tokenRecord:', JSON.stringify(tokenRecord));
    if (!tokenRecord) return res.status(404).json({ error: 'Invalid or expired reset link' });
    if (tokenRecord.used) return res.status(400).json({ error: 'This reset link has already been used' });
    if (new Date(tokenRecord.expires_at) < new Date()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    const { data: vendor } = await supabase.from('vendors').select('company_name').eq('id', tokenRecord.vendor_id).single();
    res.json({ valid: true, name: vendor?.company_name || 'Vendor' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Validate token
router.get('/validate/:token', async (req, res) => {
  try {
    const { data: tokenRecord } = await supabase
      .from('password_reset_tokens')
      .select('id, expires_at, used, attendee_id, attendees(name)')
      .eq('token', req.params.token)
      .single();

    if (!tokenRecord) return res.status(404).json({ error: 'Invalid or expired reset link' });
    if (tokenRecord.used) return res.status(400).json({ error: 'This reset link has already been used' });
    if (new Date(tokenRecord.expires_at) < new Date()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

    res.json({ valid: true, name: tokenRecord.attendees?.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Set new password
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const { data: tokenRecord } = await supabase
      .from('password_reset_tokens')
      .select('id, expires_at, used, attendee_id')
      .eq('token', token)
      .single();

    if (!tokenRecord) return res.status(404).json({ error: 'Invalid or expired reset link' });
    if (tokenRecord.used) return res.status(400).json({ error: 'This reset link has already been used' });
    if (new Date(tokenRecord.expires_at) < new Date()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

    const password_hash = await bcrypt.hash(password, 10);
    await supabase.from('attendees').update({ password_hash }).eq('id', tokenRecord.attendee_id);
    await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tokenRecord.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Vendor password reset request
router.post('/vendor/request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, email, company_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!vendor) return res.json({ message: 'If that email is registered, you will receive a reset link shortly' });

    // Invalidate existing tokens
    await supabase.from('password_reset_tokens').update({ used: true })
      .eq('vendor_id', vendor.id).eq('used', false);

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store with vendor id — reuse same table with a type flag
    await supabase.from('password_reset_tokens').insert({
      vendor_id: vendor.id, token, expires_at
    });

    const resetUrl = `${APP_URL}/vendor/reset-password?token=${token}`;

    console.log(`[vendor-reset] Sending to ${vendor.email}`);
    const result = await sendEmail(
      vendor.email,
      'Reset your vendor portal password',
      `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="color: #262D33; margin: 0 0 1rem;">Password Reset Request</h2>
          <p style="color: #374151; margin: 0 0 1rem;">Hi ${vendor.company_name},</p>
          <p style="color: #374151; margin: 0 0 1.5rem;">Click the button below to reset your vendor portal password.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #9D2235; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 1.5rem;">Reset Password</a>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 0.5rem;">This link expires in 1 hour.</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">London Technology Showcase · Attache Group Inc.</p>
        </div>
      `
    );
    console.log(`[vendor-reset] Result:`, JSON.stringify(result));
    res.json({ message: 'If that email is registered, you will receive a reset link shortly' });
  } catch (err) {
    console.error('[vendor-reset] Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vendor reset password
router.post('/vendor/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const { data: tokenRecord } = await supabase
      .from('password_reset_tokens')
      .select('id, expires_at, used, vendor_id')
      .eq('token', token)
      .not('vendor_id', 'is', null)
      .single();

    if (!tokenRecord) return res.status(404).json({ error: 'Invalid or expired reset link' });
    if (tokenRecord.used) return res.status(400).json({ error: 'This reset link has already been used' });
    if (new Date(tokenRecord.expires_at) < new Date()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

    const password_hash = await bcrypt.hash(password, 10);
    await supabase.from('vendors').update({ password_hash }).eq('id', tokenRecord.vendor_id);
    await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tokenRecord.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;