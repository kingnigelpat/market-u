const fs = require('fs');

let css = fs.readFileSync('src/styles/landing.css', 'utf8');

// Backgrounds
css = css.replace(/background-color: #ffffff;/g, 'background-color: var(--bg-color);');
css = css.replace(/background-color: white;/g, 'background-color: var(--bg-color);');
css = css.replace(/background: rgba\(255, 255, 255, 0\.85\);/g, 'background: var(--nav-bg);');
css = css.replace(/background-color: #f8fafc;/g, 'background-color: var(--bg-color);');
css = css.replace(/background-color: #f1f5f9;/g, 'background-color: var(--surface-color);');
css = css.replace(/background-color: #0f172a;/g, 'background-color: var(--text-primary);');

// Text colors
css = css.replace(/color: #0f172a;/g, 'color: var(--text-primary);');
css = css.replace(/color: #64748b;/g, 'color: var(--text-secondary);');
css = css.replace(/color: #94a3b8;/g, 'color: var(--text-secondary);');

// Borders
css = css.replace(/border: 2px solid #e2e8f0;/g, 'border: 2px solid var(--border-color);');
css = css.replace(/border: 1px solid #e2e8f0;/g, 'border: 1px solid var(--border-color);');
css = css.replace(/border: 1px solid #f1f5f9;/g, 'border: 1px solid var(--border-color);');
css = css.replace(/border-bottom: 1px solid #f1f5f9;/g, 'border-bottom: 1px solid var(--border-color);');
css = css.replace(/border-top: 1px solid #f1f5f9;/g, 'border-top: 1px solid var(--border-color);');
css = css.replace(/border-color: #0f172a;/g, 'border-color: var(--text-primary);');

// Specific nested fixes for contrast where text on var(--text-primary) should be var(--bg-color) instead of white
css = css.replace(/\.m-cat\.active \{\n    background-color: var\(--text-primary\);\n    color: white;\n    border-color: var\(--text-primary\);\n\}/g, '.m-cat.active {\n    background-color: var(--text-primary);\n    color: var(--bg-color);\n    border-color: var(--text-primary);\n}');

css = css.replace(/\.fc-avatar \{\n    width: 24px; height: 24px;\n    background-color: var\(--text-primary\); color: white;/g, '.fc-avatar {\n    width: 24px; height: 24px;\n    background-color: var(--text-primary); color: var(--bg-color);');

fs.writeFileSync('src/styles/landing.css', css, 'utf8');
console.log('CSS transformed successfully.');
