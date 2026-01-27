import requests
from bs4 import BeautifulSoup
import os
import time

def scrape_mtg_cards():
    # 保存先：ダウンロードフォルダに「mtg_cards_list.txt」を作成
    download_dir = os.path.join(os.path.expanduser("~"), "Downloads")
    output_file = os.path.join(download_dir, "mtg_cards_list.txt")
    
    base_url = "https://phyrexian-mtg.net/search/list"
    set_name_jp = "ローウィンの昏明"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    symbol_map = {
        "card-symbol-T": "(Ｔ)", "card-symbol-Q": "(Ｑ)", "card-symbol-W": "(白)",
        "card-symbol-U": "(青)", "card-symbol-B": "(黒)", "card-symbol-R": "(赤)",
        "card-symbol-G": "(緑)", "card-symbol-C": "(◇)", "card-symbol-E": "(Ｅ)", "card-symbol-S": "(Ｓ)",
    }

    with open(output_file, "w", encoding="utf-8") as f:
        # 全8ページを処理
        for page in range(1, 9):
            print(f"--- {page}ページ目を読み込み中... ---")
            params = {"cardSet": "ecl", "booster": "0", "page": page, "sort": "2" if page > 1 else None}
            
            try:
                # タイムアウトを設定（10秒）
                response = requests.get(base_url, params=params, headers=headers, timeout=10)
                response.encoding = response.apparent_encoding
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # カードのコンテナを取得（セレクタをより柔軟に変更）
                card_items = soup.select('div[class*="border-solid"][class*="border-t"]')
                
                if not card_items:
                    print(f"警告：{page}ページ目にカードが見つかりませんでした。")
                    continue

                for item in card_items:
                    # 1. 日本語名
                    name_tag = item.select_one('span.text-left.font-bold.text-lg')
                    if not name_tag: continue
                    name = name_tag.get_text(strip=True).strip('"')
                    
                    # 2. コスト
                    cost_list = []
                    cost_span = item.select_one('span.text-left:not(.font-bold)')
                    if cost_span:
                        for img in cost_span.find_all('img'):
                            cost_list.append(f"({img.get('alt', '')})")
                    cost_str = "".join(cost_list)
                    
                    # 3. タイプ・希少度
                    type_rarity_row = item.select_one('div.flex.justify-between:nth-of-type(2)')
                    card_type = type_rarity_row.select_one('span.w-8\\/12').get_text(strip=True) if type_rarity_row else ""
                    rarity = type_rarity_row.select_one('span:last-child').get_text(strip=True) if type_rarity_row else ""
                    
                    # 4. 効果テキスト
                    effect_div = item.select_one('div.printedText')
                    effect_text = ""
                    if effect_div:
                        for s_span in effect_div.find_all('span', class_='card-symbol'):
                            for cls in s_span.get('class', []):
                                if cls in symbol_map: s_span.replace_with(symbol_map[cls])
                        for br in effect_div.find_all('br'): br.replace_with('\n')
                        effect_text = effect_div.get_text().strip().strip('"')

                    # ファイルへの書き出し
                    f.write(f"日本語名：{name}\n")
                    if "土地" not in card_type:
                        f.write(f"　コスト：{cost_str}\n")
                    f.write(f"　タイプ：{card_type}\n")
                    f.write(f"{effect_text}\n")
                    f.write(f"イラスト：(一覧に記載なし)\n")
                    f.write(f"　セット：{set_name_jp}\n")
                    f.write(f"　稀少度：{rarity}\n")
                    f.write("-" * 30 + "\n")
                    
                    print(f"完了：{name}") # 進捗を表示
                
                time.sleep(1) # サーバー負荷軽減用
                
            except Exception as e:
                print(f"エラーが発生しました: {e}")
                break

    print(f"\nすべての処理が完了しました！")
    print(f"保存先: {output_file}")

if __name__ == "__main__":
    scrape_mtg_cards()