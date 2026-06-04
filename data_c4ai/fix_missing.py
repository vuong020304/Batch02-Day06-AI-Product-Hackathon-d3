"""
fix_missing.py — Re-parse drugs missing chi_dinh / tac_dung_phu from crawl4ai cache.
Chay lai: python fix_missing.py
"""

import asyncio
import json
from pathlib import Path

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl_thuoc_c4ai import parse_drug_page

INPUT = Path("data_c4ai/thuoc.jsonl")
OUTPUT = Path("data_c4ai/thuoc_fixed.jsonl")
BATCH = 10

async def main():
    # Read existing data
    drugs = []
    with open(str(INPUT), encoding="utf-8") as f:
        for line in f:
            drugs.append(json.loads(line))

    # Re-parse ALL drugs to fix substring-overwrite bug
    to_fix = drugs[:]
    fixed = []

    print(f"Total: {len(drugs)}")
    print(f"Re-parsing all from cache: {len(to_fix)}")

    if not to_fix:
        print("Nothing to fix.")
        return

    # Re-crawl from cache and re-parse
    browser_cfg = BrowserConfig(headless=True)
    run_cfg = CrawlerRunConfig(cache_mode=CacheMode.ENABLED)

    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        for i in range(0, len(to_fix), BATCH):
            batch = to_fix[i : i + BATCH]
            urls = [d["url"] for d in batch]
            results = await crawler.arun_many(urls, config=run_cfg)

            url_map = {r.url: r for r in results}

            for drug in batch:
                result = url_map.get(drug["url"])
                if result and result.success:
                    parsed = parse_drug_page(result.html, result.url)
                    if parsed:
                        # Merge: keep old fields, overwrite with new parsed data
                        drug.update(parsed)
                        fixed.append(drug)
                        continue

                # If re-parse failed, keep original data
                fixed.append(drug)

            print(f"  {min(i+BATCH, len(to_fix))}/{len(to_fix)}")

    # Write output
    with open(str(OUTPUT), "w", encoding="utf-8") as f:
        for d in fixed:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    # Stats
    chi = sum(1 for d in fixed if d.get("chi_dinh"))
    tac = sum(1 for d in fixed if d.get("tac_dung_phu"))
    both = sum(1 for d in fixed if d.get("chi_dinh") and d.get("tac_dung_phu"))
    print(f"\nDone! {OUTPUT}")
    print(f"chi_dinh: {chi}/{len(fixed)}")
    print(f"tac_dung_phu: {tac}/{len(fixed)}")
    print(f"Both: {both}/{len(fixed)}")

if __name__ == "__main__":
    asyncio.run(main())
