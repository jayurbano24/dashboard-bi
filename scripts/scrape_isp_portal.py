#!/usr/bin/env python3
"""Scrape Xiaomi ISP Portal (isplatin.crm2.dynamics.com) daily.

Extrae todos los Service Orders registrados en el portal ISP y los guarda
(upsert) en la tabla `xiaomi_isp_cases` de Supabase.

Dependencias:
    pip install playwright python-dotenv supabase
    playwright install chromium

Variables de entorno (.env.local):
    ISP_PORTAL_URL          https://isplatin.crm2.dynamics.com
    ISP_PORTAL_USER         usuario@dominio.com
    ISP_PORTAL_PASSWORD     ****
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

Uso:
    # Primera vez (guarda sesión manualmente):
    python scripts/scrape_isp_portal.py --login

    # Ejecución diaria automática:
    python scripts/scrape_isp_portal.py
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
AUTH_STATE_FILE = SCRIPT_DIR / ".isp_auth_state.json"
ENV_FILE = Path(__file__).parent.parent / ".env.local"

def _load_env_file(path: Path) -> dict[str, str]:
    """Parse a .env / .env.local file manually, handling quoted values."""
    result: dict[str, str] = {}
    if not path.exists():
        return result
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():  # utf-8-sig strips BOM
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        result[key] = val
    return result


_dotenv_vals = _load_env_file(ENV_FILE)


def _env(key: str) -> str:
    """Get env var from .env.local first, then os.environ, stripping quotes."""
    val = _dotenv_vals.get(key) or os.getenv(key, "")
    return val.strip().strip('"').strip("'")


ISP_PORTAL_URL  = _env("ISP_PORTAL_URL") or "https://isplatin.crm2.dynamics.com"
ISP_USER        = _env("ISP_PORTAL_USER")
ISP_PASSWORD    = _env("ISP_PORTAL_PASSWORD")
SUPABASE_URL    = _env("NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
SUPABASE_KEY    = _env("SUPABASE_SERVICE_ROLE_KEY")

# Columnas que queremos capturar (etiquetas visibles en la tabla del portal)
TARGET_COLUMNS = [
    "Service Order Number",
    "Service Type",
    "Acceptance Time",
    "Creation Time",
    "Service Order Status",
    "Lv1 Model",
    "OOW/IW",
]

# Direct URL to the Service Order entity list view
# (captured from portal navigation, stable as long as the view is not recreated)
SERVICE_ORDER_LIST_URL = (
    "https://isplatin.crm2.dynamics.com/main.aspx"
    "?appid=c8fdf64d-9402-48e7-acc2-2713892fa55b"
    "&forceUCI=1"
    "&pagetype=entitylist"
    "&etn=new_srv_productline"
    "&viewid=d16d500e-d911-47b6-a1c7-173d75b6d1f2"
    "&viewType=1039"
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def upsert_cases(cases: list[dict]) -> int:
    """Upsert cases into xiaomi_isp_cases via Supabase REST API."""
    import urllib.request

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    if not cases:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/xiaomi_isp_cases?on_conflict=service_order_number"
    payload = json.dumps(cases).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
    )
    with urllib.request.urlopen(req) as resp:
        status = resp.status
    if status not in (200, 201):
        raise RuntimeError(f"Supabase upsert failed with status {status}")
    log.info("Upserted %d cases to Supabase.", len(cases))
    return len(cases)


# ---------------------------------------------------------------------------
# Portal navigation helpers
# ---------------------------------------------------------------------------

def _parse_date(raw: str) -> str | None:
    """Try to parse a date string into ISO format; return None on failure."""
    if not raw or raw.strip() in ("", "---", "N/A"):
        return None
    raw = raw.strip()
    for fmt in (
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%Y %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%d/%m/%Y %H:%M",
        "%m/%d/%Y",
    ):
        try:
            return datetime.strptime(raw, fmt).isoformat()
        except ValueError:
            continue
    return raw  # keep original if unparseable


def _row_to_record(row: dict[str, str]) -> dict[str, Any]:
    """Convert a scraped table row dict into a Supabase-ready record."""
    return {
        "service_order_number": row.get("Service Order Number", "").strip(),
        "service_type":         row.get("Service Type", "").strip() or None,
        "acceptance_time":      _parse_date(row.get("Acceptance Time", "")),
        "creation_time":        _parse_date(row.get("Creation Time", "")),
        "service_order_status": row.get("Service Order Status", "").strip() or None,
        "lv1_model":            row.get("Lv1 Model", "").strip() or None,
        "oow_iw":               row.get("OOW/IW", "").strip() or None,
        "raw":                  json.dumps(row),
        "scraped_at":           datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Playwright scraping
# ---------------------------------------------------------------------------

TABLE_SELECTORS = [
    "table[data-id='entity-view-table']",
    "div[data-type='grid']",
    "table.ms-List-table",
    "[role='grid']",
    "div.wj-flexgrid",
    "table",  # broadest fallback
]

HEADER_SELECTORS = [
    "{tbl} thead th",
    "{tbl} div[role='columnheader']",
    "{tbl} .wj-colheaders .wj-cell",
    "{tbl} th",
]

ROW_SELECTORS = [
    "{tbl} tbody tr",
    # Dynamics 365 UCI entity list: data rows have data-id attribute
    "{tbl} div[role='row'][data-id]",
    # Fallback: any row that is NOT the header row
    "{tbl} div[role='row']:not([data-type='header']):not([aria-selected='false'][data-id=''])",
    "{tbl} .wj-row:not(.wj-header)",
    "{tbl} tr:not(:first-child)",
]

# Column header name normalization: strip icons, sort markers, parenthetical suffixes
_ICON_RE = re.compile(r'[\ue000-\uf8ff\U000f0000-\U000fffff]')  # private use area (icons)
_PARENS_RE = re.compile(r'\s*\([^)]+\)\s*$')  # trailing (Some Text)


def _clean_header(raw: str) -> str:
    """Normalize a column header label from the CRM grid."""
    text = _ICON_RE.sub('', raw)          # remove icon characters
    text = text.replace('\n', ' ').strip()  # flatten multiline
    text = _PARENS_RE.sub('', text).strip() # remove trailing parenthetical
    return text


# Mapping from cleaned CRM header → our schema field (flexible partial match)
HEADER_FIELD_MAP: dict[str, str] = {
    "Service Order":          "Service Order Number",
    "Service Order Number":   "Service Order Number",
    "Service Mode":           "Service Type",
    "Service Type":           "Service Type",
    "Acceptance Time":        "Acceptance Time",
    "Service Order Status":   "Service Order Status",
    "Status":                 "Service Order Status",
    "OOW/IW":                 "OOW/IW",
    "Lv1 Model":              "Lv1 Model",
    "Commodity Archives":     "Lv1 Model",
    "Creation Time":          "Creation Time",
    "Create Time":            "Creation Time",
}


def _map_header(cleaned: str) -> str:
    """Return canonical field name or the cleaned header as-is."""
    # Exact match first
    if cleaned in HEADER_FIELD_MAP:
        return HEADER_FIELD_MAP[cleaned]
    # Partial match
    for key, val in HEADER_FIELD_MAP.items():
        if key.lower() in cleaned.lower():
            return val
    return cleaned


def _find_table_selector(page: Any, timeout: int = 30_000) -> str | None:
    """Return the first table selector that exists on the page."""
    for sel in TABLE_SELECTORS:
        try:
            page.wait_for_selector(sel, timeout=timeout if sel == TABLE_SELECTORS[0] else 3_000)
            count = page.locator(sel).count()
            if count > 0:
                log.info("Found table with selector: %s (%d element(s))", sel, count)
                return sel
        except Exception:
            continue
    return None


def scrape_order_list(page: Any, debug: bool = False) -> list[dict[str, str]]:
    """Navigate directly to the Service Order entity list and extract all rows."""
    log.info("Navigating directly to Service Order entity list URL...")
    page.goto(SERVICE_ORDER_LIST_URL, wait_until="domcontentloaded", timeout=60_000)

    # Wait for the UCI grid to appear — Dynamics 365 renders it asynchronously
    grid_sel = "div[data-type='grid']"
    try:
        page.wait_for_selector(grid_sel, timeout=30_000)
        # Extra wait for rows to render inside the grid
        page.wait_for_timeout(4_000)
    except Exception:
        log.warning("Grid not found after 30s, attempting anyway...")

    if debug:
        debug_path = SCRIPT_DIR / "_isp_debug.html"
        debug_path.write_text(page.content(), encoding="utf-8")
        page.screenshot(path=str(SCRIPT_DIR / "_isp_debug.png"), full_page=True)
        log.info("DEBUG: HTML saved. URL: %s", page.url)

    # Use JavaScript evaluate to reliably extract grid headers + all data rows.
    # Dynamics 365 UCI uses role='columnheader' for headers and role='gridcell' for cells.
    js_result: list[dict[str, str]] = page.evaluate(r"""
        () => {
            const grid = document.querySelector("div[data-type='grid']");
            if (!grid) return { headers: [], rows: [] };

            // Headers — strip icon characters and normalize
            const headerEls = [...grid.querySelectorAll("[role='columnheader']")];
            const headers = headerEls.map(h => {
                let t = h.innerText || h.textContent || '';
                t = t.replace(/[\uE000-\uF8FF\u{F0000}-\u{FFFFF}]/gu, '');  // remove PUA icons
                t = t.replace(/\n.*/s, '');          // keep only first line
                return t.trim();
            });

            // Rows — select all rows that contain grid cells (skip header rows)
            const allRows = [...grid.querySelectorAll("[role='row']")];
            const dataRows = allRows.filter(r =>
                r.querySelector("[role='gridcell']") !== null
            );

            const rows = dataRows.map(row => {
                const cells = [...row.querySelectorAll("[role='gridcell']")];
                const obj = {};
                cells.forEach((cell, i) => {
                    const key = headers[i] || ('col_' + i);
                    obj[key] = (cell.innerText || cell.textContent || '').trim();
                });
                return obj;
            });

            return { headers, rows };
        }
    """)

    raw_headers: list[str] = js_result.get("headers", []) if isinstance(js_result, dict) else []
    raw_rows: list[dict] = js_result.get("rows", []) if isinstance(js_result, dict) else []

    log.info("JS extract: %d headers, %d rows", len(raw_headers), len(raw_rows))
    if raw_headers:
        log.info("  Headers: %s", [_map_header(_clean_header(h)) for h in raw_headers])

    # Remap headers to canonical names
    mapped_rows: list[dict[str, str]] = []
    for row in raw_rows:
        mapped: dict[str, str] = {}
        for raw_col, val in row.items():
            mapped[_map_header(_clean_header(raw_col))] = val
        mapped_rows.append(mapped)

    # Pagination: check for a "next page" button and continue scraping
    all_rows = [r for r in mapped_rows if r.get("Service Order Number", "").strip()]
    log.info("Page 1: %d valid rows", len(all_rows))
    page_num = 2

    while True:
        # Dynamics 365 entity list pager
        next_btns = page.locator(
            "button[data-id='moveToNextPageButton'], "
            "button[aria-label='Next Page'], "
            "button[title='Next Page']"
        )
        try:
            nb = next_btns.first
            if not nb.is_visible(timeout=2_000) or not nb.is_enabled():
                break
        except Exception:
            break

        nb.click()
        page.wait_for_timeout(3_000)

        page_result = page.evaluate(r"""
            () => {
                const grid = document.querySelector("div[data-type='grid']");
                if (!grid) return [];
                const allRows = [...grid.querySelectorAll("[role='row']")];
                const headers = [...grid.querySelectorAll("[role='columnheader']")]
                    .map(h => (h.innerText || '').replace(/[\uE000-\uF8FF]/g, '').split('\n')[0].trim());
                return allRows
                    .filter(r => r.querySelector("[role='gridcell']"))
                    .map(row => {
                        const cells = [...row.querySelectorAll("[role='gridcell']")];
                        const obj = {};
                        cells.forEach((c, i) => { obj[headers[i] || 'col_'+i] = (c.innerText||'').trim(); });
                        return obj;
                    });
            }
        """)

        page_rows = [page_result] if isinstance(page_result, dict) else (page_result or [])
        mapped_page = []
        for row in page_rows:
            mapped: dict[str, str] = {}
            for raw_col, val in row.items():
                mapped[_map_header(_clean_header(raw_col))] = val
            if mapped.get("Service Order Number", "").strip():
                mapped_page.append(mapped)

        if not mapped_page:
            break
        all_rows.extend(mapped_page)
        log.info("Page %d: +%d rows (total %d)", page_num, len(mapped_page), len(all_rows))
        page_num += 1

    log.info("Total rows scraped: %d", len(all_rows))
    return all_rows


# ---------------------------------------------------------------------------
# Login flow
# ---------------------------------------------------------------------------

def login_and_save(playwright: Any) -> None:
    """Open a visible browser, let the user log in manually, then save the auth state."""
    browser = playwright.chromium.launch(headless=False)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.goto(ISP_PORTAL_URL)

    log.info("=============================================================")
    log.info("Please log in manually in the browser window that just opened.")
    log.info("After you are fully logged in and see the ISP Portal home,")
    log.info("press ENTER here to save the session.")
    log.info("=============================================================")
    input("Press ENTER after logging in...")

    ctx.storage_state(path=str(AUTH_STATE_FILE))
    log.info("Auth state saved to %s", AUTH_STATE_FILE)
    browser.close()


def run_scrape(playwright: Any, headless: bool = True, debug: bool = False) -> int:
    """Run the daily scrape using saved auth state."""
    if not AUTH_STATE_FILE.exists():
        log.error(
            "No auth state found at %s. "
            "Run with --login first to save a session.",
            AUTH_STATE_FILE,
        )
        sys.exit(1)

    browser = playwright.chromium.launch(headless=headless)
    ctx = browser.new_context(storage_state=str(AUTH_STATE_FILE))
    page = ctx.new_page()

    try:
        page.goto(ISP_PORTAL_URL, wait_until="domcontentloaded", timeout=60_000)
        # Dynamics 365 never reaches networkidle — wait for the nav/sidebar instead
        try:
            page.wait_for_selector("nav, .ms-Nav, [data-id='navbar-container']", timeout=30_000)
        except Exception:
            pass  # continue anyway; URL check will catch expired sessions

        # Detect if we got redirected to a login page
        if "login" in page.url.lower() or "signin" in page.url.lower():
            browser.close()
            log.error(
                "Session has expired. Run with --login to refresh authentication."
            )
            sys.exit(2)

        raw_rows = scrape_order_list(page, debug=debug)

    finally:
        browser.close()

    if not raw_rows:
        log.warning("No rows scraped. Nothing to upsert.")
        return 0

    # Filter rows that have a Service Order Number
    records = [
        _row_to_record(r)
        for r in raw_rows
        if r.get("Service Order Number", "").strip()
    ]

    log.info("Preparing %d records for upsert...", len(records))
    return upsert_cases(records)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape Xiaomi ISP Portal daily")
    parser.add_argument(
        "--login",
        action="store_true",
        help="Open browser for manual login and save session state",
    )
    parser.add_argument(
        "--headful",
        action="store_true",
        help="Run in headful (visible) mode even for automated scrape",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Save page HTML and screenshot for selector debugging",
    )
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log.error("playwright is not installed. Run: pip install playwright ; playwright install chromium")
        sys.exit(1)

    with sync_playwright() as pw:
        if args.login:
            login_and_save(pw)
        else:
            count = run_scrape(pw, headless=not args.headful, debug=args.debug)
            log.info("Done. %d cases upserted.", count)


if __name__ == "__main__":
    main()
