const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8080;

// Check if running in standalone mode
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

console.log('=== Azure App Service Startup ===');
console.log(`Current directory: ${__dirname}`);
console.log(`Looking for standalone server at: ${standalonePath}`);
console.log(`PORT: ${port}`);

if (fs.existsSync(standalonePath)) {
  console.log('Found standalone server, starting...');
  
  // Set the port and hostname for the standalone server
  process.env.PORT = port;
  process.env.HOSTNAME = '0.0.0.0';
  
  // Change to standalone directory and require the server
  process.chdir(path.join(__dirname, '.next', 'standalone'));
  require('./server.js');
} else {
  console.error('ERROR: Standalone server not found!');
  console.log('Directory contents:');
  
  if (fs.existsSync(path.join(__dirname, '.next'))) {
    console.log('.next folder exists, contents:');
    console.log(fs.readdirSync(path.join(__dirname, '.next')));
  } else {
    console.log('.next folder does NOT exist');
  }
  
  // Try fallback to next start
  console.log('Attempting fallback to next start...');
  try {
    const next = require('next');
    const app = next({ dev: false, dir: __dirname });
    const handle = app.getRequestHandler();
    
    app.prepare().then(() => {
      createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(port, '0.0.0.0', () => {
        console.log(`> Ready on http://0.0.0.0:${port}`);
      });
    });
  } catch (err) {
    console.error('Failed to start with next:', err);
    process.exit(1);
  }
}
