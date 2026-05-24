/**
 * Run this once to push your service account + all env vars to Vercel.
 * Usage:
 *   1. Get a token from https://vercel.com/account/tokens
 *   2. node push_env_to_vercel.cjs YOUR_TOKEN_HERE
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const token = process.argv[2];
if (!token) {
    console.error('❌ Usage: node push_env_to_vercel.cjs YOUR_VERCEL_TOKEN');
    console.error('   Get token from: https://vercel.com/account/tokens');
    process.exit(1);
}

// Read serviceAccountKey.json and minify it
const saPath = path.join(__dirname, 'serviceAccountKey.json');
const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const saMinified = JSON.stringify(sa);

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;
    let key = line.substring(0, eqIdx).trim();
    let val = line.substring(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
    }
    envVars[key] = val;
});

// Add service account
envVars['FIREBASE_SERVICE_ACCOUNT'] = saMinified;

// Get the project name from vercel project config
let projectId = 'market-u'; // fallback

function apiRequest(method, path, body, cb) {
    const data = body ? JSON.stringify(body) : null;
    const options = {
        hostname: 'api.vercel.com',
        path,
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
    };
    const req = https.request(options, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            try { cb(null, JSON.parse(body), res.statusCode); }
            catch (e) { cb(null, body, res.statusCode); }
        });
    });
    req.on('error', cb);
    if (data) req.write(data);
    req.end();
}

// First get the project ID
apiRequest('GET', '/v9/projects/market-u', null, (err, data, status) => {
    if (err || status >= 400) {
        console.error('❌ Could not find project "market-u". Check your token has access.');
        console.error(data);
        process.exit(1);
    }

    const pid = data.id || 'market-u';
    console.log(`✅ Found project: ${data.name} (${pid})`);

    const entries = Object.entries(envVars);
    let done = 0;

    entries.forEach(([key, value]) => {
        const body = {
            key,
            value,
            type: 'encrypted',
            target: ['production', 'preview', 'development'],
        };

        apiRequest('POST', `/v10/projects/${pid}/env`, body, (err, res, status) => {
            done++;
            if (err || status >= 400) {
                // Try updating if it already exists
                if (res && res.error && res.error.code === 'ENV_ALREADY_EXISTS') {
                    console.log(`↻  ${key} (updating existing)`);
                    // Get existing env id and update it
                    apiRequest('GET', `/v9/projects/${pid}/env`, null, (e2, envData) => {
                        const existing = (envData.envs || []).find(e => e.key === key);
                        if (existing) {
                            apiRequest('PATCH', `/v9/projects/${pid}/env/${existing.id}`, { value, target: ['production', 'preview', 'development'] }, () => {
                                console.log(`✅ ${key} updated`);
                            });
                        }
                    });
                } else {
                    console.error(`❌ ${key} failed:`, status, JSON.stringify(res).slice(0, 100));
                }
            } else {
                console.log(`✅ ${key} added`);
            }

            if (done === entries.length) {
                console.log('\n🎉 Done! Trigger a redeploy in Vercel for changes to take effect.');
            }
        });
    });
});
