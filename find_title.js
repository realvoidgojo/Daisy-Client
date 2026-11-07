const fs = require('fs');
const lines = fs.readFileSync('launcher/src/main.js', 'utf8').split('\n');
lines.forEach((l, idx) => {
  if (l.includes('createInstance(') || l.includes('createInstance =') || l.includes('\"create-instance\"') || l.includes('\'create-instance\'') || l.includes('createInstance')) {
    console.log((idx+1) + ': ' + l.trim());
  }
});
