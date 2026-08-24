import * as ExcelJS from 'exceljs';

export interface RawOrderryOrder {
  'CANAL DE INGRESO'?: string;
  'Grupo de dispositivos'?: string;
  'Tipo de orden'?: string;
  'historial_estados'?: string | string[];
  'Estado'?: string;
  'estado'?: string;
  'suma_aprobada_cliente'?: string | number;
  [key: string]: any; // Allow other original fields for auditing
}

export interface ProcessedClaim {
  orderNumber: string;
  canalIngreso: string;
  grupoDispositivo: string;
  modelo: string;
  tipoOrden: string;
  estado: string;
  transporte: string;
  logistica: number;
  harvesting: number;
  partes: number;
  reparacion: number;
  statusCalc: string;
  finalStatus: string;
  subTotal: number;
  iva: number;
  totalClaim: number;
  rawRecord: RawOrderryOrder;
}

function safeString(val: any): string {
  if (!val) return '';
  if (typeof val === 'object') {
    return String(val.name || val.nombre || val.titulo || val.title || val.id || '').toUpperCase().trim();
  }
  return String(val).toUpperCase().trim();
}


function parseCurrency(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function findVal(obj: any, keywords: string[]): any {
  if (!obj) return null;
  const kws = keywords.map(k => k.toLowerCase());
  for (const key of Object.keys(obj)) {
    const lKey = key.toLowerCase();
    for (const kw of kws) {
      if (lKey.includes(kw)) {
        return obj[key];
      }
    }
  }
  return null;
}

export const FORCE_CACHE_INVALIDATION = Date.now();

const PRICING_MATRIX: Record<string, { trans: string, logistica: number, diag: number, l1: number, l2: number, l3: number, harvesting: number }> = {
  'AUDIFONOS': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'AURICULAR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'BANDA INTELIGENTE': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'CAMARA': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'CARGADOR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'CEPILLO': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 5, l2: 7.5, l3: 11.25, harvesting: 7.92 },
  'DESARMADOR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'DISPENSADOR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'EXTENSOR WIFI': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'FIRE STICK': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'FOCOS': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'IMPRESORA': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'IR POR VOZ': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'LAMPARA': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'POWERBANK': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.5, l2: 4.5, l3: 6, harvesting: 5 },
  'BALANZA': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 5, l3: 7, harvesting: 5 },
  'BOCINA PORTABLE': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 5, l3: 7, harvesting: 5 },
  'BOCINA BLUETOOTH': { trans: 'Motorista', logistica: 3, diag: 3.5, l1: 5, l2: 7.5, l3: 9.5, harvesting: 5 },
  'COMPRESOR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'ESTABILIZADOR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'ROUTER': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 3.6, l2: 6.1, l3: 8.1, harvesting: 5 },
  'SENSOR DE VENTANA': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'SMARTBOX': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'SMARTWATCH': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'RELOJ': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'TIMBRE': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'WIFI-MESH': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 4, l2: 6.5, l3: 8.5, harvesting: 5 },
  'BARRA DE SONIDO': { trans: 'vehículo', logistica: 5, diag: 5, l1: 10, l2: 15, l3: 20, harvesting: 10 },
  'SOUNDBAR': { trans: 'vehículo', logistica: 5, diag: 5, l1: 10, l2: 15, l3: 20, harvesting: 10 },
  'TV': { trans: 'vehículo', logistica: 5, diag: 5, l1: 10, l2: 15, l3: 20, harvesting: 10 },
  'ASPIRADORA': { trans: 'vehículo', logistica: 5, diag: 8, l1: 15, l2: 20, l3: 25, harvesting: 10 },
  'ROBOT': { trans: 'vehículo', logistica: 5, diag: 8, l1: 15, l2: 20, l3: 25, harvesting: 10 },
  'VACUUM': { trans: 'vehículo', logistica: 5, diag: 8, l1: 15, l2: 20, l3: 25, harvesting: 10 },
  'MONITOR': { trans: 'vehículo', logistica: 5, diag: 8, l1: 15, l2: 20, l3: 25, harvesting: 10 },
  'SCOOTER': { trans: 'vehículo', logistica: 5, diag: 10, l1: 25, l2: 30, l3: 35, harvesting: 10 },
  'ADAPTADOR': { trans: 'Motorista', logistica: 3, diag: 1, l1: 0, l2: 0, l3: 0, harvesting: 0 },
  'AIR FRYER': { trans: 'vehículo', logistica: 5, diag: 5, l1: 7.5, l2: 11.25, l3: 16.88, harvesting: 11.88 },
  'SENSOR IOT': { trans: 'Motorista', logistica: 3, diag: 3.5, l1: 5.25, l2: 7.88, l3: 11.81, harvesting: 8.31 },
  'ILUMINACION': { trans: 'Motorista', logistica: 3, diag: 3, l1: 5, l2: 7.5, l3: 11.25, harvesting: 7.92 },
  'PROYECTOR': { trans: 'vehículo', logistica: 5, diag: 5, l1: 7.5, l2: 11.25, l3: 16.88, harvesting: 11.88 },
  'PURIFICADOR': { trans: 'vehículo', logistica: 5, diag: 5, l1: 7.5, l2: 11.25, l3: 16.88, harvesting: 11.88 },
  'FUENTE DE AGUA': { trans: 'vehículo', logistica: 5, diag: 5, l1: 7.5, l2: 11.25, l3: 16.88, harvesting: 11.88 },
  'MASAJEADOR': { trans: 'Motorista', logistica: 3, diag: 2.5, l1: 5, l2: 7.5, l3: 11.25, harvesting: 7.92 },
  'BALANZA SMART': { trans: 'vehículo', logistica: 5, diag: 5, l1: 7.5, l2: 11.25, l3: 16.88, harvesting: 11.88 },
  'ALIMENTADORA': { trans: 'vehículo', logistica: 5, diag: 10, l1: 15, l2: 20, l3: 25, harvesting: 17.5 },
  'PISTOLA DE LAVAR': { trans: 'vehículo', logistica: 5, diag: 10, l1: 15, l2: 20, l3: 25, harvesting: 17.5 },
  'PLANCHA': { trans: 'Motorista', logistica: 3, diag: 6, l1: 8.4, l2: 10, l3: 14, harvesting: 9.6 },
  'VENTILADOR': { trans: 'Motorista', logistica: 3, diag: 3.5, l1: 5, l2: 7.5, l3: 9.5, harvesting: 5 },
  'MI LCD TABLET': { trans: 'Motorista', logistica: 3, diag: 3.5, l1: 5, l2: 7.5, l3: 9.5, harvesting: 5 },
  'TERMOMETRO': { trans: 'Motorista', logistica: 3, diag: 3.5, l1: 5, l2: 7.5, l3: 9.5, harvesting: 5 },
  'ASPIRADORA DE MANO': { trans: 'vehículo', logistica: 5, diag: 8, l1: 15, l2: 20, l3: 25, harvesting: 10 }
};

export function processOrderryRawData(data: RawOrderryOrder[]): ProcessedClaim[] {
  const processed: ProcessedClaim[] = [];

  for (const raw of data) {
    const canalVal = findVal(raw, ['canal de ingreso', 'canal']) || raw.custom_fields?.f3129964 || raw.branch?.name || raw.client?.name;
    const canalIngreso = safeString(canalVal);
    
    const grupoVal = raw.grupo_dispositivo || raw.grupoDispositivo || raw['Grupo de dispositivos'] || raw.kindof_good?.name || raw.kindof_good || raw.grupo || findVal(raw, ['grupo de dispositivo', 'grupo']);
    const grupoDispositivos = safeString(grupoVal);

    // historial_estados checking
    let historyStr = '';
    const histVal = findVal(raw, ['historial']);
    if (Array.isArray(histVal)) {
      historyStr = histVal.join(' ').toUpperCase();
    } else if (histVal) {
      historyStr = String(histVal).toUpperCase();
    } else if (raw.status_history && Array.isArray(raw.status_history)) {
      historyStr = raw.status_history.map((sh: any) => sh.name || '').join(' ').toUpperCase();
    }

    const estVal = findVal(raw, ['estado', 'status']);
    const estado = safeString(estVal || raw.status?.name);

    const tipoVal = findVal(raw, ['tipo de orden']) || raw.tipo_orden || raw.custom_fields?.f3129962;
    let tipoOrden = safeString(tipoVal);
    
    if (!tipoOrden && estado.includes('DEVOLUCIÓN')) {
      tipoOrden = 'DEVOLUCION SAP';
    }

    // 1. Canal de Ingreso Filter (DESACTIVADO PARA MOSTRAR TODOS LOS DATOS)
    // if (!canalIngreso) continue;
    // if (!(canalIngreso.includes('XIAOMI') || canalIngreso.includes('DISTESA') || canalIngreso.includes('REPCEL'))) {
    //   continue;
    // }

    // 2. Hardware and Brand Exclusion Filter
    const brandStr = safeString(findVal(raw, ['brand', 'marca', 'Marca del dispositivo']) || raw.brand?.name || raw.marcaDispositivo);
    
    const rawStringified = JSON.stringify(raw).toUpperCase();
    if (
      rawStringified.includes('TELEFONO') ||
      rawStringified.includes('SMARTPHONE') ||
      rawStringified.includes('FEATURE PHONE') ||
      rawStringified.includes('CELULAR') ||
      rawStringified.includes('TABLET') ||
      rawStringified.includes('PAD') ||
      brandStr.includes('BLACK') ||
      brandStr.includes('DECKER') ||
      brandStr.includes('REMINGTON')
    ) {
      continue;
    }


    // ==========================================
    // MODULE: PRICING & LOGISTICS CALCULATION
    // ==========================================
    
    // Default matrix fallback (standard small device)
    let matrix = PRICING_MATRIX['AUDIFONOS'];
    let baseGroup = 'OTRO';
    
    // Find the matching product in our pricing matrix
    for (const key of Object.keys(PRICING_MATRIX)) {
      if (grupoDispositivos.toUpperCase().includes(key)) {
        matrix = PRICING_MATRIX[key];
        baseGroup = key;
        break;
      }
    }
    
    // Extraer modelo real si viene ligado
    const rawModel = safeString(findVal(raw, ['model', 'modelo', 'Modelo de dispositivo']));
    let resolvedModelo = rawModel ? rawModel : grupoDispositivos;
    const resolvedGrupo = baseGroup !== 'OTRO' ? baseGroup : grupoDispositivos;
    
    // LIMPIEZA DEL MODELO: Extraer después de la barra diagonal si existe
    if (resolvedModelo.includes('/')) {
      const parts = resolvedModelo.split('/');
      resolvedModelo = parts[parts.length - 1].trim();
    }
    
    // LIMPIEZA DEL MODELO: Remover palabras redundantes de grupo y marca
    const wordsToRemove = [
      resolvedGrupo, brandStr, 'XIAOMI', 'ROBOT', 'ELÉCTRICO', 'ELECTRICO', 'POWER', 'BANK', 'SMART'
    ].filter(Boolean);

    wordsToRemove.forEach(word => {
      // Escapar caracteres especiales para que no rompa el RegExp
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Remover la palabra sin importar mayúsculas/minúsculas
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      resolvedModelo = resolvedModelo.replace(regex, '');
    });
    // Limpiar espacios dobles o al inicio/final
    resolvedModelo = resolvedModelo.replace(/\s+/g, ' ').trim();

    // Si al limpiar se quedó vacío, devolvemos el original por seguridad
    if (!resolvedModelo) {
      resolvedModelo = rawModel ? rawModel : grupoDispositivos;
      // Re-aplicar el split si era necesario
      if (resolvedModelo.includes('/')) {
        const parts = resolvedModelo.split('/');
        resolvedModelo = parts[parts.length - 1].trim();
      }
    }
    // Determine Logistics (Motorista vs Vehiculo)
    const transporte = matrix.trans;
    let logistica = 0;
    const isCapital = 
      canalIngreso.includes('MIRAFLORES') || 
      canalIngreso.includes('OAKLAND') || 
      canalIngreso.includes('PRADERA CONCEPCION') || 
      canalIngreso.includes('PORTALES') || 
      canalIngreso.includes('REPCEL DE DISTESA');

    if (isCapital) {
      logistica = transporte === 'vehículo' ? 10.00 : 3.00;
    } else {
      // TIENDAS DEL INTERIOR
      logistica = 0.00; // Según la regla anterior
    }

    // Determine Repair Level
    let repairLevel = 'L2'; // Default to L2 as per standard operations unless specified
    const worksStr = JSON.stringify(raw.works || []).toUpperCase() + historyStr;
    if (worksStr.includes('L1') || worksStr.includes('CALIBRACION') || worksStr.includes('SOFTWARE')) {
      repairLevel = 'L1';
    }
    if (worksStr.includes('L3') || worksStr.includes('CIRCUITO') || worksStr.includes('PLACA') || worksStr.includes('MOTHERBOARD') || worksStr.includes('SOLDADURA')) {
      repairLevel = 'L3';
    }
    if (worksStr.includes('L2') || worksStr.includes('PARTES') || worksStr.includes('TURBINA') || worksStr.includes('PANTALLA') || worksStr.includes('BATERIA') || worksStr.includes('BATERÍA')) {
      repairLevel = 'L2';
    }

    let reparacion = 0;
    let harvesting = matrix.harvesting;
    let partes = 0;
    let statusCalc = 'OTRO';

    // 1. Case: MANTENIMIENTOS
    if (tipoOrden.includes('MANTENIMIENTO') || estado.includes('MANTENIMIENTO')) {
      reparacion = 0.00; // Flat fee or 0 based on new matrix logic, let's keep it 0 as it's not in matrix
      logistica = 0.00; // Según instrucciones, no se cobra logística ni mano de obra
      harvesting = 0.00;
      statusCalc = 'MANTENIMIENTO';
    }
    // 2. Case: DOA / RETURN
    else if (tipoOrden.includes('DEVOLUCIÓN') || tipoOrden.includes('DOA') || tipoOrden.includes('DEVOLUCION')) {
      if (estado.includes('REPARADO')) {
        reparacion = matrix.l1;
        statusCalc = 'DTI/DOA APPROVED';
      } else if (estado.includes('RECHAZADO') || estado.includes('DEVUELTO')) {
        reparacion = matrix.diag;
        statusCalc = 'DTI/DOA REJECTED (DIAGNOSTIC FEE)';
      } else {
        reparacion = 0;
        statusCalc = 'DTI/DOA PENDING';
      }
    }
    // 3. Case: OUT OF WARRANTY (OOW)
    else if (tipoOrden.includes('OOW') || tipoOrden.includes('OUT OF WARRANTY')) {
      if (estado.includes('REPARADO')) {
        reparacion = repairLevel === 'L1' ? matrix.l1 : repairLevel === 'L3' ? matrix.l3 : matrix.l2;
        statusCalc = 'OOW APPROVED';
      } else if (estado.includes('RECHAZADO')) {
        reparacion = matrix.diag;
        statusCalc = 'OOW REJECTED (DIAGNOSTIC FEE)';
      } else {
        reparacion = 0;
        statusCalc = 'OOW IN PROGRESS';
      }
    }
    // 4. Case: IN-WARRANTY REPAIR (IW)
    else if (tipoOrden.includes('REPARACION IW') || tipoOrden.includes('REPARACIÓN IW')) {
      if (estado.includes('REPARADO')) {
        reparacion = repairLevel === 'L1' ? matrix.l1 : repairLevel === 'L3' ? matrix.l3 : matrix.l2;
        statusCalc = 'IW STANDARD';
      } else {
        reparacion = 0;
        statusCalc = 'IW IN PROGRESS / OTHER';
      }
    }

    // PHASE 2.5: FINAL STATUS (REPARADO / NO REPARADO) BASED ON HISTORY
    let finalStatus = 'OTRO';
    
    // Regla: Si cerró en Nota de Crédito, o pasó por ahí
    if (estado.includes('NOTA DE CREDITO') || historyStr.includes('NOTA DE CREDITO') || estado.includes('NOTA DE CRÉDITO') || historyStr.includes('NOTA DE CRÉDITO')) {
      finalStatus = 'NOTA DE CREDITO';
    } 
    // Regla: Si pasó por Esperando Aprobación y NO fue rechazado
    else if (historyStr.includes('ESPERANDO APROBACION') && !estado.includes('RECHAZADO') && !historyStr.includes('RECHAZADO')) {
      finalStatus = 'REPARADO';
    } 
    // Regla: Si pasó por Reparación y Control de Calidad (y/o Para Devolver)
    else if (historyStr.includes('REPARACION') && historyStr.includes('CONTROL DE CALIDAD')) {
      finalStatus = 'REPARADO';
    }
    // Regla de rechazo general
    else if (estado.includes('RECHAZADO') || historyStr.includes('RECHAZADO')) {
      finalStatus = 'NO REPARADO';
    }
    // Fallback original para OOW e IW
    else if (statusCalc.includes('APPROVED') || statusCalc.includes('IW STANDARD')) {
      finalStatus = 'REPARADO';
    } else if (statusCalc.includes('REJECTED')) {
      finalStatus = 'NO REPARADO';
    }

    // PHASE 3: FINANCIAL EQUATIONS & PRECISION
    const subTotal = parseFloat((logistica + harvesting + partes + reparacion).toFixed(2));
    const iva = parseFloat((subTotal * 0.12).toFixed(2));
    const totalClaim = parseFloat((subTotal + iva).toFixed(2));

    processed.push({
      orderNumber: raw.id || raw['ID'] || raw['id_orden'] || raw['Orden #'] || raw['Nº de pedido'] || raw['Numero'] || 'N/A',
      canalIngreso,
      grupoDispositivo: resolvedGrupo,
      modelo: resolvedModelo,
      tipoOrden,
      estado,
      transporte,
      logistica,
      harvesting,
      partes,
      reparacion,
      statusCalc,
      finalStatus,
      subTotal,
      iva,
      totalClaim,
      rawRecord: raw,
    });
  }

  return processed;
}

export const CLAIMS_HEADERS_64 = [
  'Creado en', 'Orden #', 'Tipo de orden', 'Estado', 'Nombre del cliente', 
  'Teléfono del cliente', 'Dirección', 'Email', 'Grupo de dispositivos', 'Marca del dispositivo', 
  'Modelo de dispositivo', 'Modificación del dispositivo', 'Número de serie', 'Fecha de vencimiento', 
  'Producto', 'trasporte', 'logistica', 'Harvesting', 'Partes', 'Reparacion', 'STATUS', 
  'Justificación ', 'Notas del especialista', 'Servicios/Obras', 'Productos', 
  'Veredicto / recomendaciones del cliente', 'Precio estimado', 'Mal funcionamiento', 
  'Comentario', 'FECHA DE VENTA -POP', 'COLOR', 'GARANTIA', 
  'CANAL DE INGRESO', 'TIPO DE INGRESO', 
  'FOLIO PDV', 'IN COURIER', 'NOTA'
];

export const getClaimRowValues = (claim: ProcessedClaim): Record<string, any> => {
  const r = claim.rawRecord;
  const getValue = (keys: string[]) => {
    for (const k of keys) {
      if (r[k] !== undefined && r[k] !== null) return r[k];
    }
    return '';
  };

  const rowValues: Record<string, any> = {};
  
  CLAIMS_HEADERS_64.forEach(h => {
    let val = r[h] !== undefined ? r[h] : (r.custom_fields && r.custom_fields[h] !== undefined ? r.custom_fields[h] : '');
    
    if (!val) {
      if (h === 'Creado en' || h === 'Creado') val = getValue(['created_at', 'Creado en', 'Creado']);
      else if (h === 'Orden #') val = claim.orderNumber;
      else if (h === 'Tipo de orden') val = getValue(['order_type', 'tipo_orden', 'Tipo de orden']) || claim.tipoOrden;
      else if (h === 'Estado') val = getValue(['status', 'estado', 'Estado']) || claim.estado;
      else if (h === 'Nombre del cliente') val = getValue(['client_name', 'cliente', 'Nombre del cliente']) || 'SIN REGISTRO';
      else if (h === 'Teléfono del cliente') val = getValue(['phone', 'teléfono', 'Teléfono del cliente']) || 'N/A';
      else if (h === 'Dirección') val = getValue(['address', 'Dirección']) || 'N/A';
      else if (h === 'Email') val = getValue(['email', 'Email']) || 'N/A';
      else if (h === 'Grupo de dispositivos') val = claim.grupoDispositivo;
      else if (h === 'Marca del dispositivo') val = getValue(['brand', 'marca', 'Marca del dispositivo']);
      else if (h === 'Modelo de dispositivo') val = claim.modelo;
      else if (h === 'Número de serie') val = getValue(['serial', 'IMEI', 'Número de serie', 'Número de serie.1']);
      else if (h === 'Notas del especialista') val = getValue(['engineer_notes', 'notas', 'Notas del especialista']);
      else if (h === 'Servicios/Obras') val = getValue(['works', 'servicios', 'Servicios/Obras']);
      else if (h === 'Productos') val = getValue(['parts', 'Productos']);
      else if (h === 'CANAL DE INGRESO' || h === 'CANAL INGRESO') val = claim.canalIngreso;
    }
    
    rowValues[h] = val;
  });

  rowValues['Producto'] = claim.grupoDispositivo || 'SIN GRUPO';
  rowValues['trasporte'] = claim.transporte;
  rowValues['logistica'] = Number(claim.logistica.toFixed(2));
  rowValues['Harvesting'] = Number(claim.harvesting.toFixed(2));
  rowValues['Partes'] = Number(claim.partes.toFixed(2));
  rowValues['Reparacion'] = Number(claim.reparacion.toFixed(2));
  rowValues['STATUS'] = claim.finalStatus;
  
  // Format Date for Guatemala
  const formatDateGT = (dateVal: any) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  };

  if (rowValues['Creado en']) rowValues['Creado en'] = formatDateGT(rowValues['Creado en']);
  if (rowValues['Creado']) rowValues['Creado'] = formatDateGT(rowValues['Creado']);

  // Extract explicit MARCA if combined or ensure they are present clearly
  const marcaRaw = String(getValue(['brand', 'marca', 'Marca del dispositivo', 'Marca']) || '');
  
  if (!rowValues['Marca del dispositivo']) rowValues['Marca del dispositivo'] = marcaRaw;
  
  // SOBRESCRIBIR siempre con la versión procesada y limpia del motor
  rowValues['Grupo de dispositivos'] = claim.grupoDispositivo;
  rowValues['Modelo de dispositivo'] = claim.modelo;

  return rowValues;
};

export async function exportClaimsToExcelWorkbook(claims: ProcessedClaim[], rawFilteredData: RawOrderryOrder[], outputPath?: string, periodoTexto?: string): Promise<Blob | void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DISTESA Claims Engine';
  workbook.created = new Date();

  // Determinar periodo
  const date = new Date();
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const pTexto = periodoTexto || `${meses[date.getMonth()]} ${date.getFullYear()}`;

  // Worksheet 1: RESUMEN [MES] [AÑO]
  const resumenSheet = workbook.addWorksheet(`RESUMEN ${pTexto}`);
  
  // Conceptos
  let totalLogistica = 0;
  let totalHarvesting = 0;
  let totalPartes = 0;
  let totalReparacion = 0;
  let subTotal = 0;
  let iva = 0;
  let total = 0;

  // Totales por producto para matriz
  const pivotData: Record<string, { mantenimientos: number; noReparado: number; notaCredito: number; reparado: number; total: number }> = {};

  claims.forEach(c => {
    totalLogistica += c.logistica;
    totalHarvesting += c.harvesting;
    totalPartes += c.partes;
    totalReparacion += c.reparacion;
    subTotal += c.subTotal;
    iva += c.iva;
    total += c.totalClaim;

    const prod = c.grupoDispositivo || 'SIN GRUPO';
    if (!pivotData[prod]) {
      pivotData[prod] = { mantenimientos: 0, noReparado: 0, notaCredito: 0, reparado: 0, total: 0 };
    }

    const finalStatus = c.finalStatus;
    if (finalStatus === 'MANTENIMIENTOS') pivotData[prod].mantenimientos++;
    else if (finalStatus === 'NO REPARADO') pivotData[prod].noReparado++;
    else if (finalStatus === 'NOTA DE CREDITO') pivotData[prod].notaCredito++;
    else if (finalStatus === 'REPARADO') pivotData[prod].reparado++;
    
    pivotData[prod].total++;
  });

  // Top-left Matrix: Totals by Concept
  resumenSheet.getCell('B2').value = 'CONCEPTO';
  resumenSheet.getCell('C2').value = 'VALOR';
  resumenSheet.getCell('B2').font = { bold: true };
  resumenSheet.getCell('C2').font = { bold: true };

  const concepts = [
    { label: 'Logistica', value: totalLogistica },
    { label: 'Harvesting', value: totalHarvesting },
    { label: 'Partes', value: totalPartes },
    { label: 'Reparacion', value: totalReparacion },
    { label: 'SUB- Total', value: subTotal, bold: true },
    { label: 'IVA', value: iva, bold: true },
    { label: 'TOTAL', value: total, bold: true },
  ];

  concepts.forEach((c, i) => {
    const row = 3 + i;
    resumenSheet.getCell(`B${row}`).value = c.label;
    resumenSheet.getCell(`C${row}`).value = Number(c.value.toFixed(2));
    resumenSheet.getCell(`C${row}`).numFmt = '"$"#,##0.00';
    if (c.bold) {
      resumenSheet.getCell(`B${row}`).font = { bold: true };
      resumenSheet.getCell(`C${row}`).font = { bold: true };
    }
  });

  // Bottom Matrix: Segmentation by Product
  const headerRow14 = resumenSheet.getRow(14);
  headerRow14.getCell(3).value = 'Producto';
  headerRow14.getCell(4).value = 'MANTENIMIENTOS';
  headerRow14.getCell(5).value = 'NO REPARADO';
  headerRow14.getCell(6).value = 'NOTA DE CREDITO';
  headerRow14.getCell(7).value = 'REPARADO';
  headerRow14.getCell(8).value = 'Total';

  for (let i = 3; i <= 8; i++) {
    headerRow14.getCell(i).font = { bold: true };
    headerRow14.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    resumenSheet.getColumn(i).width = 20;
  }

  let rowIdx = 15;
  for (const [prod, data] of Object.entries(pivotData)) {
    const r = resumenSheet.getRow(rowIdx++);
    r.getCell(3).value = prod;
    r.getCell(4).value = data.mantenimientos;
    r.getCell(5).value = data.noReparado;
    r.getCell(6).value = data.notaCredito;
    r.getCell(7).value = data.reparado;
    r.getCell(8).value = data.total;
  }
  resumenSheet.getColumn(2).width = 25;

  // Worksheet 2: ECOSITEMAS [MES] [AÑO]
  const ecosistemasSheet = workbook.addWorksheet(`ECOSITEMAS ${pTexto}`);
  
  ecosistemasSheet.columns = CLAIMS_HEADERS_64.map(h => ({ header: h, key: h, width: 20 }));

  // Formato cabecera Ecosistemas
  const ecoHeaderRow = ecosistemasSheet.getRow(1);
  ecoHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E4D2B' }, // Dark corporate green
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ecosistemasSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Inyectar datos
  claims.forEach((claim) => {
    const rowValues = getClaimRowValues(claim);
    // Stringify objects if they passed through
    for (const k of Object.keys(rowValues)) {
      if (typeof rowValues[k] === 'object' && rowValues[k] !== null) {
        rowValues[k] = JSON.stringify(rowValues[k]);
      }
    }
    ecosistemasSheet.addRow(rowValues);
  });

  // Apply Q currency to monetary columns in sheet 2 and alignment
  const moneyCols = ['logistica', 'Harvesting', 'Partes', 'Reparacion'];
  moneyCols.forEach(k => {
    const col = ecosistemasSheet.getColumn(k);
    col.numFmt = '"$"#,##0.00';
    col.alignment = { horizontal: 'right' };
  });

  // Autoajuste columnas
  ecosistemasSheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, cell => {
      const cellValue = cell.value;
      if (cellValue) {
        const columnLength = cellValue.toString().length;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      }
    });
    // Set width with some padding, max 50 to avoid crazy widths
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  if (typeof window !== 'undefined') {
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } else if (outputPath) {
    await workbook.xlsx.writeFile(outputPath);
  }
}
