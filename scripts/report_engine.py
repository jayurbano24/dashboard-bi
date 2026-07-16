#!/usr/bin/env python3
"""
Senior Reporting Engine - Modular Data Pipeline
Features:
- Strategy/Factory pattern for custom report layouts.
- Dynamic geographical routing (GAM / NO GAM) based on agency prefix mapping.
- Error resilience for empty values (NaN/NaT).
- Seamless pandas integration with file buffers for Web APIs.
"""

from __future__ import annotations

import io
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

try:
    import pandas as pd
    import numpy as np
except ImportError:
    raise ImportError("pandas and numpy are required to run this engine. Install with: pip install pandas numpy")


# =====================================================================
# 1. ARQUITECTURA EXTENSIBLE - REPORT STRATEGY / FACTORY PATTERN
# =====================================================================

class ReportStrategy(ABC):
    """
    Abstract Base Class representing a formatting strategy for different report layouts.
    To add a new client, simply subclass this strategy and register it in ReportFactory.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """The identifier name of the strategy."""
        pass

    @abstractmethod
    def transform(self, df: pd.DataFrame, agency_directory: Dict[str, str]) -> pd.DataFrame:
        """
        Transforms the unified/cleaned DataFrame into the client-specific format.
        
        Args:
            df: Unified base DataFrame containing cleaned records.
            agency_directory: Dictionary mapping agency prefixes (e.g. 'G203') to department name.
        
        Returns:
            pd.DataFrame structured according to client specifications.
        """
        pass


class ClaroMonthlyStrategy(ReportStrategy):
    """
    Implements requirement #3: Strict mapping for Claro Monthly Format (PLANTILLA_CLARO_MENSUAL).
    Matches 'Formato de ingresos mensual TCW- JUNIO 2026.xlsx' specifications.
    """
    @property
    def name(self) -> str:
        return "PLANTILLA_CLARO_MENSUAL"

    def transform(self, df: pd.DataFrame, agency_directory: Dict[str, str]) -> pd.DataFrame:
        if df.empty:
            # Return empty DataFrame with the specified structure
            return pd.DataFrame(columns=[
                "Taller", "Oficina Ventas", "CAC o Canal", "Tipo Cliente",
                "GAM / NO GAM", "Imei", "Falla", "Garantia", "Estatus",
                "TIPOS DE GARANTIA", "Fecha Recepción Taller CSA",
                "Fecha de reparación en CSA", "Fecha de Envio CAC",
                "Fecha entrega a CAC", "Cliente", "Teléfono", "Marca",
                "Modelo Sap", "Falla reportada por Tienda",
                "Reparacion realizada por taller CSA", "Fecha de creacion de Folio",
                "Fecha de envio por parte tienda CAC", "motivo por que no aplica",
                "Usuario o Tecncio que trabajo la orden", "No. Guia de envio a Cac",
                "Justificación por que se salio del tiempo", "Unnamed: 12"
            ])

        # Filter to include only OPERADOR and DISTRIBUIDOR-CLARO clients
        tipo_col = None
        for col in df.columns:
            if str(col).lower() in ["operador", "tipo de ingreso"]:
                tipo_col = col
                break

        if tipo_col:
            df_filtered = df[df[tipo_col].astype(str).str.strip().str.upper().isin(["OPERADOR", "DISTRIBUIDOR-CLARO"])].copy()
        else:
            df_filtered = df.copy()

        transformed_rows: List[Dict[str, Any]] = []

        for _, row in df_filtered.iterrows():
            # Helper to get safe strings from multiple possible column names
            def get_str(cols: List[str], default: str = "") -> str:
                for col in cols:
                    if col in row.index:
                        val = row[col]
                        if not pd.isna(val) and val is not None:
                            return str(val).strip()
                return default

            # Extraer e inferir campos
            canal_ingreso = get_str(["CANAL DE INGRESO", "origen", "dealer", "sucursal"])
            tipo_ingreso = get_str(["TIPO DE INGRESO", "operador", "retail", "dealer"])
            
            # Oficina Ventas: primeros 4 caracteres en mayúscula de CANAL DE INGRESO
            oficina_ventas = canal_ingreso[:4].upper() if canal_ingreso else ""
            
            # Extraer prefijo de agencia para lógica GAM / NO GAM (ej. G203)
            prefix_match = re.match(r"^([A-Za-z0-9]+)", canal_ingreso)
            agency_prefix = prefix_match.group(1).upper() if prefix_match else ""
            
            dept = agency_directory.get(agency_prefix, "").strip().lower()
            
            # Clasificación GAM / NO GAM
            gam_no_gam = "NO GAM"
            if dept == "guatemala":
                gam_no_gam = "GAM"
            elif dept:
                gam_no_gam = "NO GAM"
            else:
                # Default fallback based on prefix mapping
                if agency_prefix.startswith("G2") and len(agency_prefix) >= 4:
                    if agency_prefix in ["G201", "G202", "G203", "G204", "G205", "G206", "G207", "G208", "G209", "G210",
                                         "G211", "G212", "G213", "G214", "G215", "G216", "G217", "G218", "G21A", "G220",
                                         "G222", "G223", "G225", "G226", "G227", "G228", "G229", "G250", "G26G", "G270",
                                         "G271", "G278", "G279", "G27M"]:
                        gam_no_gam = "GAM"
                    else:
                        gam_no_gam = "NO GAM"
                else:
                    gam_no_gam = "GAM"  # Default fallback if unknown

            # Estatus
            estado_original = get_str(["Estado", "estado"]).upper()
            estatus = "REPARADO" if estado_original in ["ENTREGADO", "CLOSED", "CERRADO"] else get_str(["Estado", "estado"])
            
            # Tipo Garantía
            tipo_orden = get_str(["Tipo de orden", "tipo_orden", "grupo", "Grupo"])
            tipos_de_garantia = "GARANTIA FABRICANTE" if "REPARACION IW" in tipo_orden.upper() else ""

            # Fechas
            def parse_date(date_cols: List[str]) -> Optional[datetime]:
                for col in date_cols:
                    if col in row.index:
                        date_val = row[col]
                        if pd.isna(date_val) or not date_val:
                            continue
                        try:
                            if isinstance(date_val, datetime):
                                return date_val
                            return pd.to_datetime(date_val)
                        except Exception:
                            pass
                return None

            created_date = parse_date(["Creado en", "created_at", "fecha"])
            repaired_date = parse_date(["Fecha de reparación", "fecha_reparacion", "fecha"])
            completed_date = parse_date(["Terminado / Cerrado", "completado_en", "fecha"])
            delivered_date = parse_date(["Fecha de entrega", "fecha_entrega", "fecha"])

            # Calcular días transcurridos entre Recepción CSA y Entrega CAC
            days_diff = ""
            if delivered_date and created_date:
                days_diff = (delivered_date - created_date).days

            transformed_rows.append({
                "Taller": get_str(["Orden #", "orderName", "conduceId"]),
                "Oficina Ventas": oficina_ventas,
                "CAC o Canal": canal_ingreso,
                "Tipo Cliente": tipo_ingreso,
                "GAM / NO GAM": gam_no_gam,
                "Imei": get_str(["Número de serie", "IMEI", "imei", "serie"]),
                "Falla": get_str(["malfunction", "Mal funcionamiento", "falla", "Falla"]),
                "Garantia": get_str(["Garantía", "garantia"]) or "IW",
                "Estatus": estatus,
                "TIPOS DE GARANTIA": tipos_de_garantia,
                "Fecha Recepción Taller CSA": created_date.strftime("%Y-%m-%d %H:%M") if created_date else "",
                "Fecha de reparación en CSA": repaired_date.strftime("%Y-%m-%d %H:%M") if repaired_date else "",
                "Fecha de Envio CAC": completed_date.strftime("%Y-%m-%d %H:%M") if completed_date else "",
                "Fecha entrega a CAC": delivered_date.strftime("%Y-%m-%d %H:%M") if delivered_date else "",
                "Cliente": get_str(["Nombre del cliente", "cliente", "Cliente", "Nombre"]),
                "Teléfono": get_str(["Teléfono del cliente", "telefono", "Teléfono", "Laboral", "Teléfono Laboral", "Telefono Laboral"]),
                "Marca": get_str(["Marca del dispositivo", "marcaDispositivo", "marca", "Marca"]),
                "Modelo Sap": get_str(["Modelo de dispositivo", "modeloDispositivo", "modelo", "Modelo Sap"]),
                "Falla reportada por Tienda": get_str(["malfunction", "Mal funcionamiento", "falla", "Falla", "Servicios/Obras", "serviciosObras", "Falla reportada por Tienda"]),
                "Reparacion realizada por taller CSA": get_str(["Servicios/Obras", "serviciosObras", "Reparacion realizada por taller CSA"]),
                "Fecha de creacion de Folio": created_date.strftime("%Y-%m-%d %H:%M") if created_date else "",
                "Fecha de envio por parte tienda CAC": get_str(["Fecha de envio por parte tienda CAC", "fechaEnvioTienda", "Fecha de envio por parte tienda CAC"]),
                "motivo por que no aplica": get_str(["motivo por que no aplica", "motivoNoAplica", "motivo por que no aplica"]),
                "Usuario o Tecncio que trabajo la orden": get_str(["tecnico", "Usuario o Tecncio que trabajo la orden", "Usuario o Tecnico que trabajo la orden"]),
                "No. Guia de envio a Cac": get_str(["No. Guia de envio a Cac", "numeroGuia", "No. Guia de envio a Cac"]),
                "Justificación por que se salio del tiempo": get_str(["Justificación por que se salio del tiempo", "justificacionTiempo", "Justificación por que se salio del tiempo"]),
                "Unnamed: 12": days_diff
            })

        return pd.DataFrame(transformed_rows)


class TcwMasterStrategy(ReportStrategy):
    """
    Implements requirement #4: Plantilla Interna (TCW_MASTER).
    Outputs full cleaned raw data for internal analysis and auditing.
    """
    @property
    def name(self) -> str:
        return "TCW_MASTER"

    def transform(self, df: pd.DataFrame, agency_directory: Dict[str, str]) -> pd.DataFrame:
        # Simply return the cleaned data with a standard column set
        columns_to_keep = [
            "conduceId", "fecha", "doa", "courrier", "numeroGuia", "precinto",
            "origen", "operador", "retail", "dealer", "sucursal", "imei",
            "serie", "orderId", "orderName", "marca", "modelo", "grupo", "estado"
        ]
        available_cols = [c for c in columns_to_keep if c in df.columns]
        return df[available_cols].copy()


class ReportFactory:
    """Factory to register and retrieve reporting strategies dynamically."""
    _strategies: Dict[str, ReportStrategy] = {}

    @classmethod
    def register(cls, strategy: ReportStrategy) -> None:
        cls._strategies[strategy.name] = strategy

    @classmethod
    def get_strategy(cls, name: str) -> ReportStrategy:
        if name not in cls._strategies:
            raise ValueError(f"Report strategy '{name}' is not registered.")
        return cls._strategies[name]


# Register strategies
ReportFactory.register(ClaroMonthlyStrategy())
ReportFactory.register(TcwMasterStrategy())


# =====================================================================
# 2. ENRUTAMIENTO GEOGRÁFICO DINÁMICO & ENGINE PRINCIPAL
# =====================================================================

class ReportEngine:
    """
    Main Data Engineering Engine.
    Handles data ingestion, reference directories, filters, and strategy-based formatting.
    """
    def __init__(self, directory_file_path: Optional[str] = None):
        """
        Initializes the engine with the agency directory.
        
        Args:
            directory_file_path: Optional path to Excel/CSV with the CACS directory.
        """
        self.agency_directory: Dict[str, str] = {}
        if directory_file_path:
            self.load_directory(directory_file_path)
        else:
            self._load_fallback_directory()

    def load_directory(self, file_path: str) -> None:
        """Loads and parses CACS directory file."""
        try:
            # Support both Excel and CSV
            if file_path.endswith((".xlsx", ".xls")):
                xls = pd.ExcelFile(file_path)
                sheet = "Directorio Tiendas GT" if "Directorio Tiendas GT" in xls.sheet_names else 0
                df_dir = pd.read_excel(xls, sheet_name=sheet)
            else:
                df_dir = pd.read_csv(file_path)

            # Look for channel name/code and department columns dynamically
            col_canal = None
            col_dept = None

            for col in df_dir.columns:
                col_lower = str(col).lower()
                if "canal" in col_lower or "agencia" in col_lower or "cac" in col_lower or "codigo" in col_lower or "código" in col_lower:
                    col_canal = col
                if "departamento" in col_lower or "depto" in col_lower or "ubicacion" in col_lower or "ubicación" in col_lower:
                    col_dept = col

            if col_canal and col_dept:
                for _, row in df_dir.iterrows():
                    canal_val = str(row[col_canal]).strip().upper()
                    dept_val = str(row[col_dept]).strip()

                    # Extract prefix (e.g. 'G203' from 'G203-METRONORTE')
                    prefix_match = re.match(r"^([A-Za-z0-9]+)", canal_val)
                    if prefix_match:
                        prefix = prefix_match.group(1).upper()
                        self.agency_directory[prefix] = dept_val
            else:
                # Direct lookup mapping logic
                self._load_fallback_directory()
        except Exception:
            # Fail-safe to avoid crash
            self._load_fallback_directory()

    def _load_fallback_directory(self) -> None:
        """Fallback directory map based on official CACs Jun 2026 dataset."""
        # Map of typical Guatemala CACS (GAM)
        gam_cacs = [
            "G201", "G202", "G203", "G204", "G205", "G206", "G207", "G208", "G209", "G210",
            "G211", "G212", "G213", "G214", "G215", "G216", "G217", "G218", "G21A", "G220",
            "G222", "G223", "G225", "G226", "G227", "G228", "G229", "G250", "G26G", "G270",
            "G271", "G278", "G279", "G27M"
        ]
        
        cacs_foraneos = {
            "G254": "Sacatepéquez", "G256": "Chimaltenango", "G255": "Sacatepéquez", "G26J": "Santa Rosa",
            "G26A": "El Progreso", "G262": "Jalapa", "G26B": "El Progreso",
            "G234": "Jutiapa", "G231": "Jutiapa",
            "G264": "Chiquimula", "G267": "Zacapa", "G268": "Petén", "G277": "Izabal",
            "G275": "Alta Verapaz", "G272": "Alta Verapaz", "G276": "Izabal", "G273": "Baja Verapaz",
            "G269": "Zacapa", "G241": "Quetzaltenango", "G238": "Quetzaltenango", "G240": "San Marcos",
            "G239": "Quetzaltenango", "G23Q": "Quetzaltenango", "G26H": "Quetzaltenango", "G244": "San Marcos",
            "G246": "San Marcos", "G245": "San Marcos", "G242": "Huehuetenango", "G257": "Sololá",
            "G274": "Quiché", "G277": "Totonicapán", "G252": "Escuintla", "G253": "Escuintla",
            "G258": "Escuintla", "G248": "Suchitepéquez", "G247": "Suchitepéquez", "G251": "Retalhuleu",
            "G249": "Suchitepéquez"
        }

        for c, d in cacs_foraneos.items():
            self.agency_directory[c] = d

        for c in gam_cacs:
            self.agency_directory[c] = "Guatemala"

    def process_records(
        self,
        records: List[Dict[str, Any]],
        strategy_name: str,
        region_filter: Literal["TODOS", "GAM", "NO GAM"] = "TODOS"
    ) -> pd.DataFrame:
        """
        Main pipeline method: Clean, Filter, Transform.
        """
        # Load into DataFrame
        df = pd.DataFrame(records)
        if df.empty:
            strategy = ReportFactory.get_strategy(strategy_name)
            return strategy.transform(df, self.agency_directory)

        # Ensure correct column naming and handle NaNs/empty values
        df = df.replace({np.nan: None, np.datetime64('NaT'): None})

        # Apply Regional Filter dynamically before rendering columns
        if region_filter in ["GAM", "NO GAM"]:
            filtered_indices = []
            for idx, row in df.iterrows():
                # Helper to get safe strings
                def get_str(cols: List[str]) -> str:
                    for col in cols:
                        if col in row.index:
                            val = row[col]
                            if not pd.isna(val) and val is not None:
                                return str(val).strip()
                    return ""

                # Extract prefix from CANAL DE INGRESO/origen/dealer/sucursal
                canal = get_str(["CANAL DE INGRESO", "origen", "dealer", "sucursal"]).upper()
                prefix_match = re.match(r"^([A-Za-z0-9]+)", canal)
                prefix = prefix_match.group(1).upper() if prefix_match else ""
                
                dept = self.agency_directory.get(prefix, "").strip().lower()
                
                is_gam = (dept == "guatemala")
                if not dept and prefix:
                    # Fallback check
                    is_gam = (prefix in ["G201", "G203", "G204", "G205", "G206", "G207", "G208", "G210", "G211", "G213", "G214", "G215", "G220", "G221", "G222", "G223", "G225", "G226", "G228", "G229", "G230", "G231", "G232", "G233"])
                
                if region_filter == "GAM" and is_gam:
                    filtered_indices.append(idx)
                elif region_filter == "NO GAM" and not is_gam:
                    filtered_indices.append(idx)

            df = df.loc[filtered_indices].copy()

        # Run formatting Strategy
        strategy = ReportFactory.get_strategy(strategy_name)
        return strategy.transform(df, self.agency_directory)

    def export_to_buffer(
        self,
        df: pd.DataFrame,
        export_format: Literal["csv", "xlsx"] = "csv"
    ) -> Union[io.StringIO, io.BytesIO]:
        """Exports DataFrame to ready-to-download file buffers."""
        if export_format == "csv":
            buf = io.StringIO()
            df.to_csv(buf, index=False, encoding="utf-8-sig")
            buf.seek(0)
            return buf
        else:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name="Report")
            buf.seek(0)
            return buf
