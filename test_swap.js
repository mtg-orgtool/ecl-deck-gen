const fs = require("fs");
const gd = fs.readFileSync("gamedata.js", "utf8");
const sc = fs.readFileSync("script.js", "utf8");
const scFixed = sc.replace(/document\.addEventListener[\s\S]*?\n\}\);/, "");
eval(gd + "\n" + scFixed);

const deckText = "1 外身の交換（そとみのこうかん）";
console.log("--- Testing parseDeck ---");
const parsed = parseDeck(deckText);
console.log("Result length:", parsed.length);
if (parsed.length > 0) {
  console.log("Parsed card:", parsed[0].displayName, "CMC:", parsed[0].cmc);
}
