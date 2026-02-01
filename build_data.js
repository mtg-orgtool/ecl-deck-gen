const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// --- 設定 ---
const LIST_FILE = "mtg_ECL_list.txt";
const FILE_MAP = {
  ALL: "ALL Decks0129.csv",
  WU: "WU0129.csv",
  WB: "WB0129.csv",
  WR: "WR0129.csv",
  WG: "WG0129.csv",
  UB: "UB0129.csv",
  UR: "UR0129.csv",
  UG: "UG0129.csv",
  BR: "BR0129.csv",
  BG: "BG0129.csv",
  RG: "RG0129.csv",
};
const IMAGE_DIR = "./cardlist";
const OUTPUT_FILE = "gamedata.js";

// --- 文字列正規化関数 (ファイル名マッチング用) ---
function normalize(str) {
  if (!str) return "";
  return (
    str
      .replace(/\.(jpg|png|webp)$/i, "")
      // ★追加1: （...）や (...) のカッコ書きの中身ごと削除する
      .replace(/（[^）]*）/g, "")
      .replace(/\([^\)]*\)/g, "")
      .replace(/[\s　]/g, "")
      // ★追加2: 読点「、」も削除対象に追加
      .replace(/[！？（）：・,、']/g, "")
      .replace(/[／_]/g, "")
      .toLowerCase()
  );
}

// --- キー正規化関数 (Tierデータ名寄せ用) ---
function normalizeKey(str) {
  if (!str) return "";
  // 英数字以外を削除して小文字化
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function build() {
  console.log("処理開始...");

  // 1. カードリストのパース
  if (!fs.existsSync(LIST_FILE)) {
    console.error(`エラー: '${LIST_FILE}' が見つかりません。`);
    return;
  }

  const masterData = {};
  const listContent = fs.readFileSync(LIST_FILE, "utf-8");
  const lines = listContent.split("\n");

  let currentCard = {};

  const saveCurrentCard = () => {
    if (currentCard.enName) {
      masterData[currentCard.enName] = { ...currentCard, fileName: null };
    }
  };

  lines.forEach((line) => {
    const text = line.trim();
    if (text.startsWith("英語名：")) {
      if (currentCard.enName) saveCurrentCard();
      currentCard = {};
      currentCard.enName = text.replace("英語名：", "").trim();
    } else if (text.startsWith("日本語名：")) {
      currentCard.jpName = text.replace("日本語名：", "").trim();
    } else if (text.startsWith("コスト：")) {
      currentCard.cost = text.replace("コスト：", "").trim();
    } else if (text.startsWith("タイプ：") || text.startsWith("　タイプ：")) {
      currentCard.type = text.replace(/^(　)?タイプ：/, "").trim();
    }
  });
  saveCurrentCard();

  console.log(`カードリストのパース完了: ${Object.keys(masterData).length}枚`);

  // 2. 画像ファイルの紐付け
  console.log("\n画像ファイルの紐付けを開始...");
  if (fs.existsSync(IMAGE_DIR)) {
    const files = fs.readdirSync(IMAGE_DIR);
    // デバッグ: 最初の数件のファイル名を表示
    console.log(` - 検出ファイル数: ${files.length}`);

    let matchCount = 0;
    for (const enName in masterData) {
      const card = masterData[enName];
      const targetNameNorm = normalize(card.jpName);

      // ファイルリストから探す
      const matchedFile = files.find((f) => normalize(f) === targetNameNorm);

      if (matchedFile) {
        card.fileName = matchedFile;
        matchCount++;
      } else {
        console.log(
          `[未発見] リスト名: ${card.jpName} (正規化: ${normalize(card.jpName)})`,
        );
      }
    }
    console.log(` - 合計 ${matchCount} 枚の画像パスを紐付けました。`);
    console.log(
      ` - 画像が見つからなかった数: ${Object.keys(masterData).length - matchCount}`,
    );
  } else {
    console.warn(`警告: 画像フォルダ '${IMAGE_DIR}' が見つかりません。`);
  }

  // 3. 17landsデータの統合 (CSV)
  console.log("\n17landsデータの読み込み開始...");
  const tierData = {}; // { [normalizedName]: { ALL: "55%", WU: "52%", ... } }

  for (const [colorKey, csvFile] of Object.entries(FILE_MAP)) {
    await new Promise((resolve, reject) => {
      if (!fs.existsSync(csvFile)) {
        console.warn(
          `警告: '${csvFile}' (${colorKey}) が見つかりません。スキップします。`,
        );
        resolve();
        return;
      }

      console.log(`読み込み中: ${csvFile} (${colorKey})...`);
      let csvCount = 0;

      fs.createReadStream(csvFile)
        .pipe(
          csv({
            // ★重要: BOM除去とダブルクォート削除を徹底する
            mapHeaders: ({ header }) =>
              header
                .trim()
                .replace(/^\ufeff/, "")
                .replace(/^"|"$/g, ""),
          }),
        )
        .on("data", (row) => {
          // 列名を柔軟に取得 (CSVによって微妙に違う場合があるため)
          const nameKey = Object.keys(row).find((k) =>
            k.toLowerCase().includes("name"),
          ); // 'Name' を探す

          const keys = Object.keys(row);
          let wrKey = keys.find((k) => k.includes("GIH WR"));
          if (!wrKey) wrKey = keys.find((k) => k.includes("OH WR"));
          if (!wrKey) wrKey = keys.find((k) => k.includes("GP WR"));

          const name = row[nameKey];
          const wrStr = row[wrKey];

          if (name) {
            const normName = normalizeKey(name);
            if (!tierData[normName]) {
              tierData[normName] = {};
            }
            tierData[normName][colorKey] = wrStr;
            csvCount++;
          }
        })
        .on("end", () => {
          console.log(` - ${colorKey} データ読み込み完了: ${csvCount}件`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`エラー: ${csvFile} の読み込みに失敗しました`, err);
          resolve(); // エラーでも止まらないようにする
        });
    });
  }

  // 4. データマージ
  let tierMatchCount = 0;

  // Tiers計算用関数
  const calculateTier = (wrStr) => {
    if (!wrStr || wrStr === "-") return "U";
    const wr = parseFloat(wrStr.replace("%", ""));
    if (isNaN(wr)) return "U";

    if (wr >= 64.0) return "A+";
    if (wr >= 62.5) return "A";
    if (wr >= 61.5) return "A-";
    if (wr >= 60.0) return "B+";
    if (wr >= 58.8) return "B";
    if (wr >= 57.5) return "B-";
    if (wr >= 56.2) return "C+";
    if (wr >= 55.0) return "C";
    if (wr >= 53.7) return "C-";
    if (wr >= 52.5) return "D+";
    if (wr >= 51.2) return "D";
    if (wr >= 50.0) return "D-";
    return "F";
  };

  for (const enName in masterData) {
    const card = masterData[enName];
    const searchKey = normalizeKey(card.enName);
    const cardTiersData = tierData[searchKey] || {};

    // 複数形の tiers オブジェクトを作成
    card.tiers = {};
    card.winRates = {}; // winRateも色別に保持しておく(念のため)

    // CSV_MAPの全キーについてデータを埋める
    Object.keys(FILE_MAP).forEach((colorKey) => {
      const wrStr = cardTiersData[colorKey] || "-";
      card.winRates[colorKey] = wrStr;
      card.tiers[colorKey] = calculateTier(wrStr);
    });

    // 後方互換性のため、単数形の tier / winRate には ALL の値を入れる
    card.winRate = card.winRates["ALL"];
    card.tier = card.tiers["ALL"];

    if (card.winRate !== "-") tierMatchCount++;
  }

  console.log(
    `Tierデータのマージ完了 (一致数: ${tierMatchCount} / ${Object.keys(masterData).length})`,
  );

  // 5. 書き出し
  const outputContent = `// 自動生成されたデータ (${new Date().toLocaleString()})
const MASTER_CARD_DATA = ${JSON.stringify(masterData, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, outputContent);
  console.log(`\n✅ ${OUTPUT_FILE} の生成が完了しました！`);
}

build().catch((err) => console.error(err));
