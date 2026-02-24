const csv = require("csv-parser");
const fs = require("fs");
fs.createReadStream("UR0220.csv")
  .pipe(
    csv({
      mapHeaders: ({ header }) =>
        header
          .trim()
          .replace(/^\ufeff/, "")
          .replace(/^\"|\"$/g, ""),
    }),
  )
  .on("data", (row) => {
    if (row["Name"] === "Eclipsed Flamekin") {
      console.log(row);
      const keys = Object.keys(row);
      let wrKey = keys.find((k) => k.includes("GIH WR"));
      if (!wrKey) wrKey = keys.find((k) => k.includes("OH WR"));
      if (!wrKey) wrKey = keys.find((k) => k.includes("GP WR"));
      console.log("WR Key used:", wrKey);
      console.log("WR Value:", row[wrKey]);
    }
  });
