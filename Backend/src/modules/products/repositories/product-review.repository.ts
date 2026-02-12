// src/modules/products/repositories/product-review.repository.ts
import type {
  ProductReview,
  ProductReviewStatus,
} from '../schemas/product-review.schema';

export interface ProductReviewRepository {
  create(review: Partial<ProductReview>): Promise<ProductReview>;
  findById(id: string): Promise<ProductReview | null>;
  findByIdAndMerchant(
    id: string,
    merchantId: string,
  ): Promise<ProductReview | null>;
  findByCustomerAndProduct(
    customerId: string,
    productId: string,
  ): Promise<ProductReview | null>;
  findApprovedByProduct(
    merchantId: string,
    productId: string,
    page: number,
    limit: number,
  ): Promise<{ reviews: ProductReview[]; total: number }>;
  findAllByProduct(
    merchantId: string,
    productId: string,
    page: number,
    limit: number,
    status?: ProductReviewStatus,
  ): Promise<{ reviews: ProductReview[]; total: number }>;
  findAllApprovedByProduct(
    merchantId: string,
    productId: string,
  ): Promise<ProductReview[]>;
  findByCustomer(
    merchantId: string,
    customerId: string,
    page: number,
    limit: number,
  ): Promise<{ reviews: ProductReview[]; total: number }>;
  updateStatus(
    id: string,
    status: ProductReviewStatus,
    approvedAt?: Date,
    rejectedAt?: Date,
  ): Promise<ProductReview | null>;
  deleteById(id: string): Promise<boolean>;
}
