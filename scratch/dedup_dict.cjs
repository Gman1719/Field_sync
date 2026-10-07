const fs = require('fs');
const path = 'c:/Users/hp/Desktop/gg/fieldsync-master/src/services/translationDictionary.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const seenKeys = new Set();
let newLines = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^\s{2}"([^"]+)"\s*:\s*\{/) || line.match(/^\s{2}'((?:\\'|[^'])+)'\s*:\s*\{/);
  if (m) {
    const key = m[1].replace(/\\'/g, "'");
    if (seenKeys.has(key)) {
      while (i < lines.length && !lines[i].match(/^\s{2}\},?/)) {
        i++;
      }
      i++;
      continue;
    } else {
      seenKeys.add(key);
      newLines.push(line);
      i++;
    }
  } else {
    newLines.push(line);
    i++;
  }
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Cleaned translationDictionary.ts, total lines:', newLines.length, 'unique keys:', seenKeys.size);
