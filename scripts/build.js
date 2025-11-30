const fs = require('fs');
const path = require('path');

// Clean build directory
if (fs.existsSync('build')) {
  fs.rmSync('build', { recursive: true, force: true });
}

// Create build directory
fs.mkdirSync('build', { recursive: true });

// Files to copy (source -> destination)
const filesToCopy = [
  // Core extension files
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'src/content/content.js', dest: 'content.js' },
  { src: 'src/popup/popup.html', dest: 'popup.html' },
  { src: 'src/popup/popup.js', dest: 'popup.js' },
  { src: 'src/popup/styles.css', dest: 'styles.css' },

  // Icons
  { src: 'src/icons/icon16.png', dest: 'icons/icon16.png' },
  { src: 'src/icons/icon32.png', dest: 'icons/icon32.png' },
  { src: 'src/icons/icon48.png', dest: 'icons/icon48.png' },
  { src: 'src/icons/icon128.png', dest: 'icons/icon128.png' },
  { src: 'src/icons/background.png', dest: 'background.png' },
  { src: 'src/icons/add_reaction_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg', dest: 'add_reaction_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg' }
];

// Copy each file
filesToCopy.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', 'build', dest);

  // Ensure destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy file
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${src} -> ${dest}`);
  } else {
    console.warn(`⚠ Warning: ${src} not found`);
  }
});

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// Update manifest.json paths for build
const manifestPath = path.join(__dirname, '..', 'build', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Sync version from package.json
  manifest.version = packageJson.version;

  // Update popup path
  if (manifest.action && manifest.action.default_popup) {
    manifest.action.default_popup = manifest.action.default_popup.replace('src/popup/', '');
  }

  // Update content scripts
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach(script => {
      if (script.js) {
        script.js = script.js.map(js => js.replace('src/content/', ''));
      }
    });
  }

  // Update icons
  if (manifest.icons) {
    Object.keys(manifest.icons).forEach(key => {
      manifest.icons[key] = manifest.icons[key].replace('src/icons/', 'icons/');
    });
  }

  // Update web_accessible_resources
  if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources.forEach(resource => {
      if (resource.resources) {
        resource.resources = resource.resources.map(res => res.replace('src/icons/background.png', 'background.png'));
      }
    });
  }

  // Update CSS background path
  const cssPath = path.join(__dirname, '..', 'build', 'styles.css');
  if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf8');
    css = css.replace("../icons/background.png", "background.png");
    fs.writeFileSync(cssPath, css);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ Updated manifest.json paths for build');
}

console.log('\n🎉 Build completed! Files copied to build/ directory.');
console.log('Ready for Chrome Web Store submission.');
