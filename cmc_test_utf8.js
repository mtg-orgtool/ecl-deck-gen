const fs = require("fs");
const gd = fs.readFileSync("gamedata.js", "utf8");
const sc = fs.readFileSync("script.js", "utf8");
const scFixed = sc.replace(/document\.addEventListener[\s\S]*?\n\}\);/, "");
eval(gd + "\n" + scFixed);

console.log("(２) =>", getManaValue("(２)"));
console.log("(４) =>", getManaValue("(４)"));

const parsed = parseDeck(
  "1 太陽まだらの祝賀者\n1 集合石\n1 餌あさりの枝細工口",
);
parsed.forEach((c) =>
  console.log(c.displayName, "cost=", c.cost, "cmc=", c.cmc),
);
