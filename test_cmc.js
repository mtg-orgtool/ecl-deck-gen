
const fs = require('fs');
const gd = fs.readFileSync('gamedata.js', 'utf8');
const sc = fs.readFileSync('script.js', 'utf8');
eval(gd + '\n' + sc.replace('document.addEventListener', 'function noop(){}//'));
const text = '1 ‘¾—z‚Ü‚¾‚ç‚Ìj‰êŽÒ\n1 W‡Î\n1 ‰a‚ ‚³‚è‚ÌŽ}×HŒû';
const parsed = parseDeck(text);
console.log(parsed.map(c => c.displayName + ' : cmc=' + c.cmc).join('\n'));

