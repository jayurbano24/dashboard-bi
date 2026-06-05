#!/usr/bin/env python3
"""Sync agencies from Orderry (or local fallback list) into Supabase.

Usage:
  python scripts/sync_agencies_to_supabase.py
  python scripts/sync_agencies_to_supabase.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, parse, request


ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT_DIR / ".env.local"
ORIGINS_ROUTE_FILE = ROOT_DIR / "src" / "app" / "api" / "despacho" / "origins" / "route.ts"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip().lstrip("\ufeff")
        value = value.strip().strip('"').strip("'")
        if key and (key not in os.environ or not os.environ.get(key)):
            os.environ[key] = value


def http_json(method: str, url: str, headers: dict[str, str], payload: Any = None) -> Any:
    data_bytes = None
    if payload is not None:
        data_bytes = json.dumps(payload).encode("utf-8")

    req = request.Request(url=url, method=method, headers=headers, data=data_bytes)
    try:
        with request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} calling {url}: {details}") from exc


def is_valid_agency_name(name: str) -> bool:
    s = name.strip()
    return 3 <= len(s) < 80 and bool(re.search(r"[A-Za-z]", s)) and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s)


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().upper())


def extract_origins_from_local_route(route_file: Path) -> list[str]:
    if not route_file.exists():
        return []

    content = route_file.read_text(encoding="utf-8", errors="ignore")
    block_match = re.search(r"const\s+ORIGINS_LIST\s*=\s*\[(.*?)\];", content, flags=re.S)
    if not block_match:
        return []

    block = block_match.group(1)
    raw_values = re.findall(r"'([^']+)'", block)
    return sorted({normalize_name(v) for v in raw_values if is_valid_agency_name(v)})


def fetch_agencies_from_orderry(api_url: str, api_key: str) -> list[str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    endpoints = [
        f"{api_url}/v2/references",
        f"{api_url}/v2/book-entries",
        f"{api_url}/v2/directories",
    ]

    for endpoint in endpoints:
        try:
            query_url = f"{endpoint}?{parse.urlencode({'limit': '200', 'page': '1'})}"
            data = http_json("GET", query_url, headers=headers)

            items = data.get("data") if isinstance(data, dict) else data
            if not isinstance(items, list) or not items:
                continue

            origen_items = [
                i
                for i in items
                if isinstance(i, dict)
                and "ORIGEN" in str(i.get("category") or i.get("group") or i.get("book") or "").upper()
            ]
            pool = origen_items if origen_items else [i for i in items if isinstance(i, dict)]

            names: list[str] = []
            for item in pool:
                name = str(item.get("name") or item.get("title") or item.get("value") or "").strip()
                if is_valid_agency_name(name):
                    names.append(normalize_name(name))

            deduped = sorted(set(names))
            if len(deduped) >= 5:
                return deduped
        except Exception:
            continue

    return []


def upsert_agencies_to_supabase(supabase_url: str, service_key: str, agencies: list[str], source: str) -> int:
    if not agencies:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "name": agency,
            "active": True,
            "source": source,
            "updated_at": now,
        }
        for agency in agencies
    ]

    url = f"{supabase_url}/rest/v1/despacho_agencies?on_conflict=name"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    result = http_json("POST", url, headers=headers, payload=rows)
    if isinstance(result, list):
        return len(result)
    return len(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync agencies to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be synced without writing")
    parser.add_argument("--source", default="orderry-script", help="Source label stored in Supabase")
    args = parser.parse_args()

    load_env_file(ENV_FILE)

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    orderry_api_url = os.getenv("ORDERRY_API_URL", "https://api.orderry.com").rstrip("/")
    orderry_api_key = os.getenv("ORDERRY_API_KEY", "")

    if not supabase_url or not service_key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    agencies: list[str] = []
    if orderry_api_key:
        agencies = fetch_agencies_from_orderry(orderry_api_url, orderry_api_key)

    if not agencies:
        agencies = extract_origins_from_local_route(ORIGINS_ROUTE_FILE)

    if not agencies:
        raise RuntimeError("Could not resolve agency list from Orderry or local fallback.")

    print(f"Resolved agencies: {len(agencies)}")
    print("Preview:", ", ".join(agencies[:10]))

    if args.dry_run:
        print("Dry-run enabled, no rows written.")
        return 0

    written = upsert_agencies_to_supabase(supabase_url, service_key, agencies, args.source)
    print(f"Upsert completed. Rows returned/written: {written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
