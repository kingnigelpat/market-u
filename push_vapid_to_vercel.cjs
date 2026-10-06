/**
 * Pushes just the VITE_FIREBASE_VAPID_KEY to Vercel.
 * Usage: node push_vapid_to_vercel.cjs YOUR_VERCEL_TOKEN
 */
const https = require('https');

const token = process.argv[2];
if (!token) {
    console.error('❌ Usage: node push_vapid_to_vercel.cjs YOUR_VERCEL_TOKEN');
    console.error('   Get token from: https://vercel.com/account/tokens');
    process.exit(1);
}

const VAPID_KEY = 'BNyeNx7BCbygob2RSXQ4a_69vbOZryrQh0WH0CEN-k51xzEJ0iQsE-MwtKoqmbJF0oW5u1jCNqe-SsbTlAnxnsE';

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

// Get project
apiRequest('GET', '/v9/projects/market-u', null, (err, data, status) => {
    if (err || status >= 400) {
        console.error('❌ Could not find project. Check your token.', data);
        process.exit(1);
    }
    const pid = data.id || 'market-u';
    console.log(`✅ Project found: ${data.name} (${pid})`);

    const body = {
        key: 'VITE_FIREBASE_VAPID_KEY',
        value: VAPID_KEY,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
    };

    apiRequest('POST', `/v10/projects/${pid}/env`, body, (err, res, status) => {
        if (err || status >= 400) {
            if (res && res.error && res.error.code === 'ENV_ALREADY_EXISTS') {
                console.log('↻  Already exists — updating...');
                apiRequest('GET', `/v9/projects/${pid}/env`, null, (e2, envData) => {
                    const existing = (envData.envs || []).find(e => e.key === 'VITE_FIREBASE_VAPID_KEY');
                    if (existing) {
                        apiRequest('PATCH', `/v9/projects/${pid}/env/${existing.id}`, {
                            value: VAPID_KEY,
                            target: ['production', 'preview', 'development']
                        }, () => console.log('✅ VITE_FIREBASE_VAPID_KEY updated on Vercel!'));
                    }
                });
            } else {
                console.error('❌ Failed:', status, JSON.stringify(res).slice(0, 200));
            }
        } else {
            console.log('✅ VITE_FIREBASE_VAPID_KEY added to Vercel!');
            console.log('\n🎉 Now trigger a redeploy in Vercel for it to take effect.');
        }
    });
});
