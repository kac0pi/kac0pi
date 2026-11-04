#!/usr/bin/env python3
"""Build posts/posts.json from Markdown files with simple YAML front matter."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "posts"
items = []
for path in sorted(POSTS.glob("*.md")):
    raw = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n?", raw, re.S)
    meta = {}
    if match:
        lines = match.group(1).splitlines()
        current_list = None
        for line in lines:
            if line.startswith("  - ") and current_list:
                meta.setdefault(current_list, []).append(line[4:].strip().strip('"\''))
            elif ":" in line:
                key, value = line.split(":", 1)
                key, value = key.strip(), value.strip()
                if not value:
                    current_list = key
                    meta[key] = []
                else:
                    current_list = None
                    meta[key] = value.strip('"\'')
    title = meta.get("title", path.stem)
    description = meta.get("description", "")
    tags = meta.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    items.append({
        "slug": path.stem, "title": title, "description": description,
        "date": meta.get("date", ""), "tags": tags,
        "category": meta.get("category", "IT"),
        "file": f"posts/{path.name}"
    })
(POSTS / "posts.json").write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Built index for {len(items)} posts")
