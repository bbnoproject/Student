from __future__ import annotations

from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "Data" / "gamejob_crawler" / "all-jobs.json"
SOURCE_URL = "https://rkdghkclgns-design.github.io/gamejob-crawler/all-jobs.json"


def main() -> None:
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(SOURCE_URL, timeout=30) as response:
        payload = response.read()
    TARGET.write_bytes(payload)
    print(f"Fetched {len(payload)} bytes")
    print(f"Saved {TARGET}")


if __name__ == "__main__":
    main()
