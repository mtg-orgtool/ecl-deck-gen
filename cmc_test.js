
const fs = require('fs');
const gd = fs.readFileSync('gamedata.js', 'utf8');
const sc = fs.readFileSync('script.js', 'utf8');
let scFixed = sc.replace(/document\.addEventListener[\s\S]*?\n\}\);/, '');
eval(gd + '\n' + scFixed);

console.log('--- getManaValue tests ---');
console.log('(‚Q) =>', getManaValue('(‚Q)'));
console.log('(‚S) =>', getManaValue('(‚S)'));

console.log('--- parseDeck tests ---');
const parsed = parseDeck('1 ‘¾—z‚Ü‚¾‚ç‚Ìj‰êŽÒ\n1 W‡Î\n1 ‰a‚ ‚³‚è‚ÌŽ}×HŒû');
parsed.forEach(c => console.log(c.displayName, 'cost=', c.cost, 'cmc=', c.cmc));

