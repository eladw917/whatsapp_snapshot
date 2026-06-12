const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json to get version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;
const name = packageJson.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

console.log(`📦 Building ${name} v${version}...`);

// First run the build script
try {
  execSync('node scripts/build.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Create zip file
const zipFileName = `${name}-v${version}.zip`;
const buildDir = path.join(__dirname, '..', 'build');
const zipPath = path.join(__dirname, '..', zipFileName);

console.log(`📁 Creating zip: ${zipFileName}`);

// Use Node.js built-in zip functionality or fallback to system zip
try {
  // The Unix zip command updates existing archives, which can retain stale build files.
  fs.rmSync(zipPath, { force: true });

  // Check if we're on Windows or Unix-like system
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // On Windows, use PowerShell to create zip
    execSync(`powershell "Compress-Archive -Path '${buildDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  } else {
    // On Unix-like systems, use zip command
    execSync(`cd "${buildDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }

  // Get file size
  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`✅ Zip created successfully: ${zipFileName} (${sizeMB} MB)`);
  console.log(`📍 Location: ${zipPath}`);

} catch (error) {
  console.error('❌ Failed to create zip:', error.message);
  process.exit(1);
}

console.log('\n🎉 Ready for Chrome Web Store submission!');
