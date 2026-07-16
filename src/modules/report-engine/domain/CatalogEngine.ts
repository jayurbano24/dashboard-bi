export class CatalogEngine {
  private agencyDirectory: Record<string, string> = {};

  constructor() {
    this.loadFallbackDirectory();
  }

  private loadFallbackDirectory() {
    const cacsGuatemala = [
      'G201', 'G202', 'G203', 'G204', 'G205', 'G206', 'G207', 'G208', 'G209', 'G210',
      'G211', 'G212', 'G213', 'G214', 'G215', 'G216', 'G217', 'G218', 'G21A', 'G220',
      'G222', 'G223', 'G225', 'G226', 'G227', 'G228', 'G229', 'G250', 'G26G', 'G270',
      'G271', 'G278', 'G279', 'G27M'
    ];
    cacsGuatemala.forEach((code) => {
      this.agencyDirectory[code] = 'Metro 1';
    });

    const cacsForaneos: Record<string, string> = {
      'G254': 'Sacatepéquez', 'G256': 'Chimaltenango', 'G255': 'Sacatepéquez', 'G26J': 'Santa Rosa',
      'G26A': 'El Progreso', 'G262': 'Jalapa', 'G26B': 'El Progreso',
      'G234': 'Jutiapa', 'G231': 'Jutiapa',
      'G264': 'Chiquimula', 'G267': 'Zacapa', 'G268': 'Petén', 'G277': 'Izabal',
      'G275': 'Alta Verapaz', 'G272': 'Alta Verapaz', 'G276': 'Izabal', 'G273': 'Baja Verapaz',
      'G269': 'Zacapa', 'G241': 'Quetzaltenango', 'G238': 'Quetzaltenango', 'G240': 'San Marcos',
      'G239': 'Quetzaltenango', 'G23Q': 'Quetzaltenango', 'G26H': 'Quetzaltenango', 'G244': 'San Marcos',
      'G246': 'San Marcos', 'G245': 'San Marcos', 'G242': 'Huehuetenango', 'G257': 'Sololá',
      'G274': 'Quiché', 'G252': 'Escuintla', 'G253': 'Escuintla',
      'G258': 'Escuintla', 'G248': 'Suchitepéquez', 'G247': 'Suchitepéquez', 'G251': 'Retalhuleu',
      'G249': 'Suchitepéquez'
    };

    Object.assign(this.agencyDirectory, cacsForaneos);
    cacsGuatemala.forEach((code) => {
      this.agencyDirectory[code] = 'Metro 1';
    });
  }

  public getRegion(prefix: string): string {
    return this.agencyDirectory[prefix.toUpperCase()] || 'Metro 1'; // Por defecto GAM
  }

  public isGam(region: string): boolean {
    return region.toUpperCase().includes('METRO') || region.toUpperCase() === 'GUATEMALA';
  }
}
