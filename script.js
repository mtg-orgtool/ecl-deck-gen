// =================================================================
// == 完全版スクリプト (修正済み: 2026/01/26) ==
// =================================================================

// --- 1. 定数定義 ---
let deckCanvas;
let deckCtx;
let currentDeckList = []; // デッキリスト保持用
const CARD_W = 200;
const CARD_H = 280;
const GAP = 10;
const PADDING = 20;
const HEADER_HEIGHT = 60;
const COUNT_COL_WIDTH = 60;

// Tierの数値化用マッピング（表示順ソート用）
const tierOrder = {
  "A+": 13,
  A: 12,
  "A-": 11,
  "B+": 10,
  B: 9,
  "B-": 8,
  "C+": 7,
  C: 6,
  "C-": 5,
  "D+": 4,
  D: 3,
  "D-": 2,
  F: 1,
  U: 0,
};

// 【修正点】エラーの原因となっていた jpToEnMap の初期化を削除しました。
// 現在の検索ロジック(findCardData)では使用していないため不要です。

const BASIC_LAND_NAMES = [
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "平地",
  "島",
  "沼",
  "山",
  "森",
];

// --- 初期化処理 (DOMContentLoaded) ---
document.addEventListener("DOMContentLoaded", () => {
  deckCanvas = document.getElementById("deck-canvas");
  if (deckCanvas) {
    deckCtx = deckCanvas.getContext("2d");
  } else {
    console.error("Canvas element not found during initialization");
  }

  // イベントリスナーの登録
  const genBtn = document.getElementById("generate-btn");
  if (genBtn) genBtn.addEventListener("click", onGenerateClick);

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.addEventListener("click", onSaveClick);

  // 色選択プルダウンのイベントリスナー
  const colorSelect = document.getElementById("colorSelect");
  if (colorSelect) {
    colorSelect.addEventListener("change", () => {
      if (currentDeckList.length > 0) {
        drawDeck(currentDeckList);
      }
    });
  }
});

// --- 2. ヘルパー関数群 ---

function getTierScore(tierStr) {
  return tierOrder[tierStr] || 0;
}

function getManaValue(costStr) {
  if (!costStr) return 0;
  let total = 0;
  // 全角・半角カッコ, 波カッコに対応
  const numMatch = costStr.match(/[\(（\{]([0-9０-９]+)[\)）\}]/g);
  if (numMatch) {
    numMatch.forEach((m) => {
      let numStr = m
        .replace(/[\(（\)\）\{\}]/g, "")
        .replace(/[０-９]/g, (s) =>
          String.fromCharCode(s.charCodeAt(0) - 0xfee0),
        );
      const val = parseInt(numStr, 10);
      if (!isNaN(val)) total += val;
    });
  }
  const symMatch = costStr.match(/[\(（\{]([a-zA-Z/]+)[\)）\}]/g);
  if (symMatch) {
    symMatch.forEach((m) => {
      if (!m.toUpperCase().includes("X")) total += 1;
    });
  }
  return total;
}

function parseColor(str) {
  if (!str) return { color: "C" };
  const cSet = new Set();
  if (str.match(/[W白]/)) cSet.add("W");
  if (str.match(/[U青]/)) cSet.add("U");
  if (str.match(/[B黒]/)) cSet.add("B");
  if (str.match(/[R赤]/)) cSet.add("R");
  if (str.match(/[G緑]/)) cSet.add("G");
  if (cSet.size > 1) return { color: "M" };
  if (cSet.size === 1) return { color: Array.from(cSet)[0] };
  if (str.includes("Land")) return { color: "L" };
  return { color: "C" };
}

function setStatus(message, isError = false) {
  const statusEl = document.getElementById("status-message");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#ff6b6b" : "#9BD3AE";
  }
}

function getColumnCount() {
  // 画面幅が768px以下の場合はモバイルとみなして4列、それ以外は7列
  return window.innerWidth <= 768 ? 4 : 7;
}

function drawTierIcon(ctx, x, y, tier) {
  if (!tier || tier === "U") return;
  const iconX = x + 30,
    iconY = y + 50,
    radius = 18;
  const tierColors = {
    A: "#d92626",
    B: "#22a522",
    C: "#d4a000",
    D: "#2667d9",
    F: "#555555",
  };
  const color = tierColors[tier.charAt(0)] || "#888888";
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(iconX, iconY, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 20px Arial";
  ctx.fillText(tier, iconX, iconY + 1);
}

function drawBadge(ctx, x, y, cnt) {
  const badgeW = 50,
    badgeH = 30;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(x + 5, y + CARD_H - (badgeH + 5), badgeW, badgeH);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 22px Arial";
  ctx.fillText("×" + cnt, x + 5 + badgeW / 2, y + CARD_H - 10);
}

function drawFallbackCard(ctx, x, y, c) {
  ctx.fillStyle = "#111";
  ctx.fillRect(x, y, CARD_W, CARD_H);
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, CARD_W - 2, CARD_H - 2);

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 18px Arial";
  ctx.fillText("No Image", x + CARD_W / 2, y + CARD_H / 2 - 20);

  ctx.font = "14px Arial";
  // 名前が無い場合のエラー回避
  let cardNameText = c.jpName || c.nameEn || c.displayName || "Unknown";
  if (cardNameText.length > 25) {
    cardNameText = cardNameText.substring(0, 22) + "...";
  }
  ctx.fillText(cardNameText, x + CARD_W / 2, y + CARD_H / 2 + 10);
  ctx.restore();

  if (c.cost) {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillText(c.cost, x + CARD_W - 10, y + 20);
  }

  drawTierIcon(ctx, x, y, c.tier);
  drawBadge(ctx, x, y, c.count);
}

// --- 3. メインロジック ---

// 安全版 findCardData 関数 (日英併記対応版)
function findCardData(name) {
  // 1. 入力値のガード
  if (!name || typeof name !== "string") return null;

  // ★追加: スラッシュ区切りの日英併記に対応 (分割して再検索)
  if (name.includes("/")) {
    const parts = name.split("/");
    for (const part of parts) {
      // 分割した名前(トリム済み)で再検索
      const result = findCardData(part.trim());
      if (result) return result;
    }
    // 分割しても見つからなかった場合は、そのまま下の検索へ進む
  }

  const searchKey = name.trim().toLowerCase();
  if (!searchKey) return null;

  // 2. ダイレクト検索 (高速化)
  if (MASTER_CARD_DATA[searchKey]) {
    return { enName: searchKey, data: MASTER_CARD_DATA[searchKey] };
  }

  // 全データ走査の準備
  const allCards = Object.values(MASTER_CARD_DATA);

  // 3. 英語名での検索 (安全装置付き)
  const foundEn = allCards.find((card) => {
    if (card.enName && typeof card.enName === "string") {
      return card.enName.toLowerCase() === searchKey;
    }
    return false;
  });
  if (foundEn) return { enName: foundEn.enName, data: foundEn };

  // 4. 日本語名での検索 (正規化・安全装置付き)
  const searchKeyNorm = searchKey.replace(/[\s　]/g, ""); // スペース除去
  const foundJp = allCards.find((card) => {
    if (card.jpName && typeof card.jpName === "string") {
      return card.jpName.replace(/[\s　]/g, "").toLowerCase() === searchKeyNorm;
    }
    return false;
  });
  if (foundJp) return { enName: foundJp.enName, data: foundJp };

  return null;
}

function parseDeck(deckText) {
  const lines = deckText.split("\n");
  const deckCards = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // ヘッダーやサイドボードのスキップ
    if (line === "Deck" || line === "デッキ") continue;
    if (line.startsWith("Sideboard") || line.startsWith("サイドボード")) break;
    if (line.includes("??")) continue;

    let count = 1;
    let namePart = line;
    let manualCost = ""; // ★追加: 手動指定コスト保存用

    // A. MO形式: 行末の "x数字" をチェック
    const moTailMatch = line.match(/\s+x(\d+)$/);
    if (moTailMatch) {
      count = parseInt(moTailMatch[1], 10);
      namePart = line.substring(0, moTailMatch.index);

      // ★追加: コスト削除の前に抽出 (丸括弧または波括弧の塊)
      const costMatch = namePart.match(/([\(（\{].*[\)）\}])/);
      if (costMatch) {
        manualCost = costMatch[1].trim();
      }

      // マナコスト表記 (Cost) を削除
      namePart = namePart.replace(/\s*[\(（\{].*?[\)）\}]/g, "");
      namePart = namePart.trim();
    } else {
      // B. アリーナ形式: 行頭の数字
      const leadNumMatch = line.match(/^(\d+)\s+(.+)/);
      if (leadNumMatch) {
        count = parseInt(leadNumMatch[1], 10);
        namePart = leadNumMatch[2];
      } else {
        // 旧形式互換
        const tailNumMatch = line.match(/(.*?)\s*[x×]\s*(\d+)$/);
        if (tailNumMatch) {
          count = parseInt(tailNumMatch[2], 10);
          namePart = tailNumMatch[1];
        }
      }
    }

    // カード名の正規化
    namePart = namePart.replace(/（.*?）/g, ""); // ルビ削除
    namePart = namePart.replace(/\s*\([A-Z0-9]{3,}\)\s+\d+$/, ""); // セット情報削除
    const cleanedName = namePart.trim();

    if (!cleanedName) continue;

    const foundCard = findCardData(cleanedName);
    const isBasicLand = BASIC_LAND_NAMES.some((l) => cleanedName.includes(l));

    if (!foundCard && !isBasicLand) {
      console.warn(`見つかりません: "${cleanedName}"`);
      // 見つからない場合も続行せずスキップ（またはエラー表示）
      continue;
    }

    const cardData = foundCard ? foundCard.data : {};
    const nameEn = foundCard ? foundCard.enName : cleanedName;

    // カード情報の構築
    let cardInfo = {
      displayName: cleanedName,
      count: count,
      nameEn: nameEn,
      jpName: cardData.jp || cleanedName,
      fileName: cardData.fileName || null,
      cost: manualCost || cardData.cost || "", // ★修正: manualCost最優先
      type: cardData.type || "", // typeが無い場合は空文字
      tier: cardData.tier || "U",
      tiers: cardData.tiers || null, // 全色のTierデータ
      gihwr: cardData.wr || "-",
      imgObj: null,
      // 安全のため、数値計算前に型チェック
      cmc: 0,
      color: "C",
    };

    // コスト計算（安全化）
    if (cardInfo.cost) {
      cardInfo.cmc = getManaValue(cardInfo.cost);
      cardInfo.color = parseColor(cardInfo.cost).color;
    }

    deckCards.push(cardInfo);
  }
  return deckCards;
}

function loadCardImages(deckList) {
  const promises = deckList.map((card) => {
    return new Promise((resolve) => {
      if (!card.fileName) {
        card.imgObj = null;
        resolve();
        return;
      }
      const img = new Image();
      const src = `./cardlist/${card.fileName}`;
      img.onload = () => {
        card.imgObj = img;
        resolve();
      };
      img.onerror = () => {
        console.warn(`画像ロード失敗: ${src}`);
        card.imgObj = null;
        resolve();
      };
      img.src = src;
    });
  });
  return Promise.all(promises);
}

function drawDeck(deckList) {
  const colorSelect = document.getElementById("colorSelect");
  const selectedColor = colorSelect ? colorSelect.value : "ALL";

  deckList.forEach((card) => {
    if (card.tiers) {
      card.tier = card.tiers[selectedColor] || card.tiers["ALL"] || "-";
    }
  });

  const currentColCount = getColumnCount();

  const groupedCards = {
    cost0: [],
    cost1: [],
    cost2: [],
    cost3: [],
    cost4: [],
    cost5: [],
    cost6plus: [],
    lands: [],
  };

  deckList.forEach((card) => {
    const typeStr = card.type || ""; // undefined対策
    if (typeStr.includes("土地") || typeStr.includes("Land")) {
      groupedCards.lands.push(card);
    } else {
      const cmc = card.cmc || 0;
      const cmcKey = cmc >= 6 ? "cost6plus" : `cost${cmc}`;
      // キーが存在しない場合の安全策
      if (groupedCards[cmcKey]) {
        groupedCards[cmcKey].push(card);
      } else {
        groupedCards["cost0"].push(card);
      }
    }
  });

  const sortInGroup = (a, b) => {
    const tierScoreA = getTierScore(a.tier);
    const tierScoreB = getTierScore(b.tier);
    if (tierScoreA !== tierScoreB) return tierScoreB - tierScoreA;

    const typeA = a.type || "";
    const typeB = b.type || "";
    const isCreatureA =
      typeA.includes("クリーチャー") || typeA.includes("Creature");
    const isCreatureB =
      typeB.includes("クリーチャー") || typeB.includes("Creature");
    if (isCreatureA !== isCreatureB) return isCreatureA ? -1 : 1;

    // 【重要】名前比較の安全化 (ここでも toLowerCase エラーを防ぐ)
    const nameA = (a.enName || a.jpName || "").toString();
    const nameB = (b.enName || b.jpName || "").toString();
    return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
  };

  for (const key in groupedCards) {
    if (key !== "lands") groupedCards[key].sort(sortInGroup);
  }

  groupedCards.lands.sort((a, b) => {
    const isBasicA = BASIC_LAND_NAMES.some((n) => a.displayName.includes(n));
    const isBasicB = BASIC_LAND_NAMES.some((n) => b.displayName.includes(n));

    if (isBasicA !== isBasicB) return isBasicA ? 1 : -1;

    if (!isBasicA) {
      const scoreA = getTierScore(a.tier);
      const scoreB = getTierScore(b.tier);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.displayName.localeCompare(b.displayName);
    } else {
      if (a.count !== b.count) return b.count - a.count;
      const wubrgOrder = [
        "Plains",
        "平地",
        "Island",
        "島",
        "Swamp",
        "沼",
        "Mountain",
        "山",
        "Forest",
        "森",
      ];
      const idxA = wubrgOrder.findIndex((n) => a.displayName.includes(n));
      const idxB = wubrgOrder.findIndex((n) => b.displayName.includes(n));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.displayName.localeCompare(b.displayName);
    }
  });

  // --- Canvas描画処理 ---
  const groupOrder = [
    "cost0",
    "cost1",
    "cost2",
    "cost3",
    "cost4",
    "cost5",
    "cost6plus",
    "lands",
  ];
  const groupSpacing = 20;

  let requiredHeight = GAP;
  groupOrder.forEach((key) => {
    const group = groupedCards[key] || [];
    if (group.length > 0) {
      requiredHeight +=
        Math.ceil(group.length / currentColCount) * (CARD_H + GAP) +
        groupSpacing;
    }
  });

  deckCanvas.width = (CARD_W + GAP) * currentColCount + GAP + COUNT_COL_WIDTH;
  deckCanvas.height = Math.max(requiredHeight, 400) + HEADER_HEIGHT + PADDING;
  deckCtx.fillStyle = "#111";
  deckCtx.fillRect(0, 0, deckCanvas.width, deckCanvas.height);

  const deckStats = calculateDeckStats(groupedCards);
  drawDeckStats(deckCtx, deckStats, GAP, GAP + 5);

  let y = GAP + HEADER_HEIGHT;
  groupOrder.forEach((key) => {
    const group = groupedCards[key] || [];
    if (group.length > 0) {
      const groupStartY = y;
      let totalCountInGroup = 0;

      group.forEach((card, i) => {
        totalCountInGroup += card.count;
        const col = i % currentColCount;
        const row = Math.floor(i / currentColCount);
        const x = GAP + COUNT_COL_WIDTH + col * (CARD_W + GAP);
        const currentY = y + row * (CARD_H + GAP);

        if (card.imgObj) {
          deckCtx.drawImage(card.imgObj, x, currentY, CARD_W, CARD_H);
        } else {
          drawFallbackCard(deckCtx, x, currentY, card);
        }
        drawBadge(deckCtx, x, currentY, card.count);
        drawTierIcon(deckCtx, x, currentY, card.tier);
      });

      const numRowsInGroup = Math.ceil(group.length / currentColCount);
      const groupHeight = numRowsInGroup * (CARD_H + GAP) - GAP;
      deckCtx.save();
      deckCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
      deckCtx.font = "bold 32px Arial";
      deckCtx.textAlign = "center";
      deckCtx.textBaseline = "middle";
      deckCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
      deckCtx.shadowBlur = 5;
      deckCtx.fillText(
        totalCountInGroup,
        GAP + COUNT_COL_WIDTH / 2,
        groupStartY + groupHeight / 2,
      );
      deckCtx.restore();

      y += numRowsInGroup * (CARD_H + GAP) + groupSpacing;
    }
  });

  deckCtx.save();
  deckCtx.fillStyle = "rgba(255, 255, 255, 0.6)";
  deckCtx.font = "12px Arial";
  deckCtx.textAlign = "right";
  deckCtx.textBaseline = "bottom";
  const creditText =
    "Data provided by 17Lands.com | © Wizards of the Coast | Generated by Decklist Generator";
  deckCtx.fillText(creditText, deckCanvas.width - 20, deckCanvas.height - 10);
  deckCtx.restore();
}

function calculateDeckStats(groupedCards) {
  const stats = { creatures: 0, spells: 0, lands: 0 };
  Object.values(groupedCards)
    .flat()
    .forEach((card) => {
      const type = card.type || "";
      if (type.includes("土地") || type.includes("Land")) {
        stats.lands += card.count;
      } else if (type.includes("クリーチャー") || type.includes("Creature")) {
        stats.creatures += card.count;
      } else {
        stats.spells += card.count;
      }
    });
  return stats;
}

function drawDeckStats(ctx, stats, x, y) {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0, 0, 0, 1)";
  ctx.shadowBlur = 4;
  const total = stats.creatures + stats.spells + stats.lands;

  ctx.fillText(`Creatures: ${stats.creatures}`, x + 20, y + 20);
  ctx.fillText(`Spells: ${stats.spells}`, x + 250, y + 20);
  ctx.fillText(`Lands: ${stats.lands}`, x + 450, y + 20);
  ctx.fillText(`Total: ${total}`, x + 650, y + 20);
  ctx.restore();
}

// --- 4. イベントハンドラ ---

function onSaveClick() {
  if (!deckCanvas) {
    setStatus("エラー: キャンバスが見つかりません", true);
    return;
  }

  const now = new Date();
  const timeStr = now
    .toISOString()
    .replace(/[-T:\.Z]/g, "")
    .slice(0, 14);
  const fileName = `decklist_${timeStr}.png`;

  try {
    deckCanvas.toBlob(async (blob) => {
      if (!blob) {
        setStatus("画像生成エラー", true);
        return;
      }
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "MTG Decklist",
            text: "Generated by Decklist Generator",
          });
          setStatus("画像を共有しました", false);
        } catch (err) {
          if (err.name !== "AbortError") {
            setStatus("共有エラー", true);
          }
        }
      } else {
        try {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
        } catch (e) {
          setStatus("画像を長押しして保存してください", true);
        }
      }
    }, "image/png");
  } catch (e) {
    setStatus("画像を長押しして保存してください", true);
  }
}

async function onGenerateClick() {
  try {
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = "画像を保存";
    }

    setStatus("デッキリストを解析中...");
    const deckInput = document.getElementById("deck-input");
    if (!deckInput) throw new Error("Input element not found");

    const deckText = deckInput.value;
    const deckList = parseDeck(deckText);
    currentDeckList = deckList;

    if (deckList.length === 0) {
      setStatus(
        "カードが見つかりませんでした。入力データを確認してください。",
        true,
      );
      return;
    }

    setStatus("カード画像を読み込み中...");
    await loadCardImages(deckList);

    setStatus("画像を生成中...");
    drawDeck(deckList);
    setStatus("画像生成完了！", false);

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = "画像を保存 (完了)";
    }
  } catch (e) {
    console.error(e);
    setStatus(`エラーが発生しました: ${e.message}`, true);
  }
}
