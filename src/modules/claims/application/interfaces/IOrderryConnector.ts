export interface OrderryOrderData {
  orderId: string;
  customerName: string;
  model: string;
  brand: string;
  imei: string;
  serial: string;
  warrantyType: string;
  malfunction: string;
  services: any[];
  parts: any[];
  statusHistory: any[];
  technician: string;
  createdAt: string;
  closedAt?: string;
  status: string;
}

export interface IOrderryConnector {
  /**
   * Fetches raw order data from the Orderry API.
   * Does NOT contain business rules, just data retrieval.
   */
  getOrder(orderId: string): Promise<OrderryOrderData | null>;
}
