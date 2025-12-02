const fs = require('fs');
const path = require('path');

function copyFolderSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source folder does not exist: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying static files for standalone build...');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.error('ERROR: .next/standalone directory not found!');
  console.error('Make sure "output: standalone" is set in next.config.ts');
  process.exit(1);
}

// Copy public folder
const publicSrc = path.join(__dirname, '..', 'public');
const publicDest = path.join(standaloneDir, 'public');
console.log(`Copying public folder to ${publicDest}...`);
copyFolderSync(publicSrc, publicDest);

// Copy .next/static folder
const staticSrc = path.join(__dirname, '..', '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
console.log(`Copying .next/static folder to ${staticDest}...`);
copyFolderSync(staticSrc, staticDest);

console.log('Static files copied successfully!');
