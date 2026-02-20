const fs = require("fs");
const gd = fs.readFileSync("gamedata.js", "utf8");
const sc = fs.readFileSync("script.js", "utf8");
const scFixed = sc.replace(/document\.addEventListener[\s\S]*?\n\}\);/, "");
eval(gd + "\n" + scFixed);
const text =
  "1 太陽まだらの祝賀者\n1 集合石\n1 餌あさりの枝細工口\n1 興味津々の巨人\n1 まどろむ散歩者";
const parsed = parseDeck(text);
const groupedCards = { basicLands: [], lands: [] };
parsed.forEach((c) => {
  const cmcKey = "cost" + c.cmc;
  if (!groupedCards[cmcKey]) groupedCards[cmcKey] = [];
  groupedCards[cmcKey].push(c);
});
const costKeys = Object.keys(groupedCards)
  .filter((k) => k.startsWith("cost"))
  .sort()
  .map((k) => `${k}: ${groupedCards[k].map((x) => x.displayName).join(", ")}`);
console.log("Grouped:", costKeys);
