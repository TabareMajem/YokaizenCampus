const fs = require('fs');
const files = fs.readdirSync('dist/assets').filter(f => f.startsWith('index-') && f.endsWith('.js'));
if (files.length > 0) {
  const code = fs.readFileSync('dist/assets/' + files[0], 'utf8');
  const lines = code.split('\n');
  
  lines.forEach((line, i) => {
    if (line.includes('.length')) {
      // Print variable exactly before .length
      const m = line.match(/([a-zA-Z0-9_\?\.]+)\.length/);
      if (m && !['this', 'arguments', 'length', 'String', 'Array', 'String.prototype'].includes(m[1]) && !line.includes('for (') && !line.includes('while (')) {
        console.log(`Line ${i+1}: ${m[1]}.length -> ${line.trim().substring(0, 100)}`);
      }
    }
  });
}
