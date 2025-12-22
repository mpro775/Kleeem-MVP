// src/modules/products/repositories/back-in-stock-request.repository.ts
import { BackInStockRequest } from '../schemas/back-in-stock-request.schema';

export interface BackInStockRequestRepository {
  create(request: Partial<BackInStockRequest>): Promise<BackInStockRequest>;
  findById(id: string): Promise<BackInStockRequest | null>;
  findByIdAndMerchant(id: string, merchantId: string): Promise<BackInStockRequest | null>;
  findByProductAndContact(
    merchantId: string,
    productId: string,
    variantId?: string,
    contact?: string,
    customerId?: string,
  ): Promise<BackInStockRequest | null>;
  findByCustomerOrContact(
    merchantId: string,
    customerId?: string,
    contact?: string,
  ): Promise<BackInStockRequest[]>;
  findPendingByProduct(
    merchantId: string,
    productId: string,
    variantId?: string,
  ): Promise<BackInStockRequest[]>;
  updateStatus(id: string, status: string): Promise<boolean>;
  updateStatusAndNotifiedAt(
    id: string,
    status: string,
    notifiedAt: Date,
  ): Promise<boolean>;
  deleteOldRequests(cutoffDate: Date): Promise<number>;
}
