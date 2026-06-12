const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const manifest = require(path.join(buildDir, 'manifest.json'));
const references = [
  manifest.action.default_popup,
  ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap(script => script.js || []),
  ...(manifest.web_accessible_resources || []).flatMap(resource => resource.resources || []),
  'src/shared/core.js',
  'src/popup/popup.js',
  'src/popup/styles.css'
];

const missing = references.filter(reference => !fs.existsSync(path.join(buildDir, reference)));
if (missing.length > 0) {
  console.error(`Build references missing files:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log(`Validated ${references.length} manifest file references.`);
