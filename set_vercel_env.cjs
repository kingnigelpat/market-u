const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read and minify the service account key
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));
const minified = JSON.stringify(sa);

// Write all env vars to a temp .env file for Vercel to pull
const envVars = {
  FIREBASE_SERVICE_ACCOUNT: minified,
};

// Use Vercel CLI to set each env var
for (const [key, value] of Object.entries(envVars)) {
  try {
    // Write value to a temp file to avoid shell escaping issues
    const tmpFile = path.join(__dirname, '.tmp_env_val');
    fs.writeFileSync(tmpFile, value, 'utf8');
    
    execSync(`type .tmp_env_val | npx vercel@latest env add ${key} production --force`, {
      stdio: 'inherit',
      shell: 'cmd.exe',
      cwd: __dirname
    });
    
    fs.unlinkSync(tmpFile);
    console.log(`✅ ${key} added to Vercel`);
  } catch (e) {
    console.error(`❌ Failed to add ${key}:`, e.message);
  }
}
