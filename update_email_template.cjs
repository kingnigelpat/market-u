/**
 * Update Firebase Auth Email Template via Identity Toolkit REST API
 * One-time script — run with: node update_email_template.cjs
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load service account from env or file
let serviceAccount;
try {
    // Try loading from .env file
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
    const saMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT='(.+?)'/s);
    if (saMatch) {
        serviceAccount = JSON.parse(saMatch[1]);
    }
} catch (e) {
    // Fallback to serviceAccountKey.json
    serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf-8'));
}

if (!serviceAccount) {
    console.error('❌ Could not load service account credentials');
    process.exit(1);
}

const PROJECT_ID = serviceAccount.project_id;
const SCOPES = 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform';

// --- Step 1: Create a signed JWT from the service account ---
function createJWT(sa) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: SCOPES,
    })).toString('base64url');

    const signInput = `${header}.${payload}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    const signature = sign.sign(sa.private_key, 'base64url');

    return `${signInput}.${signature}`;
}

// --- Step 2: Exchange JWT for access token ---
function getAccessToken(jwt) {
    return new Promise((resolve, reject) => {
        const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
        const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
            },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const parsed = JSON.parse(data);
                if (parsed.access_token) resolve(parsed.access_token);
                else reject(new Error('Token error: ' + data));
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// --- Step 3: Get current config ---
function getConfig(accessToken) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            path: `/admin/v2/projects/${PROJECT_ID}/config`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(JSON.parse(data));
                else reject(new Error(`GET config failed (${res.statusCode}): ${data}`));
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// --- Step 4: Update the email template ---
function updateConfig(accessToken, configPatch) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(configPatch);
        const req = https.request({
            hostname: 'identitytoolkit.googleapis.com',
            path: `/admin/v2/projects/${PROJECT_ID}/config?updateMask=notification`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(JSON.parse(data));
                else reject(new Error(`PATCH config failed (${res.statusCode}): ${data}`));
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// --- Main ---
async function main() {
    console.log(`\n🔐 Authenticating with service account: ${serviceAccount.client_email}`);
    console.log(`📦 Project: ${PROJECT_ID}\n`);

    const jwt = createJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);
    console.log('✅ Got access token\n');

    // First, get current config to see existing template
    console.log('📋 Fetching current email config...');
    const currentConfig = await getConfig(accessToken);
    
    const currentTemplate = currentConfig?.notification?.sendEmail?.resetPasswordTemplate;
    if (currentTemplate) {
        console.log('   Current subject:', currentTemplate.subject || '(default)');
        console.log('   Current sender:', currentTemplate.senderDisplayName || '(default)');
    }

    // Build the branded password reset email template
    const brandedBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://marketu.store/logo.png" alt="Market-U" width="160" style="display: block; margin: 0 auto;" />
  </div>
  <div style="background: #f8fafc; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
    <h2 style="margin: 0 0 12px; color: #1e293b; font-size: 20px;">Reset Your Password</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
      Hi there! We received a request to reset the password for your Market-U account (<strong>%EMAIL%</strong>).
    </p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Click the button below to set a new password:
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="%LINK%" style="display: inline-block; background: linear-gradient(135deg, #2563EB, #7C3AED); color: white; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(37,99,235,0.3);">
        Reset Password
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
      If you didn't request this, you can safely ignore this email. Your password won't be changed.
    </p>
  </div>
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    Market-U — Campus Marketplace for Students
  </p>
</div>`;

    const configPatch = {
        notification: {
            sendEmail: {
                resetPasswordTemplate: {
                    senderDisplayName: 'Market-U',
                    subject: 'Reset your Market-U password',
                    body: brandedBody,
                    bodyFormat: 'HTML',
                },
            },
        },
    };

    console.log('\n🎨 Updating password reset email template...');
    const result = await updateConfig(accessToken, configPatch);
    
    const updated = result?.notification?.sendEmail?.resetPasswordTemplate;
    if (updated) {
        console.log('\n✅ Email template updated successfully!');
        console.log('   Sender:', updated.senderDisplayName);
        console.log('   Subject:', updated.subject);
        console.log('   Format:', updated.bodyFormat);
        console.log('\n🎉 Done! Password reset emails will now show your Market-U branding.\n');
    } else {
        console.log('\n⚠️  Update response:', JSON.stringify(result, null, 2));
    }
}

main().catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
});
