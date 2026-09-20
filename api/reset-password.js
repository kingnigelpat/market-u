/**
 * /api/reset-password.js — Vercel Serverless Function
 * Generates a Firebase password reset link via Identity Toolkit REST API,
 * then sends a branded email via Resend with the Market-U logo.
 */

// ── Rate limiter ─────────────────────────────────────────────────────────────
const _rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = _rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        _rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
}

// ── Token cache ──────────────────────────────────────────────────────────────
let _cachedToken = null;
let _tokenExpiresAt = 0;

function base64url(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    if (_cachedToken && now < _tokenExpiresAt - 300) {
        return _cachedToken;
    }

    const { createSign } = await import('crypto');
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    }));

    const signingInput = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${signingInput}.${signature}`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenRes.json();
    _cachedToken = tokenData.access_token;
    _tokenExpiresAt = now + 3600;
    return _cachedToken;
}

// ── Generate reset link via Identity Toolkit ─────────────────────────────────
async function generateResetLink(email, serviceAccount) {
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=dummy`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Goog-User-Project': projectId,
            },
            body: JSON.stringify({
                requestType: 'PASSWORD_RESET',
                email: email,
                returnOobLink: true,
            }),
        }
    );

    const data = await res.json();
    if (data.error) {
        throw new Error(data.error.message || 'Failed to generate reset link');
    }
    return data.oobLink;
}

// ── Branded email HTML ───────────────────────────────────────────────────────
function buildResetEmail(email, resetLink) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="https://marketu.store/logo.png" alt="Market-U" width="160" style="display: block; border: 0;" />
            </td>
          </tr>
          <!-- Main Card -->
          <tr>
            <td style="background: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 800;">
                Reset Your Password
              </h1>
              <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
                Hi there! 👋
              </p>
              <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                We received a request to reset the password for your Market-U account
                (<strong style="color: #1e293b;">${email}</strong>). Click the button below to set a new password:
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563EB, #7C3AED); color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 50px; font-weight: 700; font-size: 15px; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #2563EB; font-size: 12px; line-height: 1.5; margin: 0 0 20px; word-break: break-all;">
                <a href="${resetLink}" style="color: #2563EB;">${resetLink}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Market-U — Campus Marketplace for Students 🎓
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Send email via Resend ────────────────────────────────────────────────────
async function sendEmail(to, subject, htmlBody, resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
            from: 'Market-U <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: htmlBody,
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Failed to send email via Resend');
    }
    return data;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Rate limit
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }

    const { email } = req.body;
    if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email is required' });
    }

    // Load credentials
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!serviceAccountRaw) {
        return res.status(500).json({ error: 'Server not configured (missing service account)' });
    }
    if (!resendApiKey) {
        return res.status(500).json({ error: 'Server not configured (missing Resend API key)' });
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountRaw);
    } catch (e) {
        return res.status(500).json({ error: 'Invalid service account configuration' });
    }

    try {
        // 1. Generate the reset link via Firebase Admin
        const resetLink = await generateResetLink(email.trim(), serviceAccount);

        // 2. Send branded email via Resend
        const htmlBody = buildResetEmail(email.trim(), resetLink);
        await sendEmail(email.trim(), 'Reset your Market-U password 🔒', htmlBody, resendApiKey);

        return res.status(200).json({ success: true, message: 'Password reset email sent' });
    } catch (err) {
        console.error('[reset-password] Error:', err.message);

        if (err.message.includes('EMAIL_NOT_FOUND')) {
            return res.status(404).json({ error: 'No account found with that email address.' });
        }
        if (err.message.includes('INVALID_EMAIL')) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        return res.status(500).json({ error: 'Failed to send password reset email. Please try again.' });
    }
}
