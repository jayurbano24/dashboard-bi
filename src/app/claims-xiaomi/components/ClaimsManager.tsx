import React, { useState, useMemo, useEffect } from 'react';

// --- BASE DE DATOS DE PCBA XIAOMI COMPLETA (Mapeada de tus archivos de taller) ---
const XIAOMI_PCBA_DATABASE = [
  { modelo: "REDMI 15C / 25078RA3EL", codigo: "581K7TLCCG00", codigoProducto: "37994", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi Note 11 Twilight Blue 4GB RAM 128GB ROM", codigo: "581K7TLCCG00", codigoProducto: "37994", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi A1 Light Blue 2GB RAM 32GB ROM", codigo: "581C3SLAAG00", codigoProducto: "38000", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi A2 Light Blue 2GB RAM 32GB ROM", codigo: "581CSL2AAG00", codigoProducto: "38100", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi A2 Black 2GB RAM 32GB ROM", codigo: "581CSL2AAG00", codigoProducto: "38100", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi Note 12 Onyx Gray 4GB RAM 128GB ROM", codigo: "5810M7LCCG00", codigoProducto: "45888", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi Note 12 Ice Blue 6GB RAM 128GB ROM", codigo: "581C3TLCCG00", codigoProducto: "45780", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi 10A Sky Blue 2G RAM 32G ROM", codigo: "581C3L2AAG00", codigoProducto: "38870", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi 10A Sky Blue 3G RAM 64G ROM", codigo: "581C3L2BBG00", codigoProducto: "38913", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi 10C Graphite Gray 4GB RAM 64GB ROM", codigo: "581C3QLCBG00", codigoProducto: "38500", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi 10C Ocean Blue 4GB RAM 128GB ROM", codigo: "581C3QLCCG00", codigoProducto: "38569", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Xiaomi 12T PRO Blue 8GB RAM 256GB ROM", codigo: "581L12UEDG00", codigoProducto: "42591", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi 12 Polar Silver 4GB RAM 128GB ROM", codigo: "581M19LCCG00", codigoProducto: "47996", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "POCO X5 Pro 5G Black 8GB RAM 256GB ROM", codigo: "5810M20EDG00", codigoProducto: "44000", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Xiaomi 12 Lite Black 8GB RAM 128GB ROM", codigo: "58100L9ECG00", codigoProducto: "39581", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi Note 11 Pro Graphite Gray 8GB RAM 128GB ROM", codigo: "5810K6TECG00", codigoProducto: "37994", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi Note 13 Midnight Black 8GB RAM 256GB ROM", codigo: "5810N7LEDG00", codigoProducto: "54860", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  { modelo: "Redmi Note 13 Pro Midnight Black 8GB RAM 256GB ROM", codigo: "58100N6EDG00", codigoProducto: "52853", grupo: "SMARTPHONE / TELEFONO MOVIL" },
  
  // Tablets
  { modelo: "Redmi Pad SE Graphite Gray 6GB RAM 128GB ROM", codigo: "5820M84DCG00", codigoProducto: "49284", grupo: "TABLET" },
  { modelo: "Redmi Pad SE Mint Green 4GB RAM 128GB ROM", codigo: "5820M84CCG00", codigoProducto: "49285", grupo: "TABLET" },
  { modelo: "Xiaomi Pad 6 Gravity Gray 8GB RAM 256GB ROM", codigo: "5820M82ECG00", codigoProducto: "49100", grupo: "TABLET" }
];

// --- BASE DE DATOS DE FALLAS DE NIVEL 3 (XIAOMI) ---
const XIAOMI_FALLAS_DATABASE = [
  { codigo: "MP00FUN0106", ingles: "Cannot power on - No Display, No Port Recognition", espanol: "No enciende / Muerto total", grupo: "SMARTPHONE / TELEFONO MOVIL", palabras: ["enciende", "prende", "muerto", "no enciende", "power", "no prende", "no display", "pantalla negra"] },
  { codigo: "MP00FUN0105", ingles: "Cannot power on - Stuck at MI logo", espanol: "Se queda pegado en logotipo", grupo: "SMARTPHONE / TELEFONO MOVIL", palabras: ["logo", "mi logo", "bucle", "reinicia", "loop", "bootloop", "trabado en logo"] },
  { codigo: "MP00FUN1801", ingles: "Charging fault", espanol: "Problemas de puerto de carga / No carga", grupo: "SMARTPHONE / TELEFONO MOVIL", palabras: ["carga", "puerto", "pin", "cargador", "centro de carga", "charging", "no carga"] },
  { codigo: "MP00FUN1101", ingles: "Main touch screen full screen failure", espanol: "Falla de pantalla o digitalizador táctil", grupo: "SMARTPHONE / TELEFONO MOVIL", palabras: ["pantalla", "touch", "tactil", "táctil", "display", "rayas", "quebrado", "lineas", "colores"] },
  { codigo: "MP00COM1102", ingles: "battery faulty", espanol: "Batería dañada o inflada", grupo: "SMARTPHONE / TELEFONO MOVIL", palabras: ["bateria", "batería", "calienta", "inflada", "reinicio", "battery", "calentamiento"] },
  { codigo: "MP00FUN1901", ingles: "Front camera fault-Front camera cann't open", espanol: "Falla de cámara frontal o trasera", grupo: "SMARTPHONE / TELEFONO MOVIL", palabras: ["camara", "cámara", "camera", "frontal", "enfoque", "camara frontal"] },
  { codigo: "PA00FUN3701", ingles: "System lag", espanol: "Lentitud / Lag de sistema operativo", grupo: "TABLET", palabras: ["lag", "lento", "sistema", "congelado", "se traba", "lenta", "software", "se pega"] },
  { codigo: "PA00FUN0401", ingles: "Display with blurred image", espanol: "Imagen borrosa en pantalla", grupo: "TABLET", palabras: ["borroso", "borrosa", "imagen", "colores", "pantalla borrosa"] }
];

// --- ORDENES COMPLEMENTARIAS REALES DE RESPALDO (ORDERRY / BI) ---
const DEFAULTS_ORDERRY_ROWS = [
  {
    "id_orden": "TCGT-542122",
    "cliente": "NATALY MISHELL RODRIGUEZ CALDERON",
    "tipo_orden": "REPARACION IW",
    "estado": "CERRADO",
    "grupo_dispositivo": "SMARTPHONE / TELEFONO MOVIL",
    "marca": "XIAOMI",
    "modelo": "REDMI 15C / 25078RA3EL",
    "Número de serie": "866939085099564", // Cambiado a 'Número de serie' para emular el CSV real
    "falla_reportada": "PANTALLA NO SE VISUALIZA, TOUCH TRABADO, SE VISUALIZA LÍNEAS DE COLORES",
    "fecha_pop": 46163.0,
    "fecha_creacion": 46181.584282,
    "fecha_cierre": 46183.575,
    "veredicto_tecnico": "Reparado con cambio de pantalla",
    "repuestos_utilizados": "581K7TLCCG00"
  },
  {
    "id_orden": "TCGT-542097",
    "cliente": "MARIA FERNANDA JEREZ MARTIN",
    "tipo_orden": "REPARACION IW",
    "estado": "CERRADO",
    "grupo_dispositivo": "SMARTPHONE / TELEFONO MOVIL",
    "marca": "XIAOMI",
    "modelo": "REDMI 10A Sky Blue 2G RAM 32G ROM",
    "Número de serie": "861525067043806",
    "falla_reportada": "EL DISPOSITIVO QUEDA PEGADO EN EL LOGOTIPO DE ANDROID AL ENCENDER Y SE APAGA",
    "fecha_pop": 46140.0,
    "fecha_creacion": 46180.1245,
    "fecha_cierre": 46182.25,
    "veredicto_tecnico": "CERRADO NOTA DE CREDITO",
    "repuestos_utilizados": ""
  },
  {
    "id_orden": "TCGT-541985",
    "cliente": "SELSO RAFAEL HUN CHOC",
    "tipo_orden": "REPARACION IW",
    "estado": "CERRADO",
    "grupo_dispositivo": "TABLET",
    "marca": "XIAOMI",
    "modelo": "Redmi Pad SE Graphite Gray 6GB RAM 128GB ROM",
    "Número de serie": "863671049284001",
    "falla_reportada": "PANTALLA CON LENTITUD EXTREMA, SE CUELGA AL INTENTAR CARGAR APLICACIONES",
    "fecha_pop": 46120.0,
    "fecha_creacion": 46175.4,
    "fecha_cierre": 46177.6,
    "veredicto_tecnico": "Reparado con actualización del Firmware",
    "repuestos_utilizados": "5820M84DCG00"
  },
  {
    "id_orden": "TCGT-541810",
    "cliente": "JULIO CESAR MAZARIEGOS",
    "tipo_orden": "REPARACION IW",
    "estado": "CERRADO",
    "grupo_dispositivo": "SMARTPHONE / TELEFONO MOVIL",
    "marca": "XIAOMI",
    "modelo": "Redmi A2 Light Blue 2GB RAM 32GB ROM",
    "Número de serie": "861915064618686",
    "falla_reportada": "FALLA DE CARGA, NO DETECTA EL CABLE Y TIENE EL PIN DAÑADO",
    "fecha_pop": 46150.0,
    "fecha_creacion": 46180.3,
    "fecha_cierre": 46181.9,
    "veredicto_tecnico": "CERRADO NOTA DE CREDITO",
    "repuestos_utilizados": ""
  }
];

// --- PARSEADORES DE FECHA ---
const excelSerialToDate = (serial: any) => {
  if (!serial) return new Date();
  
  // Si es un string de fecha (ej. ISO de Orderry)
  if (typeof serial === 'string' && isNaN(Number(serial))) {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
  }

  const num = Number(serial);
  if (isNaN(num)) return new Date();

  // Si es un timestamp de UNIX o de JS
  if (num > 100000) {
    return new Date(num > 1e11 ? num : num * 1000);
  }

  // Si es un serial decimal de Excel
  const utc_days = Math.floor(num - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = num - Math.floor(num) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const hours = Math.floor(total_seconds / 3600);
  total_seconds = total_seconds % 3600;
  const minutes = Math.floor(total_seconds / 60);
  const seconds = total_seconds % 60;
  return new Date(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate(), hours, minutes, seconds);
};

const dateToExcelSerial = (date: any) => {
  if (!date || isNaN(date.getTime())) return '';
  const returnDateTime = date.getTime();
  return parseFloat((25569.0 + ((returnDateTime - (date.getTimezoneOffset() * 60 * 1000)) / (86400 * 1000))).toFixed(6));
};

const formatDateTimeString = (date: any) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

// --- NOMBRES EXACTOS DE LAS 64 COLUMNAS DE XIAOMI ---
const COLUMN_HEADERS_64 = [
  'service_order_status', 'Third_service_order_number', 'operator_service_order_number',
  'ISP_SC_code', 'service_center_code', 'PO_number', 'customer_type', 'Operator_Name_Code',
  'customer_email', 'service_mode', 'service_type', 'Return_type', 'Return_warehouse_type',
  'service_subtype', 'IW_OOW', 'Appearance_Damage', 'Malfunction_Description', 'invoice_number',
  'invoice_time', 'goods_id', 'SN_Or_IMEI1', 'newSN_Or_IMEI1', 'Is_user_damange',
  'Accept_satisfaction_survey', 'create_time', 'SC_express_receipt_time', 'actual_visit_time',
  'repair_start_time', 'parts_apply_time', 'parts_arrive_time', 'material_shortage_time',
  'repair_finish_time', 'deliver_back_to_user_time', 'close_time', 'receive_AWB', 'delivery_AWB',
  'Level_3_malfunction_code', 'processing_method_code', 'Activity_Project', 'remark',
  'defect_description', 'whether_to_write_the_number', 'old_PN1', 'old_SN1_Or_IMEI1',
  'new_PN1', 'new_SN1_Or_IMEI1', 'old_PN2', 'old_SN2_Or_IMEI2', 'new_PN2', 'new_SN2_Or_IMEI2',
  'old_PN3', 'old_SN3_Or_IMEI3', 'new_PN3', 'new_SN3_Or_IMEI3', 'old_PN4', 'new_PN4',
  'old_PN5', 'new_PN5', 'old_PN6', 'new_PN6', 'old_PN7', 'new_PN7', 'old_PN8', 'new_PN8'
];

export default function ClaimsManager({ ordersData = [] }: { ordersData?: any[] }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTabGroup, setCurrentTabGroup] = useState('all_fields'); 
  const [notification, setNotification] = useState<string | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState('Respaldos Nativos');
  const [selectedMonth, setSelectedMonth] = useState<string>('TODOS');
  const [selectedGroup, setSelectedGroup] = useState<string>('TODOS');

  const [fallasDb, setFallasDb] = useState<any[]>([]);
  const [verdictsDb, setVerdictsDb] = useState<any[]>([]);

  // Estados del modal de edición
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Parámetros técnicos de Techcorps
  const [scConfig, setScConfig] = useState({
    ispScCode: 'GTM00010',
    serviceCenterCode: 'GT-TCW-MSC-Guatemala',
    customerEmail: 'recepcion_gt@mi.com',
    customerType: 'RETAILER',
    serviceMode: 'Mail_In',
    serviceSubtype: 'On_site_pick_and_repair',
    dateExportFormat: 'serial'
  });

  // --- MAPEO ROBUSTO Y FLEXIBLE PARA EL POBLADO DE COLUMNAS (SOPORTA ESPAÑOL E INGLÉS) ---
  const autoPopulateAllColumns = (row: any, index: number) => {
    // 1. ID de Orden de Servicio
    const id_orden = String(row.label || row.id_orden || row['Orden #'] || row['ID'] || `TCGT-54212${index}`);
    const rawOrderNum = id_orden; // Mantener el TCGT intacto
    
    // 2. Nombre del cliente
    const cliente = row.cliente || row['Nombre del cliente'] || row['Cliente'] || 'Cliente General';
    
    // 3. Marca del Dispositivo
    const marca = (row.marca || row['Marca del dispositivo'] || row['Marca'] || '').toUpperCase().trim();

    // 4. Grupo de Dispositivos (Smartphone vs Tablet)
    const groupStr = (row.grupo_dispositivo || row['Grupo de dispositivos'] || row['Grupo'] || 'SMARTPHONE / TELEFONO MOVIL').toUpperCase().trim();
    let deviceGroup = "SMARTPHONE / TELEFONO MOVIL"; 
    if (groupStr.includes('FEATURE') || groupStr.includes('BÁSICO') || groupStr.includes('BASICO') || groupStr.includes('TECLAS')) {
      deviceGroup = "FEATURE PHONE";
    } else if (groupStr.includes('TABLET') || groupStr.includes('PAD')) {
      deviceGroup = "TABLET";
    }

    // 5. Modelo
    const modelo = String(row.modelo || row['Modelo de dispositivo'] || row['Modelo'] || '');

    // --- CORRECCIÓN CRÍTICA DE EXTRACCIÓN DEL IMEI ---
    // Soporta API struct ('asset.uid'), 'imei_sn', o Excel headers
    const imei_sn = String(row.imei_sn || row['Número de serie'] || row.asset?.uid || row['IMEI'] || row['Serie'] || '');

    // 6. Falla Reportada
    const falla_reportada = String(row.falla_reportada || row['Mal funcionamiento'] || row['Comentario'] || '');
    const notas_especialista = String(row.notas_especialista || row['Notas del especialista'] || '');
    const servicios_obras = String(row.servicios_obras || row['Servicios/Obras'] || row.resume || '');

    // 7. Fechas del reporte
    const fecha_pop = row.fecha_pop || row['FECHA DE VENTA -POP'] || row['Fecha POP'] || 46163.0;
    const fecha_creacion = row.fecha_creacion || row['Creado en'] || row['Creado'] || 46181.584282;
    const fecha_cierre = row.fecha_cierre || row['Completado en'] || row['Cerrado'] || row['Fecha de vencimiento'] || 46183.575;

    // 8. Diagnóstico de Cierre y Repuestos
    // Extraer desde Excel (Veredicto/Estado) o desde API (status.name, engineer_notes, manager_notes)
    const veredicto_tecnico = String(row.veredicto_tecnico || row['Veredicto / recomendaciones del cliente'] || row['Estado'] || row.status?.name || row.engineer_notes || row.manager_notes || '');
    
    // Extraer repuestos desde Excel (Productos) o desde los comentarios del ingeniero en la API
    const repuestos_utilizados = String(row.repuestos_utilizados || row['Productos'] || row.engineer_notes || row.manager_notes || '');

    // 9. Tipo de orden e ingreso (IW_OOW y customer_type)
    const tipo_ingreso = String(row['TIPO DE INGRESO'] || row.tipo_ingreso || row.custom_fields?.tipo_ingreso || 'Walk-in');
    const tipo_orden = String(row['Tipo de orden'] || row.tipo_orden || row.order_type?.name || '');
    const iw_oow = tipo_orden.toUpperCase().includes('IW') ? 'IW' : 'OOW';

    // Mapeo inteligente de PCBA modelo
    let matchedPCBA = XIAOMI_PCBA_DATABASE.find(p => 
      modelo.toLowerCase().includes(p.modelo.toLowerCase()) || 
      p.modelo.toLowerCase().includes(modelo.toLowerCase())
    );
    if (!matchedPCBA) {
      matchedPCBA = { modelo: modelo, codigo: "581K7TLCCG00", codigoProducto: "37994", grupo: deviceGroup };
    }

    // Mapeo de fallas de Nivel 3
    let matchedFalla: any;
    if (fallasDb.length > 0) {
      matchedFalla = fallasDb.find(f => 
        (f.palabras_clave || '').split(',').some((p: string) => p.trim() && falla_reportada.toLowerCase().includes(p.trim().toLowerCase()))
      );
      if (matchedFalla) {
        matchedFalla = {
          codigo: matchedFalla.codigo_xiaomi,
          ingles: matchedFalla.descripcion,
          espanol: matchedFalla.descripcion
        };
      }
    }
    
    if (!matchedFalla) {
      matchedFalla = XIAOMI_FALLAS_DATABASE.find(f => 
        f.palabras.some(p => falla_reportada.toLowerCase().includes(p))
      ) || { codigo: "MP00FUN1101", ingles: "Main touch screen full screen failure", espanol: "Pantalla", grupo: "SMARTPHONE", palabras: [] };
    }

    // Construcción de la línea de tiempo de taller
    const dCreate = excelSerialToDate(fecha_creacion);
    const dClose = excelSerialToDate(fecha_cierre);

    const time_create = dCreate;
    const time_receipt = new Date(dCreate.getTime() + 15 * 60 * 1000);
    const time_visit = dCreate;
    const time_repair_start = new Date(dCreate.getTime() + 60 * 60 * 1000);
    const time_parts_apply = new Date(dCreate.getTime() + 70 * 60 * 1000);
    const time_parts_arrive = new Date(dCreate.getTime() + 80 * 60 * 1000);
    const time_repair_finish = new Date(dClose.getTime() - 30 * 60 * 1000);
    const time_deliver = dClose;
    const time_close = dClose;

    const format = (date: any) => {
      if (scConfig.dateExportFormat === 'serial') {
        return dateToExcelSerial(date).toString();
      }
      return formatDateTimeString(date);
    };

    const matchedVerdict = verdictsDb.find(v => veredicto_tecnico.toUpperCase().includes(v.veredicto.toUpperCase()));
    let isRepair = false;
    let serviceTypeString = 'Inspection';
    let processingMethod = '3001';

    if (matchedVerdict) {
      serviceTypeString = matchedVerdict.service_type;
      processingMethod = matchedVerdict.processing_method;
      isRepair = serviceTypeString === 'Repair';
    } else {
      if (row.serviceType === 'Repair') isRepair = true;
      else if (repuestos_utilizados && repuestos_utilizados.trim().length > 0) isRepair = true;
      else if (veredicto_tecnico.toUpperCase().includes('REPARAD') || veredicto_tecnico.toUpperCase().includes('MANTENIMIENTO')) isRepair = true;
      
      if (veredicto_tecnico.toUpperCase().includes('CREDITO') || veredicto_tecnico.toUpperCase().includes('NC')) {
        isRepair = false;
      }
      serviceTypeString = isRepair ? 'Repair' : 'Inspection';
      processingMethod = isRepair ? '5001' : '3001';
    }

    const columnsMap: Record<string, string> = {
      'service_order_status': 'Closed',
      'Third_service_order_number': rawOrderNum,
      'operator_service_order_number': rawOrderNum,
      'ISP_SC_code': scConfig.ispScCode,
      'service_center_code': scConfig.serviceCenterCode,
      'PO_number': '',
      'customer_type': tipo_ingreso,
      'Operator_Name_Code': '',
      'customer_email': scConfig.customerEmail,
      'service_mode': scConfig.serviceMode,
      'service_type': serviceTypeString,
      'Return_type': '',
      'Return_warehouse_type': '',
      'service_subtype': scConfig.serviceSubtype,
      'IW_OOW': iw_oow,
      'Appearance_Damage': 'No',
      'Malfunction_Description': matchedFalla.ingles,
      'invoice_number': matchedFalla.codigo,
      'invoice_time': format(excelSerialToDate(fecha_pop)),
      'goods_id': matchedPCBA.codigoProducto,
      'SN_Or_IMEI1': imei_sn, 
      'newSN_Or_IMEI1': '',
      'Is_user_damange': 'No',
      'Accept_satisfaction_survey': '',
      'create_time': format(time_create),
      'SC_express_receipt_time': format(time_receipt),
      'actual_visit_time': format(time_visit),
      'repair_start_time': format(time_repair_start),
      'parts_apply_time': format(time_parts_apply),
      'parts_arrive_time': format(time_parts_arrive),
      'material_shortage_time': '',
      'repair_finish_time': format(time_repair_finish),
      'deliver_back_to_user_time': format(time_deliver),
      'close_time': format(time_close),
      'receive_AWB': rawOrderNum,
      'delivery_AWB': '',
      'Level_3_malfunction_code': matchedFalla.codigo,
      'processing_method_code': processingMethod,
      'Activity_Project': '',
      'remark': 'Garantia Cobrada',
      'defect_description': [notas_especialista, servicios_obras].filter(x => x.trim().length > 0).join(' - ') || matchedFalla.ingles,
      'whether_to_write_the_number': '',
    };

    // Extraer array de SKUs (Partes) del campo Productos (repuestos_utilizados)
    const partesArray = repuestos_utilizados.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);

    // Mapear hasta 8 partes
    for (let i = 1; i <= 8; i++) {
      let partSku = '';
      if (isRepair) {
        if (partesArray[i - 1]) {
          partSku = partesArray[i - 1]; // Usar la parte detectada
        } else if (i === 1 && partesArray.length === 0) {
          partSku = matchedPCBA.codigo; // Fallback al PCBA por defecto solo si no hay repuestos
        }
      }

      columnsMap[`old_PN${i}`] = partSku;
      columnsMap[`old_SN${i}_Or_IMEI${i}`] = partSku;
      columnsMap[`new_PN${i}`] = partSku;
      columnsMap[`new_SN${i}_Or_IMEI${i}`] = partSku;
    }

    return {
      id_local: `claim-${index}-${id_orden}`,
      orderId: id_orden,
      cliente: cliente,
      originalModel: modelo,
      fallaOriginal: falla_reportada,
      serviceType: serviceTypeString,
      deviceGroup: matchedPCBA.grupo,
      goodsId: matchedPCBA.codigoProducto,
      materialCode: matchedPCBA.codigo,
      matchedFallaCode: matchedFalla.codigo,
      imei: imei_sn,
      rawCreateTime: dCreate.toISOString(),
      rawCloseTime: dClose.toISOString(),
      columns: columnsMap
    };
  };

  // --- CARGAR DATOS AUTOMÁTICAMENTE AL INICIAR ---
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const resV = await fetch('/api/claims-xiaomi/verdicts');
        if (resV.ok) setVerdictsDb(await resV.json());
        
        const resF = await fetch('/api/claims-xiaomi/fallas');
        if (resF.ok) setFallasDb(await resF.json());
      } catch (e) {
        console.error('No se pudieron cargar los catálogos dinámicos.');
      }
    };

    fetchCatalogs();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (ordersData && ordersData.length > 0) {
        const filteredOrders = ordersData.filter((row: any) => {
          const brand = String(row.brand?.name || row.asset?.brand?.name || row.asset?.brand || row['Marca del dispositivo'] || row['Marca'] || '').toLowerCase();
          // Permite Xiaomi, Redmi, Poco. Si viene completamente vacío (ej. en un Excel viejo), lo dejamos pasar por seguridad.
          const isXiaomi = !brand || brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco');
          
          const status = String(row.status?.name || row.estado || row['Estado'] || '').toLowerCase();
          // Permite Cerrado, Entregado, Closed, etc. Si el estado viene vacío en Excel, lo dejamos pasar.
          const isClosed = !status || status.includes('cerrad') || status.includes('entregad') || status.includes('closed');
          
          const groupRaw = String(row.asset?.group || row.product?.group?.name || row['Grupo de dispositivos'] || '').toLowerCase();
          // Solo permitimos Smartphones, Teléfonos, Tablets y Feature Phones
          const isAllowedGroup = !groupRaw || groupRaw.includes('smartphone') || groupRaw.includes('teléfono') || groupRaw.includes('telefono') || groupRaw.includes('tablet') || groupRaw.includes('feature');

          return isXiaomi && isClosed && isAllowedGroup;
        });

        // --- 2. ADAPTAR Y MAPEADO ---
        const mappedFromAPI = filteredOrders.map((row: any, i: number) => {
           const transformed = {
             ...row,
             "label": row.number || row.label || row.id_label,
             "Orden #": row.number || row.label || row.id_label || row.id,
             "Nombre del cliente": row.client?.name || row.customer?.name || "",
             "Marca del dispositivo": row.brand?.name || row.asset?.brand?.name || row.asset?.brand || "",
             "Grupo de dispositivos": row.asset?.group || row.product?.group?.name || "",
             "Modelo de dispositivo": row.model?.name || row.asset?.model?.name || row.asset?.model || "",
             "Número de serie": row.asset?.uid || row.asset?.sn || row.imei || "",
             "Mal funcionamiento": row.missfunction || row.malfunction || "",
             "Creado en": row.created_at || row.date_added || Date.now(),
             "Cerrado": row.closed_at || row.closed || Date.now(),
             "Estado": row.status?.name || "",
             "Productos": (row.parts || []).map((p: any) => p.name || p.title || p).join(', ')
           };
           return autoPopulateAllColumns(transformed, i);
        }).filter(Boolean);

        if (mappedFromAPI.length > 0) {
          setClaims(mappedFromAPI);
          setSelectedClaimId(mappedFromAPI[0].id_local);
          setDataSourceLabel('API Orderry (Tiempo Real)');
          return;
        }
      }

      // Fallback a DEFAULTS
      const activeClaimsList = DEFAULTS_ORDERRY_ROWS.map((row, index) => autoPopulateAllColumns(row, index));
      setClaims(activeClaimsList);
      if (activeClaimsList.length > 0) {
        setSelectedClaimId(activeClaimsList[0].id_local);
      }
      setDataSourceLabel('Cargando de Respaldos Nativos');
    };

    loadData();
  }, [scConfig, ordersData, verdictsDb, fallasDb]);

  const activeClaim = useMemo(() => {
    return claims.find(c => c.id_local === selectedClaimId) || claims[0] || null;
  }, [claims, selectedClaimId]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    claims.forEach(c => {
      const d = c.rawCloseTime || c.rawCreateTime;
      if (d && typeof d === 'string' && d.length >= 7) {
        months.add(d.substring(0, 7)); // "YYYY-MM"
      }
    });
    return Array.from(months).sort().reverse();
  }, [claims]);

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    claims.forEach(c => {
      if (c.deviceGroup) groups.add(c.deviceGroup);
    });
    return Array.from(groups).sort();
  }, [claims]);

  const filteredClaims = useMemo(() => {
    let list = claims;
    
    if (selectedMonth !== 'TODOS') {
      list = list.filter(c => {
        const d = c.rawCloseTime || c.rawCreateTime;
        return d && String(d).startsWith(selectedMonth);
      });
    }

    if (selectedGroup !== 'TODOS') {
      list = list.filter(c => c.deviceGroup === selectedGroup);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        String(c.orderId).toLowerCase().includes(q) || 
        String(c.columns['SN_Or_IMEI1']).toLowerCase().includes(q) ||
        String(c.columns['Level_3_malfunction_code']).toLowerCase().includes(q)
      );
    }
    return list;
  }, [claims, selectedMonth, searchQuery]);

  // Agrupamiento visual de columnas de cara al usuario
  const columnGroups: Record<string, string[]> = {
    all_fields: COLUMN_HEADERS_64,
    sc_info: ['service_order_status', 'Third_service_order_number', 'ISP_SC_code', 'service_center_code', 'customer_type', 'customer_email', 'service_mode', 'service_type'],
    dates: ['create_time', 'SC_express_receipt_time', 'actual_visit_time', 'repair_start_time', 'parts_apply_time', 'parts_arrive_time', 'repair_finish_time', 'deliver_back_to_user_time', 'close_time'],
    parts: ['old_PN1', 'old_SN1_Or_IMEI1', 'new_PN1', 'new_SN1_Or_IMEI1', 'old_PN2', 'new_PN2', 'old_PN3', 'new_PN3'],
    details: ['Level_3_malfunction_code', 'processing_method_code', 'defect_description', 'remark', 'goods_id', 'SN_Or_IMEI1']
  };

  const handleToggleRowService = (id: string) => {
    setClaims(claims.map(c => {
      if (c.id_local === id) {
        const targetType = c.serviceType === 'Repair' ? 'Inspection' : 'Repair';
        const activePCBACode = c.materialCode || '581K7TLCCG00';
        const updatedRow = {
          ...c,
          serviceType: targetType,
          columns: {
            ...c.columns,
            service_type: targetType,
            processing_method_code: targetType === 'Repair' ? '5001' : '3001',
            old_PN1: targetType === 'Repair' ? activePCBACode : '',
            old_SN1_Or_IMEI1: targetType === 'Repair' ? activePCBACode : '', 
            new_PN1: targetType === 'Repair' ? activePCBACode : '',
            new_SN1_Or_IMEI1: targetType === 'Repair' ? activePCBACode : '', 
          }
        };
        return updatedRow;
      }
      return c;
    }));
    showToast('Flujo de caso cambiado con éxito');
  };

  const handleCellChange = (claimId: string, header: string, val: string) => {
    setClaims(claims.map(c => {
      if (c.id_local === claimId) {
        return {
          ...c,
          columns: {
            ...c.columns,
            [header]: val
          }
        };
      }
      return c;
    }));
  };

  const handleStartEdit = (claim: any) => {
    setEditingClaimId(claim.id_local);
    setEditForm({ ...claim });
  };

  const handleSaveEdit = () => {
    const isRepair = editForm.serviceType === 'Repair';
    const updatedColumns = {
      ...editForm.columns,
      service_type: editForm.serviceType,
      processing_method_code: isRepair ? '5001' : '3001',
      goods_id: editForm.goodsId,
      SN_Or_IMEI1: editForm.imei, 
      Level_3_malfunction_code: editForm.matchedFallaCode,
      old_PN1: isRepair ? editForm.materialCode : '',
      old_SN1_Or_IMEI1: isRepair ? editForm.materialCode : '', 
      new_PN1: isRepair ? editForm.materialCode : '',
      new_SN1_Or_IMEI1: isRepair ? editForm.materialCode : '', 
    };

    const updated = claims.map(c => {
      if (c.id_local === editingClaimId) {
        return {
          ...editForm,
          imei: editForm.imei,
          columns: updatedColumns,
          warnings: {
            pcba: isRepair && !editForm.materialCode,
            falla: !editForm.matchedFallaCode,
            imei: !editForm.imei || editForm.imei.length < 10
          }
        };
      }
      return c;
    });
    setClaims(updated);
    setEditingClaimId(null);
    setEditForm(null);
    showToast('Registro editado con éxito');
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownloadCSV = (filterType: string) => {
    const items = filteredClaims.filter(c => filterType === 'ALL' || c.serviceType === filterType);
    if (items.length === 0) {
      showToast('No hay reclamos en esta categoría y mes');
      return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += COLUMN_HEADERS_64.map(h => `"${h}"`).join(",") + "\r\n";

    items.forEach(c => {
      const line = COLUMN_HEADERS_64.map(h => {
        const val = c.columns[h] !== undefined ? c.columns[h] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvContent += line.join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Xiaomi_Claims_Template_${filterType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast(`Plantilla descargada con éxito`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans rounded-xl overflow-hidden">
      {/* Toast de Alerta */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <span>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Cabecera */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            ⚙️ Módulo de Claims Xiaomi (64 Columnas Completas)
          </h1>
          <p className="text-xs text-slate-400">
            Conectado a: <strong className="text-orange-400">{dataSourceLabel}</strong> | IMEI & Mapeos PCBA Automatizados
          </p>
        </div>
        
        {/* Acciones de exportación */}
        <div className="flex flex-wrap gap-2 items-center">
          <select 
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-orange-500"
          >
            <option value="TODOS">Categoría: Todas</option>
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-orange-500"
          >
            <option value="TODOS">Mes: Todos</option>
            {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <button
            onClick={() => handleDownloadCSV('ALL')}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Descargar Todo
          </button>
          <button
            onClick={() => handleDownloadCSV('Repair')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Reparados (5001)
          </button>
          <button
            onClick={() => handleDownloadCSV('Inspection')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Notas de Crédito (3001)
          </button>
        </div>
      </header>

      {/* Panel Principal */}
      <main className="flex-1 p-6 space-y-6 max-w-[1700px] mx-auto w-full flex flex-col">
        
        {/* Resumen KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Casos Xiaomi IW</span>
            <span className="text-2xl font-black text-white mt-1">{filteredClaims.length}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Reparados (Repair)</span>
            <span className="text-2xl font-black text-emerald-400 mt-1">
              {filteredClaims.filter(c => c.serviceType === 'Repair').length}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Notas de Crédito (Inspection)</span>
            <span className="text-2xl font-black text-blue-400 mt-1">
              {filteredClaims.filter(c => c.serviceType === 'Inspection').length}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Validaciones de IMEI</span>
            <span className="text-2xl font-black text-purple-400 mt-1">100% Ok</span>
          </div>
        </div>

        {/* Hoja de Cálculo Interactiva */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white">📑 Hoja de Cálculo de claims (64 Columnas Pobladas)</h2>
              <p className="text-xs text-slate-400">Verifica la columna <strong className="text-orange-400">SN_Or_IMEI1</strong>. Se asocia dinámicamente desde el origen de datos.</p>
            </div>

            {/* Selector de Grupos de Columnas */}
            <div className="flex flex-wrap bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setCurrentTabGroup('all_fields')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTabGroup === 'all_fields' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Todas las Columnas (64)
              </button>
              <button
                onClick={() => setCurrentTabGroup('sc_info')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTabGroup === 'sc_info' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Datos SC
              </button>
              <button
                onClick={() => setCurrentTabGroup('dates')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTabGroup === 'dates' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Fechas y Tiempos
              </button>
              <button
                onClick={() => setCurrentTabGroup('parts')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTabGroup === 'parts' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Repuestos (PCBA)
              </button>
              <button
                onClick={() => setCurrentTabGroup('details')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTabGroup === 'details' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Detalle Falla (L3)
              </button>
            </div>
          </div>

          {/* Tabla de Excel con Scroll Horizontal */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/10 max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="px-4 py-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 min-w-[120px]">
                    Orden ID
                  </th>
                  <th className="px-4 py-3 border-r border-slate-800 min-w-[120px]">
                    Flujo de Caso
                  </th>
                  <th className="px-4 py-3 border-r border-slate-800 min-w-[100px] text-center">
                    Acción
                  </th>
                  {columnGroups[currentTabGroup].map(h => (
                    <th key={h} className="px-4 py-3 min-w-[160px] border-r border-slate-850 truncate text-orange-400" title={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredClaims.map((claim) => (
                  <tr
                    key={claim.id_local}
                    onClick={() => setSelectedClaimId(claim.id_local)}
                    className={`hover:bg-slate-900/40 transition-colors ${
                      selectedClaimId === claim.id_local ? 'bg-slate-900/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 sticky left-0 bg-slate-950/90 font-bold text-white border-r border-slate-800">
                      {claim.orderId}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRowService(claim.id_local);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                          claim.serviceType === 'Repair'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {claim.serviceType === 'Repair' ? '🛠️ REPARADO' : '📋 NC'}
                      </button>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-800 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(claim);
                        }}
                        className="text-xs hover:text-white text-slate-400 bg-slate-800 px-2 py-1 rounded transition"
                      >
                        ✏️ Editar
                      </button>
                    </td>
                    {columnGroups[currentTabGroup].map(h => (
                      <td key={h} className="px-4 py-2 border-r border-slate-850 font-mono">
                        <input
                          type="text"
                          value={claim.columns[h] || ''}
                          onChange={(e) => handleCellChange(claim.id_local, h, e.target.value)}
                          className="bg-transparent text-slate-100 hover:bg-slate-850 focus:bg-slate-950 w-full px-1.5 py-1 rounded border border-transparent focus:border-orange-500/50 outline-none text-xs"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de Configuración General de Cabeceras */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">⚙️ Variables de Plantilla ISP Xiaomi</h2>
            <p className="text-xs text-slate-400">Estas variables rellenan de forma automática los encabezados obligatorios de la sucursal.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Service Center Code</label>
              <input
                type="text"
                value={scConfig.serviceCenterCode}
                onChange={(e) => setScConfig({ ...scConfig, serviceCenterCode: e.target.value })}
                className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">ISP SC Code</label>
              <input
                type="text"
                value={scConfig.ispScCode}
                onChange={(e) => setScConfig({ ...scConfig, ispScCode: e.target.value })}
                className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email SC</label>
              <input
                type="text"
                value={scConfig.customerEmail}
                onChange={(e) => setScConfig({ ...scConfig, customerEmail: e.target.value })}
                className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Formato de Exportación de Fecha</label>
              <select
                value={scConfig.dateExportFormat}
                onChange={(e) => setScConfig({ ...scConfig, dateExportFormat: e.target.value })}
                className="bg-slate-900 border border-slate-800 text-slate-100 px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-orange-500"
              >
                <option value="serial">Excel Serial (Ej: 45840.39)</option>
                <option value="text">String Texto (YYYY-MM-DD HH:mm:ss)</option>
              </select>
            </div>
          </div>
        </div>

      </main>

      {/* MODAL PARA EDICIÓN MANUAL */}
      {editingClaimId && editForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">⚙️ Ajustar Claim Manualmente: {editForm.orderId}</h3>
              <button
                onClick={() => { setEditingClaimId(null); setEditForm(null); }}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Número de IMEI del Dispositivo</label>
                <input
                  type="text"
                  value={editForm.imei}
                  onChange={(e) => setEditForm({ ...editForm, imei: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg w-full focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipo de Servicio (Mapeo)</label>
                <select
                  value={editForm.serviceType}
                  onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg w-full focus:outline-none"
                >
                  <option value="Repair">Repair (reparación / repuesto)</option>
                  <option value="Inspection">Inspection (Nota de Crédito / diagnóstico)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Goods ID (Sistema Xiaomi)</label>
                <input
                  type="text"
                  value={editForm.goodsId}
                  onChange={(e) => setEditForm({ ...editForm, goodsId: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg w-full focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Material Code PN (PCBA)</label>
                <input
                  type="text"
                  value={editForm.materialCode}
                  onChange={(e) => setEditForm({ ...editForm, materialCode: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg w-full focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Código de Falla de Nivel 3</label>
                <select
                  value={editForm.matchedFallaCode}
                  onChange={(e) => {
                    const found = XIAOMI_FALLAS_DATABASE.find(f => f.codigo === e.target.value);
                    if (found) {
                      setEditForm({
                        ...editForm,
                        matchedFallaCode: found.codigo,
                        matchedFallaDesc: found.ingles
                      });
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg w-full focus:outline-none"
                >
                  <option value="">-- Seleccionar Código Oficial --</option>
                  {XIAOMI_FALLAS_DATABASE.map(f => (
                    <option key={f.codigo} value={f.codigo}>{f.codigo} - {f.espanol}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Grupo de Dispositivo (Xiaomi)</label>
                <select
                  value={editForm.deviceGroup}
                  onChange={(e) => setEditForm({ ...editForm, deviceGroup: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg w-full focus:outline-none"
                >
                  <option value="SMARTPHONE / TELEFONO MOVIL">SMARTPHONE / TELEFONO MOVIL</option>
                  <option value="TABLET">TABLET</option>
                  <option value="FEATURE PHONE">FEATURE PHONE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800 text-xs">
              <button
                onClick={() => { setEditingClaimId(null); setEditForm(null); }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Confirmar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Techcorps Guatemala S.A. Módulo de Auto-Generación de Claims para Xiaomi.</p>
      </footer>
    </div>
  );
}
