const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const packageJson = require(path.join(root, 'package.json'));
const manifest = require(path.join(root, 'manifest.json'));
const files = [
  'src/shared/core.js',
  'src/content/content.js',
  'src/popup/popup.html',
  'src/popup/popup.js',
  'src/popup/styles.css',
  'src/icons/icon16.png',
  'src/icons/icon32.png',
  'src/icons/icon48.png',
  'src/icons/icon128.png',
  'src/icons/background.png'
];

fs.rmSync(buildDir, { recursive: true, force: true });

for (const file of files) {
  const destination = path.join(buildDir, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}

manifest.version = packageJson.version;
fs.writeFileSync(
  path.join(buildDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Built WhatsApp ReplyPal v${packageJson.version} in ${buildDir}`);
