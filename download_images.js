const fs = require("fs");
const path = require("path");
const https = require("https");

const GALLERY_FILE = "gallery.txt";
const OUTPUT_DIR = "cardlist";
const DELAY_MS = 500;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

// Function to sanitize filenames
function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, (char) => {
      const map = {
        "/": "／",
        "\\": "＼",
        ":": "：",
        "*": "＊",
        "?": "？",
        '"': "”",
        "<": "＜",
        ">": "＞",
        "|": "｜",
      };
      return map[char] || "_";
    })
    .trim();
}

// Function to download a single image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(filepath, () => {}); // Delete failed file
          reject(
            new Error(`Failed to download. Status Code: ${response.statusCode}`)
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(() => resolve());
        });

        file.on("error", (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      })
      .on("error", (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
  });
}

// Main execution
(async () => {
  try {
    const data = fs.readFileSync(GALLERY_FILE, "utf8");
    const lines = data.split(/\r?\n/).filter((line) => line.trim() !== "");
    const total = lines.length;

    console.log(`Found ${total} items in ${GALLERY_FILE}.`);

    for (let i = 0; i < total; i++) {
      const line = lines[i];
      const parts = line.split("|");

      if (parts.length < 2) {
        console.warn(`[${i + 1}/${total}] Skip invalid line: ${line}`);
        continue;
      }

      const url = parts[0].trim();
      const rawName = parts[1].trim();
      const safeName = sanitizeFilename(rawName);
      const fileName = `${safeName}.webp`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      if (fs.existsSync(filePath)) {
        console.log(`[${i + 1}/${total}] Skip existing: ${fileName}`);
        continue;
      }

      try {
        await downloadImage(url, filePath);
        console.log(`[${i + 1}/${total}] Saved: ${fileName}`);
      } catch (err) {
        console.error(
          `[${i + 1}/${total}] Error downloading ${fileName}:`,
          err.message
        );
      }

      // Wait before next request
      if (i < total - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log("Download process completed.");
  } catch (err) {
    console.error("Error reading gallery file:", err);
  }
})();
