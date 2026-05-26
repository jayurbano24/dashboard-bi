#!/usr/bin/env python3
"""Generate Xiaomi ISP upload file from real operational exports.

Reads three real files:
1) Orders export
2) Malfunction mapping export
3) Parts catalog export

Applies Xiaomi rules and generates .xlsx + .csv with exact ISP uploader columns.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import pandas as pd

DEFAULT_ORDERS_FILE = r"C:\Users\Usuario01\Downloads\Created orders.xls"
DEFAULT_FAULT_MAP_FILE = r"C:\Users\Usuario01\Downloads\Available Malfunction and Category Mapping 4-25-2026 3-02-39 PM.xlsx"
DEFAULT_PARTS_FILE = r"C:\Users\Usuario01\Downloads\Active Service Material Inventory Details 6-23-2025 1-31-30 PM.xlsx"
DEFAULT_OUTPUT_DIR = r"C:\Users\Usuario01\Downloads\isp_claims_output"

ISP_SC_CODE = "GTM00010"
SERVICE_CENTER_CODE = "GT-TCW-MSC-Guatemala"
DEFAULT_CUSTOMER_EMAIL = "recepcion_gt@mi.com"
DEFAULT_COUNTRY = "GT"
DEFAULT_SERVICE_STATION = "TechCorps Guatemala"

CRITICAL_COLUMNS: List[str] = [
    "operator_service_order_number",
    "ISP_SC_code",
    "goods_id",
    "SN_Or_IMEI1",
    "create_time",
    "repair_start_time",
    "Level_3_malfunction_code",
    "processing_method_code",
]

BASE_OUTPUT_COLUMNS: List[str] = [
    "service_order_status",
    "Third_service_order_number",
    "operator_service_order_number",
    "ISP_SC_code",
    "service_center_code",
    "customer_email",
    "PO_number",
    "dealer_name",
    "customer_type",
    "service_mode",
    "service_type",
    "Return_type",
    "Return_warehouse_type",
    "service_subtype",
    "IW_OOW",
    "Appearance_Damage",
    "Malfunction_Description",
    "invoice_number",
    "invoice_time",
    "goods_id",
    "SN_Or_IMEI1",
    "newSN",
    "new_IMEI",
    "Is_user_damange",
    "create_time",
    "SC_express_receipt_time",
    "actual_visit_time",
    "repair_start_time",
    "parts_apply_time",
    "parts_arrive_time",
    "material_shortage_time",
    "repair_finish_time",
    "deliver_back_to_user_time",
    "close_time",
    "receive_AWB",
    "delivery_AWB",
    "Level_3_malfunction_code",
    "processing_method_code",
    "Activity_Project",
    "remark",
    "defect_description",
    "Goodid",
    "B2B",
    "old_PN1",
    "old_SN1",
    "old_IMEI1",
    "new_PN1",
    "new_SN1",
    "new_IMEI1",
    "old_PN2",
    "old_SN2",
    "old_IMEI2",
    "new_PN2",
    "new_SN2",
    "new_IMEI2",
    "old_PN3",
    "old_SN3",
    "old_IMEI3",
    "new_PN3",
    "new_SN3",
    "new_IMEI3",
    "old_PN4",
    "new_PN4",
    "old_PN5",
    "new_PN5",
    "old_PN6",
    "new_PN6",
    "old_PN7",
    "new_PN7",
    "old_PN8",
    "new_PN8",
    "old_PN9",
    "new_PN9",
    "old_PN10",
    "new_PN10",
]

KEYWORD_CODE_FALLBACK: List[Tuple[str, str, str]] = [
    ("NO ENCIENDE", "MP00FUN0106", "Power on failure"),
    ("POWER ON", "MP00FUN0106", "Power on failure"),
    ("CARGA", "MP00FUN1801", "Charging fault"),
    ("CHARGING", "MP00FUN1801", "Charging fault"),
    ("TOUCH", "MP00FUN1101", "Touch screen failure"),
    ("PANTALLA", "MP00FUN1101", "Touch screen failure"),
    ("IMAGEN", "PA00FUN0401", "Display blurred/abnormal"),
    ("DISPLAY", "PA00FUN0401", "Display blurred/abnormal"),
    ("AUDIO", "MP00FUN0503", "Speaker no voice"),
    ("SPEAKER", "MP00FUN0503", "Speaker no voice"),
]

MAINBOARD_KEYWORDS = ["MAINBOARD", "MOTHERBOARD", "BOARD", "PCBA", "PLACA", "TARJETA MADRE"]


class SchemaError(RuntimeError):
    """Raised when an input file is missing required structure."""


def normalize_text(value: object) -> str:
    text = clean_text(value)
    return text.upper()


def clean_text(value: object) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "nat"}:
        return ""
    return text


def ensure_68_columns(base_columns: List[str]) -> List[str]:
    cols = list(dict.fromkeys(base_columns))
    if len(cols) != len(base_columns):
        raise ValueError("Output column definition contains duplicated column names.")
    return cols


OUTPUT_COLUMNS = ensure_68_columns(BASE_OUTPUT_COLUMNS)


def setup_logging(output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    log_path = output_dir / f"xiaomi_claims_generation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    logging.info("Logging initialized")
    return log_path


def pick_sheet(path: Path, preferred_contains: str) -> str:
    excel_file = pd.ExcelFile(path)
    for sheet in excel_file.sheet_names:
        if preferred_contains.lower() in sheet.lower():
            return sheet
    return excel_file.sheet_names[0]


def load_orders(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Orders file not found: {path}")

    sheet_name = pick_sheet(path, "List")
    df = pd.read_excel(path, sheet_name=sheet_name)

    required = [
        "Orden #",
        "Creado en",
        "Estado",
        "Marca del dispositivo",
        "Modelo de dispositivo",
        "Grupo de dispositivos",
        "Número de serie",
        "Servicios/Obras",
        "Productos",
    ]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise SchemaError(f"Orders file missing required columns: {missing}")

    logging.info("Loaded orders rows: %s (sheet: %s)", len(df), sheet_name)
    return df


def load_fault_map(path: Path) -> List[Tuple[str, str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Fault mapping file not found: {path}")

    sheet_name = pick_sheet(path, "Malfunction")
    df = pd.read_excel(path, sheet_name=sheet_name)

    code_col = next((c for c in df.columns if "Level 3 malfunction code" in str(c)), None)
    text_col = next((c for c in df.columns if str(c).strip() == "Level 3 malfunction"), None)
    if not code_col or not text_col:
        raise SchemaError("Fault mapping file does not contain Level 3 malfunction columns.")

    rows: List[Tuple[str, str, str]] = []
    for _, row in df.iterrows():
        code = clean_text(row.get(code_col, ""))
        text = clean_text(row.get(text_col, ""))
        if code and text:
            rows.append((normalize_text(text), code, text))

    logging.info("Loaded malfunction mappings: %s", len(rows))
    return rows


def load_parts_catalog(path: Path) -> Tuple[pd.DataFrame, Dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Parts file not found: {path}")

    sheet_name = pick_sheet(path, "Service Material")
    df = pd.read_excel(path, sheet_name=sheet_name)

    part_col = next((c for c in df.columns if str(c).strip() == "Part"), None)
    if not part_col:
        raise SchemaError("Parts file missing 'Part' column.")

    mapping: Dict[str, str] = {}
    for _, row in df.iterrows():
        part = str(row.get(part_col, "") or "").strip()
        if not part:
            continue

        key = normalize_text(part)
        sku_match = re.search(r"([A-Z0-9-]{5,})", part.upper())
        mapping[key] = sku_match.group(1) if sku_match else key.replace(" ", "-")[:24]

    logging.info("Loaded parts catalog rows: %s", len(df))
    return df, mapping


def parse_date(value: object) -> datetime | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value

    text = str(value).strip()
    if not text:
        return None

    for fmt in ("%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    parsed = pd.to_datetime(text, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.to_pydatetime()


def format_date(value: datetime | None) -> str:
    if value is None or pd.isna(value):
        return ""
    return value.strftime("%Y-%m-%d")


def format_datetime(value: datetime | None) -> str:
    if value is None or pd.isna(value):
        return ""
    return value.strftime("%m/%d/%Y %I:%M:%S %p")


def is_xiaomi_brand(value: object) -> bool:
    return "XIAOMI" in normalize_text(value)


def passed_quality_control(row: pd.Series) -> bool:
    status = normalize_text(row.get("Estado", ""))
    services = normalize_text(row.get("Servicios/Obras", ""))

    qc_markers = ["CONTROL DE CALIDAD", "CALIDAD", " QA", "OQC", "IQC"]
    has_qc_keyword = any(marker in f" {status} " or marker in f" {services} " for marker in qc_markers)

    completed = parse_date(row.get("Completado en")) is not None
    closed = normalize_text(row.get("Cerrado", "")) in {"TRUE", "SI", "YES", "1", "CERRADO"}

    return has_qc_keyword or completed or closed


def has_spare_parts(products_text: str) -> bool:
    return bool(products_text and products_text.strip() and normalize_text(products_text) not in {"NAN", "NONE", "SIN PRODUCTO", "SIN SKU"})


def is_mainboard_repair(*texts: str) -> bool:
    combined = normalize_text(" ".join(texts))
    return any(keyword in combined for keyword in MAINBOARD_KEYWORDS)


def infer_service_type_and_processing_method(
    products_text: str,
    services_text: str,
    verdict_text: str,
    notes_text: str,
) -> Tuple[str, str]:
    with_parts = has_spare_parts(products_text)
    if not with_parts:
        return "Inspection", "3001"

    if is_mainboard_repair(products_text, services_text, verdict_text, notes_text):
        return "Repair", "5101"
    return "Repair", "5001"


def infer_level3_code(fault_text: str, mappings: List[Tuple[str, str, str]]) -> Tuple[str, bool, str]:
    norm = normalize_text(fault_text)

    for desc_norm, code, desc_original in mappings:
        if desc_norm and (desc_norm in norm or norm in desc_norm):
            return code, False, desc_original

        tokens = [token for token in re.split(r"[^A-Z0-9]+", desc_norm) if len(token) >= 5]
        if not tokens:
            continue
        if all(token in norm for token in tokens[:2]):
            return code, False, desc_original

    for keyword, code, description in KEYWORD_CODE_FALLBACK:
        if keyword in norm:
            return code, True, description

    return "MP099-GEN", True, "Generic malfunction"


def infer_damage_flag(*texts: str) -> str:
    combined = normalize_text(" ".join(texts))
    explicit_yes = ["USER DAMAGE: YES", "DANO USUARIO: SI", "DANO USUARIO SI", "DANO ESTETICO: SI", "APPEARANCE DAMAGE: YES"]
    return "Yes" if any(token in combined for token in explicit_yes) else "No"


def find_first_email(*texts: object) -> str:
    email_regex = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
    for value in texts:
        candidate = clean_text(value)
        if not candidate:
            continue
        match = email_regex.search(candidate)
        if match:
            return match.group(0)
    return DEFAULT_CUSTOMER_EMAIL


def extract_new_mainboard_imei(row: pd.Series) -> str:
    for key in row.index:
        key_norm = normalize_text(str(key))
        if "IMEI" not in key_norm:
            continue
        if "NEW" not in key_norm and "NUEVO" not in key_norm:
            continue

        digits = re.sub(r"\D", "", clean_text(row.get(key)))
        if 14 <= len(digits) <= 17:
            return digits[:15]
    return ""


def resolve_part_code(raw_part: str, part_lookup: Dict[str, str]) -> str:
    key = normalize_text(raw_part)
    if key in part_lookup:
        return part_lookup[key]

    sku_match = re.search(r"([A-Z0-9-]{5,})", raw_part.upper())
    if sku_match:
        return sku_match.group(1)
    return raw_part


def infer_warranty(created_at: datetime | None, expiry_raw: object, service_text: str) -> str:
    expiry_date = parse_date(expiry_raw)
    if created_at and expiry_date:
        return "IW" if created_at.date() <= expiry_date.date() else "OOW"

    if re.search(r"\bIW\b|GARANT", normalize_text(service_text)):
        return "IW"
    return "OOW"


def map_service_order_status(status_raw: object, completed_at: datetime | None) -> str:
    status = normalize_text(status_raw)
    if completed_at is not None or status in {"CLOSED", "CERRADO", "ENTREGADO", "FINALIZADO"}:
        return "Closed"
    return "Open"


def extract_imei(serial_raw: object) -> str:
    digits = re.sub(r"\D", "", clean_text(serial_raw))
    if 14 <= len(digits) <= 17:
        return digits[:15]
    return ""


def generate_goods_id(model: str, products: str, part_lookup: Dict[str, str]) -> str:
    products_norm = normalize_text(products)
    if products_norm in part_lookup:
        return part_lookup[products_norm]

    if products:
        tokens = [t.strip() for t in re.split(r"[|,/;]", str(products)) if t.strip()]
        for token in tokens:
            key = normalize_text(token)
            if key in part_lookup:
                return part_lookup[key]
            sku_match = re.search(r"([A-Z0-9-]{5,})", token.upper())
            if sku_match:
                return sku_match.group(1)

    model_norm = re.sub(r"[^A-Z0-9]", "", normalize_text(model))
    if model_norm:
        return f"GID-{model_norm[:20]}"

    return "GID-MISSING"


def split_spare_parts(products: object) -> str:
    text = clean_text(products)
    if not text:
        return ""
    tokens = [t.strip() for t in re.split(r"[|,/;]", text) if t.strip()]
    normalized = [re.sub(r"\s+", " ", t) for t in tokens]
    return " | ".join(dict.fromkeys(normalized))


def get_part_slots(products: object) -> List[str]:
    text = clean_text(products)
    if not text:
        return []
    tokens = [t.strip() for t in re.split(r"[|,/;]", text) if t.strip()]
    normalized = [re.sub(r"\s+", " ", t) for t in tokens]
    return list(dict.fromkeys(normalized))[:10]


def validate_output_schema(df: pd.DataFrame) -> None:
    if list(df.columns) != OUTPUT_COLUMNS:
        raise SchemaError("Output schema mismatch. Columns are not aligned to the 68-column template.")

    for col in CRITICAL_COLUMNS:
        if col not in df.columns:
            raise SchemaError(f"Missing critical output column: {col}")


def transform_orders(
    orders_df: pd.DataFrame,
    fault_mappings: List[Tuple[str, str, str]],
    part_lookup: Dict[str, str],
) -> pd.DataFrame:
    source = orders_df.copy()
    source = source[source["Marca del dispositivo"].apply(is_xiaomi_brand)]
    source = source[source.apply(passed_quality_control, axis=1)]

    logging.info("Filtered Xiaomi + QC rows: %s", len(source))

    output_rows: List[Dict[str, object]] = []

    for _, row in source.iterrows():
        created_at = parse_date(row.get("Creado en"))
        repair_start = (created_at + timedelta(hours=48)) if created_at else None
        repair_finish = (repair_start + timedelta(hours=24)) if repair_start else None

        products = clean_text(row.get("Productos", ""))
        services_text = clean_text(row.get("Servicios/Obras", ""))
        notes_text = clean_text(row.get("Notas del especialista", ""))
        verdict_text = clean_text(row.get("Veredicto / recomendaciones del cliente", ""))
        service_type, process_method = infer_service_type_and_processing_method(
            products,
            services_text,
            verdict_text,
            notes_text,
        )

        fault_text = " | ".join(
            [
                clean_text(row.get("Estado", "")),
                services_text,
                notes_text,
                verdict_text,
            ]
        )
        level3_code, auto_l3, level3_text = infer_level3_code(fault_text, fault_mappings)

        imei = extract_imei(row.get("Número de serie"))
        new_board_imei = extract_new_mainboard_imei(row)
        model = clean_text(row.get("Modelo de dispositivo", ""))
        goods_id = generate_goods_id(model=model, products=products, part_lookup=part_lookup)
        service_subtype = "On_site_pick_and_repair"
        remark = " | ".join(filter(None, [
            notes_text,
            verdict_text,
        ]))
        appearance_damage = infer_damage_flag(notes_text, verdict_text)
        is_user_damage = infer_damage_flag(notes_text, verdict_text)
        iw_oow = infer_warranty(
            created_at,
            row.get("Fecha de vencimiento"),
            f"{clean_text(row.get('Tipo de orden', ''))} {services_text}",
        )
        part_slots = get_part_slots(products)
        part_codes = [resolve_part_code(part, part_lookup) for part in part_slots]
        customer_email = find_first_email(
            row.get("Email"),
            row.get("Correo"),
            row.get("Correo electrónico"),
            row.get("Email del cliente"),
        )
        uses_mainboard = process_method == "5101"

        missing_fields = [
            col
            for col, value in {
                "SN_Or_IMEI1": imei,
                "goods_id": goods_id,
                "create_time": format_datetime(created_at),
            }.items()
            if not value
        ]

        out: Dict[str, object] = {col: "" for col in OUTPUT_COLUMNS}
        out.update(
            {
                "service_order_status": map_service_order_status(row.get("Estado", ""), completed_at),
                "Third_service_order_number": "",
                "operator_service_order_number": clean_text(row.get("Orden #", "")),
                "ISP_SC_code": ISP_SC_CODE,
                "service_center_code": SERVICE_CENTER_CODE,
                "customer_email": customer_email,
                "PO_number": "",
                "dealer_name": clean_text(row.get("Nombre del cliente", "")) or clean_text(row.get("Fuente", "")),
                "customer_type": clean_text(row.get("Pagador", "")) or "RETAILER",
                "service_mode": "Mail_In",
                "service_type": service_type,
                "Return_type": "",
                "Return_warehouse_type": "",
                "service_subtype": service_subtype,
                "IW_OOW": iw_oow,
                "Appearance_Damage": appearance_damage,
                "Malfunction_Description": level3_text,
                "invoice_number": "",
                "invoice_time": "",
                "goods_id": goods_id,
                "SN_Or_IMEI1": imei,
                "newSN": "",
                "new_IMEI": "",
                "Is_user_damange": is_user_damage,
                "create_time": format_datetime(created_at),
                "SC_express_receipt_time": format_datetime(created_at),
                "actual_visit_time": format_datetime(created_at),
                "repair_start_time": format_datetime(repair_start),
                "parts_apply_time": "",
                "parts_arrive_time": "",
                "material_shortage_time": "",
                "repair_finish_time": format_datetime(repair_finish),
                "deliver_back_to_user_time": format_datetime(repair_finish),
                "close_time": format_datetime(repair_finish),
                "receive_AWB": "",
                "delivery_AWB": "",
                "Level_3_malfunction_code": level3_code,
                "processing_method_code": process_method,
                "Activity_Project": "XIAOMI",
                "remark": remark,
                "defect_description": level3_text,
                "Goodid": goods_id,
                "B2B": "MX" if "MEXICO" in normalize_text(str(row.get("Creado en la ubicación", ""))) else "GT",
            }
        )

        if service_type == "Repair" and part_codes:
            out["old_PN1"] = part_codes[0]
            out["new_PN1"] = part_codes[0]

        for index, part_code in enumerate(part_codes, start=1):
            if index <= 10:
                out[f"new_PN{index}"] = part_code

        if uses_mainboard:
            out["old_SN1"] = imei
            out["old_IMEI1"] = imei
            out["new_SN1"] = new_board_imei
            out["new_IMEI1"] = new_board_imei

        output_rows.append(out)

    out_df = pd.DataFrame(output_rows, columns=OUTPUT_COLUMNS)
    validate_output_schema(out_df)

    logging.info("Generated output rows: %s", len(out_df))
    return out_df


def export_outputs(df: pd.DataFrame, output_dir: Path) -> Tuple[Path, Path, Path]:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    xlsx_path = output_dir / f"xiaomi_isp_upload_{ts}.xlsx"
    csv_path = output_dir / f"xiaomi_isp_upload_{ts}.csv"
    summary_path = output_dir / f"xiaomi_isp_upload_summary_{ts}.json"

    df.to_excel(xlsx_path, index=False)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")

    summary = {
        "generated_at": datetime.now().isoformat(),
        "rows": int(len(df)),
        "valid_rows": int((df["SN_Or_IMEI1"].astype(str).str.len() > 0).sum()),
        "missing_rows": int((df["SN_Or_IMEI1"].astype(str).str.len() == 0).sum()),
        "auto_repair_start": int((df["repair_start_time"].astype(str).str.len() > 0).sum()),
        "inspection_processing_method": int((df["processing_method_code"] == "3001").sum()),
        "auto_level3": int((df["Level_3_malfunction_code"] == "MP099-GEN").sum()),
        "critical_columns": CRITICAL_COLUMNS,
        "column_count": len(df.columns),
    }
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    logging.info("Exported XLSX: %s", xlsx_path)
    logging.info("Exported CSV : %s", csv_path)
    logging.info("Exported JSON: %s", summary_path)
    return xlsx_path, csv_path, summary_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate Xiaomi ISP upload files from real exports.")
    parser.add_argument("--orders", default=DEFAULT_ORDERS_FILE, help="Path to orders export (.xls/.xlsx)")
    parser.add_argument("--fault-map", default=DEFAULT_FAULT_MAP_FILE, help="Path to fault mapping export (.xlsx)")
    parser.add_argument("--parts", default=DEFAULT_PARTS_FILE, help="Path to parts catalog export (.xlsx)")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR, help="Output folder for generated files")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    output_dir = Path(args.output_dir)
    log_path = setup_logging(output_dir)

    logging.info("Using files:")
    logging.info("orders   : %s", args.orders)
    logging.info("fault-map: %s", args.fault_map)
    logging.info("parts    : %s", args.parts)

    try:
        orders_df = load_orders(Path(args.orders))
        fault_mappings = load_fault_map(Path(args.fault_map))
        _, part_lookup = load_parts_catalog(Path(args.parts))

        upload_df = transform_orders(orders_df, fault_mappings, part_lookup)
        export_outputs(upload_df, output_dir)

        logging.info("Process finished successfully.")
        logging.info("Log file: %s", log_path)
        return 0
    except Exception as exc:  # pylint: disable=broad-except
        logging.exception("Process failed: %s", exc)
        logging.error("See details in log file: %s", log_path)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
