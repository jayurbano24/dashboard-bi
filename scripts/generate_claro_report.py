import os
import re
import sys
import argparse
import pandas as pd
from report_engine import ReportEngine

def find_file(filename_pattern):
    """Searches in current dir, parent dir, Desktop, and Downloads folders."""
    search_paths = [
        ".",
        "..",
        os.path.expanduser("~/Desktop"),
        os.path.expanduser("~/Downloads"),
        "C:/Users/Usuario01/Desktop",
        "C:/Users/Usuario01/Downloads"
    ]
    for path in search_paths:
        if not os.path.exists(path):
            continue
        try:
            for file in os.listdir(path):
                if re.search(filename_pattern, file, re.IGNORECASE):
                    return os.path.join(path, file)
        except Exception:
            pass
    return None

def main():
    parser = argparse.ArgumentParser(description="Motor de Reporte Avanzado para Claro")
    parser.add_argument("--orders", help="Ruta del archivo de órdenes (ej. Órdenes creadas (9).xls)")
    parser.add_argument("--directory", help="Ruta del directorio de CACs (ej. Directorio Completo Cacs GT Junio 2026 pp.xlsx)")
    parser.add_argument("--template", default="PLANTILLA_CLARO_MENSUAL", choices=["PLANTILLA_CLARO_MENSUAL", "TCW_MASTER"], help="Plantilla del reporte")
    parser.add_argument("--region", default="TODOS", choices=["TODOS", "GAM", "NO GAM"], help="Filtro regional")
    parser.add_argument("--format", default="csv", choices=["csv", "xlsx"], help="Formato de salida")
    parser.add_argument("--output", help="Ruta del archivo de salida")

    args = parser.parse_args()

    # Resolver rutas automáticas si no se especifican
    orders_path = args.orders or find_file(r"órdenes\s*creadas") or find_file(r"ordenes\s*creadas")
    dir_path = args.directory or find_file(r"directorio\s*completo\s*cacs")

    if not orders_path:
        print("ERROR: No se encontró el archivo de órdenes. Por favor especifíquelo con --orders")
        sys.exit(1)
    if not dir_path:
        print("WARNING: No se encontró el archivo de directorio de tiendas. Se usará el directorio local predefinido.")

    print(f"-> Cargando órdenes desde: {orders_path}")
    if dir_path:
        print(f"-> Cargando directorio desde: {dir_path}")

    # Cargar órdenes
    try:
        if orders_path.endswith((".xlsx", ".xls")):
            df_orders = pd.read_excel(orders_path)
        else:
            df_orders = pd.read_csv(orders_path)
    except Exception as e:
        print(f"ERROR al leer archivo de órdenes: {e}")
        sys.exit(1)

    print(f"   Columnas cargadas: {list(df_orders.columns)}")
    print(f"   Filas cargadas: {len(df_orders)}")

    # Inicializar motor de reportes
    engine = ReportEngine(dir_path)

    # Convertir registros
    records = df_orders.to_dict(orient="records")
    df_result = engine.process_records(records, args.template, args.region)

    output_path = args.output
    if not output_path:
        ext = args.format
        output_path = f"Reporte_{args.template}_{args.region}.{ext}"

    print(f"-> Exportando {len(df_result)} filas al formato {args.format}...")
    try:
        if args.format == "csv":
            df_result.to_csv(output_path, index=False, encoding="utf-8-sig")
        else:
            df_result.to_excel(output_path, index=False)
        print(f"SUCCESS: Reporte guardado en {os.path.abspath(output_path)}")
    except Exception as e:
        print(f"ERROR al guardar reporte: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
