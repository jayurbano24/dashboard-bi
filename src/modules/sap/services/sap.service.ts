import type { DispatchSapLotCommand, SaveSapLotCommand } from '../application/dtos';
import type { ISapEquipmentRepository, ISapLotRepository } from '../infrastructure/repositories/interfaces';
import { OrderryValidationService } from './orderry-validation.service';
import { SAPDispatchService } from './sap-dispatch.service';
import { SAPHistoryService } from './sap-history.service';
import { SAPLotService } from './sap-lot.service';

/** Facade que orquesta los servicios SAP (Application layer). */
export class SAPService {
  constructor(
    private readonly lotService: SAPLotService,
    private readonly dispatchService: SAPDispatchService,
    private readonly orderryValidation: OrderryValidationService,
    private readonly historyService: SAPHistoryService,
    private readonly equipmentRepo: ISapEquipmentRepository,
    private readonly lotRepo: ISapLotRepository,
  ) {}

  validateImei(imei: string, cookieHeader?: string) {
    return this.orderryValidation.validateImei(imei, cookieHeader);
  }

  saveLot(command: SaveSapLotCommand) {
    return this.lotService.saveLot(command);
  }

  dispatchLot(command: DispatchSapLotCommand) {
    return this.dispatchService.dispatchLot(command);
  }

  listEquipos(filters?: Parameters<ISapEquipmentRepository['list']>[0]) {
    return this.equipmentRepo.list(filters);
  }

  listLotes(filters?: Parameters<ISapLotRepository['list']>[0]) {
    return this.lotRepo.list(filters);
  }

  getHistoryByImei(imei: string) {
    return this.historyService.listByImei(imei);
  }

  getHistoryByLote(loteId: string) {
    return this.historyService.listByLote(loteId);
  }

  deleteEquipo(id: string) {
    return this.equipmentRepo.deleteById(id);
  }
}
