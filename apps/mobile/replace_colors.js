const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['./app', './components', './services', './theme', './utils'];

const OLD_COLOR = /#A04F37/gi;
const NEW_COLOR = '#87A96B';

const OLD_BG = /#F8EEE7/gi;
const NEW_BG = '#F8F6F0';

let count = 0;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.match(/\.(tsx|ts|js|jsx)$/)) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      let changed = false;
      if (content.match(OLD_COLOR)) {
        content = content.replace(OLD_COLOR, NEW_COLOR);
        changed = true;
      }
      if (content.match(OLD_BG)) {
        content = content.replace(OLD_BG, NEW_BG);
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        count++;
        console.log(`Updated colors in ${fullPath}`);
      }
    }
  }
}

DIRECTORIES.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    processDirectory(fullPath);
  }
});

console.log(`Total files updated: ${count}`);
