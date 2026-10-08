const fs = require('fs');
const path = require('path');
const katex = require(path.join(__dirname, '..', 'web', 'node_modules', 'katex'));

// The help text in AeroNames.bas is the single source for equations; the web
// renders the same strings from its catalog. Read every "Equation:" entry there
// so the pre-rendered Android assets cannot drift from the help text.
function loadEquations() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'AeroNames.bas'), 'utf8');
  const equations = {};
  const pattern = /Case "([^"]+)"\s*(?:'[^\r\n]*\s*)*Return "[^\r\n]*?Equation: ([^"]*)"/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    equations[match[1]] = match[2].trim();
  }
  if (Object.keys(equations).length === 0) {
    throw new Error('No equations found in AeroNames.bas');
  }
  return equations;
}

const LATEX_EQUATIONS = loadEquations();

function toSafeKey(raw) {
  return raw
    .replace(/Δ/g, 'Delta')
    .replace(/δ/g, 'delta')
    .replace(/σ/g, 'sigma')
    .replace(/θ/g, 'theta')
    .replace(/φ/g, 'phi')
    .replace(/Ψ/g, 'psi')
    .replace(/β/g, 'beta')
    .replace(/ρ/g, 'rho')
    .replace(/μ/g, 'mu')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const KATEX_CSS = fs.readFileSync(path.join(__dirname, '..', 'Files', 'katex', 'katex.min.css'), 'utf8');

function buildHtml(latex) {
  const rendered = katex.renderToString(latex, {
    displayMode: true,
    throwOnError: false,
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
${KATEX_CSS}
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-user-select: none;
  user-select: none;
  box-sizing: border-box;
  color: #009183;
  font-size: 16px;
}
.katex-wrap {
  margin: auto;
  padding: 2px 14px;
  white-space: nowrap;
}
.katex-display { margin: 0 !important; }
.katex { font-size: 1.08em; }
</style>
</head>
<body>
<div class="katex-wrap">
${rendered}
</div>
</body>
</html>`;
}

function main() {
  const outDir = path.join(__dirname, '..', 'Files', 'katex', 'eq');
  fs.mkdirSync(outDir, { recursive: true });

  const map = {};
  for (const [key, latex] of Object.entries(LATEX_EQUATIONS)) {
    const safe = toSafeKey(key);
    map[key] = safe;
    const html = buildHtml(latex);
    fs.writeFileSync(path.join(outDir, `${safe}.html`), html, 'utf8');
    fs.writeFileSync(path.join(outDir, `${safe.toLowerCase()}.html`), html, 'utf8');
  }

  // Write index mapping for debugging and verification
  fs.writeFileSync(
    path.join(__dirname, '..', 'Files', 'katex', 'map.json'),
    JSON.stringify(map, null, 2),
    'utf8'
  );

  console.log(`Generated ${Object.keys(map).length} KaTeX pre-rendered equations in Files/katex/eq/ (both canonical and lowercase)`);
}

main();
