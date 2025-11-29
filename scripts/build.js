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

console.log('\n🎉 Build completed! Files copied to build/ directory.');
console.log('Ready for Chrome Web Store submission.');
