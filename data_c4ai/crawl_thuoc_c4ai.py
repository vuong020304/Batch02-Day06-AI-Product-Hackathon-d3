"""
crawl_thuoc_c4ai.py — Crawl 10k thuốc từ thuocbietduoc.com.vn bằng crawl4ai

Usage:
    pip install crawl4ai beautifulsoup4 lxml requests tqdm
    python crawl_thuoc_c4ai.py

Pipeline:
    Phase 1: requests + BS4 → thu thập URL danh sách (nhanh, ~15 phút)
    Phase 2: crawl4ai → crawl chi tiết từng thuốc (10k ~ 3-4 tiếng)
    Phase 3: clean → dedup + validate (vài giây)

Output: data_c4ai/
    drug_urls.txt   — Danh sách URL thu thập được
    thuoc.jsonl     — Dữ liệu thuốc đã parse (mỗi dòng 1 JSON)
    clean.jsonl     — Dữ liệu sau khi làm sạch
    progress.json   — Progress tracking (để resume nếu crash)
    failed.txt      — URL bị lỗi để retry
"""

import asyncio
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from tqdm import tqdm

# ─── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "https://thuocbietduoc.com.vn"
LISTING_URL = f"{BASE_URL}/thuoc/drgsearch.aspx"
MAX_PAGES = 2761
MAX_URLS = 10000  # Chỉ lấy 10k thuốc
BATCH_SIZE = 5
OUTPUT_DIR = Path("data_c4ai")
OUTPUT_FILE = OUTPUT_DIR / "thuoc.jsonl"
CLEAN_FILE = OUTPUT_DIR / "clean.jsonl"
URLS_FILE = OUTPUT_DIR / "drug_urls.txt"
PROGRESS_FILE = OUTPUT_DIR / "progress.json"
FAILED_FILE = OUTPUT_DIR / "failed.txt"

OUTPUT_DIR.mkdir(exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

SECTION_MAP = {
    "Chỉ định": "chi_dinh",
    "Chống chỉ định": "chong_chi_dinh",
    "Liều lượng": "lieu_dung",
    "Cách dùng": "lieu_dung",
    "Tác dụng phụ": "tac_dung_phu",
    "Tương tác thuốc": "tuong_tac",
    "Tương tác": "tuong_tac",
    "Thận trọng": "than_trong",
    "Bảo quản": "bao_quan",
    "Công dụng": "cong_dung",
    "Dược lực": "duoc_luc",
    "Dược động": "duoc_dong_hoc",
}


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1: Collect URLs
# ═══════════════════════════════════════════════════════════════════════════════

def collect_drug_urls() -> list[str]:
    if URLS_FILE.exists():
        urls = URLS_FILE.read_text(encoding="utf-8").strip().splitlines()
        print(f"[Phase 1] Đã có {len(urls)} URLs từ {URLS_FILE}")
        return urls

    urls: set[str] = set()
    empty_streak = 0

    for page in tqdm(range(1, MAX_PAGES + 1), desc="Thu thập URLs"):
        try:
            resp = requests.get(
                LISTING_URL, params={"page": page}, headers=HEADERS, timeout=15
            )
            if resp.status_code != 200:
                empty_streak += 1
                if empty_streak > 5:
                    break
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            found = 0
            for a in soup.select("a[href*='thuoc-']"):
                href = a.get("href", "")
                if re.search(r"/thuoc-\d+/[\w-]+\.aspx", href):
                    full = urljoin(BASE_URL, href)
                    if full not in urls:
                        urls.add(full)
                        found += 1

            if found == 0:
                empty_streak += 1
                if empty_streak >= 3:
                    break
            else:
                empty_streak = 0

            if len(urls) >= MAX_URLS:
                print(f"\n🏁 Đã đủ {MAX_URLS} URLs, dừng tại page {page}")
                break

            # Ghi kết quả mỗi 50 pages
            if page % 50 == 0:
                URLS_FILE.write_text("\n".join(sorted(urls)), encoding="utf-8")

            time.sleep(0.3)

        except requests.RequestException:
            empty_streak += 1
            if empty_streak > 5:
                break

    result = sorted(urls)
    URLS_FILE.write_text("\n".join(result), encoding="utf-8")
    print(f"[Phase 1] Xong: {len(result)} URLs → {URLS_FILE}")
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 2: Parse detail page
# ═══════════════════════════════════════════════════════════════════════════════

def parse_drug_page(html: str, url: str) -> dict | None:
    soup = BeautifulSoup(html, "lxml")
    drug = {"url": url}

    # ── Tên thuốc ──
    h1 = soup.select_one("h1.font-bold")
    if not h1:
        h1 = soup.select_one("h1")
    drug["ten_thuoc"] = h1.get_text(strip=True) if h1 else ""
    if not drug["ten_thuoc"]:
        return None

    # ── Sidebar quick info ──
    for card in soup.select("div.bg-gray-50.rounded-xl.border"):
        title_el = card.select_one("h2, h3, span.font-semibold")
        if not title_el:
            continue
        title = title_el.get_text(strip=True).lower()

        if "thông tin nhanh" in title:
            for item in card.select("div.flex.items-start"):
                label_el = item.select_one("div.text-xs")
                value_el = item.select_one("div.font-semibold")
                if not label_el or not value_el:
                    continue
                label = label_el.get_text(strip=True).lower()
                value = value_el.get_text(strip=True)
                if "đăng ký" in label:
                    drug["so_dang_ky"] = value
                elif "dạng bào chế" in label:
                    drug["dang_bao_che"] = value
                elif "lượt xem" in label:
                    drug["luot_xem"] = value

        elif "thành phần" in title:
            a = card.select_one("a")
            if a:
                drug["hoat_chat"] = a.get_text(strip=True)

        elif "quy cách" in title:
            text = card.get_text(" ", strip=True)
            drug["quy_cach"] = text.replace(title_el.get_text(strip=True), "").strip()

        elif "công ty" in title:
            for sub in card.select("div.bg-white.rounded-lg"):
                a = sub.select_one("a")
                if not a:
                    continue
                name = a.get_text(strip=True).split(" - ")[0].strip()
                roles = sub.get_text(" ", strip=True).lower()
                if "sản xuất" in roles:
                    drug["nha_san_xuat"] = name
                elif "đăng ký" in roles:
                    drug["nha_dang_ky"] = name

    # ── Content sections (compact card: h2 + p siblings) ──
    content_card = soup.select_one("div.prose.w-full.mb-6 div.bg-white.rounded-xl")
    if not content_card:
        content_card = soup.select_one("div.prose.w-full.mb-6")
    if content_card:
        current_label = None
        current_parts = []

        for child in content_card.children:
            if child.name == "h2":
                if current_label:
                    for label, key in SECTION_MAP.items():
                        if current_label.lower().startswith(label.lower()):
                            drug[key] = "\n".join(current_parts).strip()
                            break
                current_label = child.get_text(strip=True)
                current_parts = []
            elif current_label:
                if child.name in ("p", "div", "ul", "ol", "blockquote"):
                    text = child.get_text(strip=True)
                    if text:
                        current_parts.append(text)
                elif isinstance(child, str):
                    text = child.strip()
                    if text:
                        current_parts.append(text)

        if current_label:
            for label, key in SECTION_MAP.items():
                if current_label.lower().startswith(label.lower()):
                    drug[key] = "\n".join(current_parts).strip()
                    break

    # ── Bonus: active ingredient sections (Part B) ──
    for section in soup.select("div.space-y-6 div.rounded-xl"):
        h3 = section.select_one("h3")
        prose = section.select_one("div.prose")
        if not h3 or not prose:
            continue
        h3_text = h3.get_text(strip=True)
        content = prose.get_text(strip=True)
        for label, key in SECTION_MAP.items():
            if label.lower() in h3_text.lower() and key not in drug:
                drug[key] = content
                break

    # ── Bonus: "Công dụng" section (separate card) ──
    cong_dung_tag = soup.select_one("#cong-dung-thuoc")
    if cong_dung_tag:
        h3 = cong_dung_tag.select_one("h3")
        prose = cong_dung_tag.select_one("div.prose")
        if h3 and prose:
            if "cong_dung" not in drug:
                drug["cong_dung"] = prose.get_text(strip=True)
            if "chi_dinh" not in drug:
                drug["chi_dinh"] = prose.get_text(strip=True)

    return drug


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 2: Crawl details with crawl4ai
# ═══════════════════════════════════════════════════════════════════════════════

async def crawl_details(urls: list[str]):
    done_urls: set[str] = set()
    if PROGRESS_FILE.exists():
        done_urls = set(json.loads(PROGRESS_FILE.read_text(encoding="utf-8")))
        print(f"[Phase 2] Resume: {len(done_urls)} URLs đã crawl")

    pending = [u for u in urls if u not in done_urls]
    print(f"[Phase 2] Cần crawl: {len(pending)} URLs")

    if not pending:
        print("[Phase 2] Không có URL mới. Skip.")
        return

    browser_cfg = BrowserConfig(headless=True)
    run_cfg = CrawlerRunConfig(cache_mode=CacheMode.ENABLED)

    failed: list[str] = []

    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        with open(str(OUTPUT_FILE), "a", encoding="utf-8") as f:
            for i in range(0, len(pending), BATCH_SIZE):
                batch = pending[i : i + BATCH_SIZE]
                results = await crawler.arun_many(batch, config=run_cfg)

                for result in results:
                    if result.success:
                        drug = parse_drug_page(result.html, result.url)
                        if drug:
                            f.write(json.dumps(drug, ensure_ascii=False) + "\n")
                            f.flush()
                        else:
                            failed.append(result.url)
                    else:
                        failed.append(result.url)

                    done_urls.add(result.url)

                PROGRESS_FILE.write_text(
                    json.dumps(sorted(done_urls), ensure_ascii=False), encoding="utf-8"
                )

                print(
                    f"  {min(i + BATCH_SIZE, len(pending))}/{len(pending)} "
                    f"| OK: {len(done_urls) - len(failed)} | Lỗi: {len(failed)}"
                )

    if failed:
        FAILED_FILE.write_text("\n".join(failed), encoding="utf-8")
        print(f"[Phase 2] ❌ {len(failed)} URLs lỗi → {FAILED_FILE}")

    print(f"[Phase 2] ✅ Hoàn thành: {len(done_urls) - len(failed)} thuốc")
    print(f"   Dữ liệu: {OUTPUT_FILE}")


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3: Clean data
# ═══════════════════════════════════════════════════════════════════════════════

def clean_data():
    if not OUTPUT_FILE.exists():
        print("[Phase 3] Không tìm thấy output file. Skip.")
        return

    REQUIRED = ["ten_thuoc"]
    seen: set[str] = set()
    kept = dropped = 0

    with (
        open(str(OUTPUT_FILE), encoding="utf-8") as fin,
        open(str(CLEAN_FILE), "w", encoding="utf-8") as fout,
    ):
        for line in fin:
            drug = json.loads(line)
            name = drug.get("ten_thuoc", "").strip()

            if not name or name in seen:
                dropped += 1
                continue

            seen.add(name)
            fout.write(json.dumps(drug, ensure_ascii=False) + "\n")
            kept += 1

    print(f"[Phase 3] ✅ Giữ: {kept} | 🗑️ Bỏ: {dropped} → {CLEAN_FILE}")


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    print("=" * 60)
    print("  Crawl thuốc từ thuocbietduoc.com.vn")
    print("  Pipeline: Collect URLs → Crawl → Clean")
    print("=" * 60)

    urls = collect_drug_urls()
    print(f"\n📋 Tổng URLs: {len(urls)}")

    await crawl_details(urls)
    clean_data()

    print("\n" + "=" * 60)
    print("  Hoàn thành toàn bộ pipeline!")
    print(f"  Kết quả: {CLEAN_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
