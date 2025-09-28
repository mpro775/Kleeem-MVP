import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('Order Management E2E Tests', () => {
  let app: INestApplication;
  let customerToken: string;
  let merchantToken: string;
  let productId: string;
  let orderId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete Order Lifecycle', () => {
    it('should handle complete order lifecycle from creation to delivery', async () => {
      // Setup: Create customer and merchant accounts
      const customerRegisterDto = {
        email: 'customer@example.com',
        password: 'CustomerPass123!',
        confirmPassword: 'CustomerPass123!',
        firstName: 'John',
        lastName: 'Customer',
        phoneNumber: '+1234567890',
      };

      const merchantRegisterDto = {
        email: 'merchant@example.com',
        password: 'MerchantPass123!',
        confirmPassword: 'MerchantPass123!',
        firstName: 'Jane',
        lastName: 'Merchant',
        phoneNumber: '+1234567891',
      };

      // Register and login customer
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(customerRegisterDto)
        .expect(201);

      const customerLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: customerRegisterDto.email,
          password: customerRegisterDto.password,
        })
        .expect(200);

      customerToken = customerLoginResponse.body.accessToken;

      // Register and login merchant
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(merchantRegisterDto)
        .expect(201);

      const merchantLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: merchantRegisterDto.email,
          password: merchantRegisterDto.password,
        })
        .expect(200);

      merchantToken = merchantLoginResponse.body.accessToken;

      // Create merchant profile and product
      const merchantDto = {
        businessName: 'Test Store',
        businessType: 'retail',
        description: 'Test retail store',
        address: {
          street: '123 Store St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001',
        },
      };

      const merchantResponse = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(merchantDto)
        .expect(201);

      const merchantId = merchantResponse.body.id;

      // Create product
      const productDto = {
        name: 'Test Product',
        description: 'A test product for orders',
        price: 29.99,
        categoryId: 'electronics',
        merchantId: merchantId,
        stock: 100,
        images: ['product1.jpg'],
        tags: ['electronics', 'test'],
      };

      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(productDto)
        .expect(201);

      productId = productResponse.body.id;

      // Step 1: Add product to cart
      const addToCartResponse = await request(app.getHttpServer())
        .post('/cart/add')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: productId,
          quantity: 2,
        })
        .expect(201);

      expect(addToCartResponse.body).toMatchObject({
        message: 'Product added to cart',
        cartItem: expect.objectContaining({
          productId: productId,
          quantity: 2,
        }),
      });

      // Step 2: View cart
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(cartResponse.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: productId,
            quantity: 2,
            price: 29.99,
          }),
        ]),
        total: 59.98,
        itemCount: 2,
      });

      // Step 3: Update cart quantity
      const updateCartResponse = await request(app.getHttpServer())
        .put(`/cart/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 3 })
        .expect(200);

      expect(updateCartResponse.body).toMatchObject({
        message: 'Cart updated successfully',
        quantity: 3,
      });

      // Step 4: Apply discount code
      const discountResponse = await request(app.getHttpServer())
        .post('/cart/discount')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'SAVE10' })
        .expect(200);

      expect(discountResponse.body).toMatchObject({
        message: 'Discount applied successfully',
        discount: expect.objectContaining({
          code: 'SAVE10',
          amount: expect.any(Number),
        }),
      });

      // Step 5: Calculate shipping
      const shippingResponse = await request(app.getHttpServer())
        .post('/orders/calculate-shipping')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: productId, quantity: 3 }],
          shippingAddress: {
            street: '456 Customer Ave',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            postalCode: '10002',
          },
        })
        .expect(200);

      expect(shippingResponse.body).toMatchObject({
        shippingOptions: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            cost: expect.any(Number),
            estimatedDays: expect.any(Number),
          }),
        ]),
      });

      // Step 6: Create order
      const orderDto = {
        items: [{ productId: productId, quantity: 3 }],
        shippingAddress: {
          street: '456 Customer Ave',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10002',
          firstName: 'John',
          lastName: 'Customer',
        },
        billingAddress: {
          street: '456 Customer Ave',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10002',
          firstName: 'John',
          lastName: 'Customer',
        },
        paymentMethod: {
          type: 'credit_card',
          cardToken: 'tok_visa_test',
        },
        shippingMethod: {
          name: 'Standard Shipping',
          cost: 5.99,
        },
        discountCode: 'SAVE10',
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderDto)
        .expect(201);

      expect(orderResponse.body).toMatchObject({
        id: expect.any(String),
        status: 'pending_payment',
        total: expect.any(Number),
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: productId,
            quantity: 3,
          }),
        ]),
      });

      orderId = orderResponse.body.id;

      // Step 7: Process payment
      const paymentResponse = await request(app.getHttpServer())
        .post(`/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentMethod: orderDto.paymentMethod,
          amount: orderResponse.body.total,
        })
        .expect(200);

      expect(paymentResponse.body).toMatchObject({
        status: 'paid',
        transactionId: expect.any(String),
        amount: expect.any(Number),
      });

      // Step 8: Merchant confirms order
      const confirmResponse = await request(app.getHttpServer())
        .put(`/orders/${orderId}/confirm`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          estimatedShipDate: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .expect(200);

      expect(confirmResponse.body).toMatchObject({
        status: 'confirmed',
        estimatedShipDate: expect.any(String),
      });

      // Step 9: Merchant prepares order
      const prepareResponse = await request(app.getHttpServer())
        .put(`/orders/${orderId}/prepare`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          trackingNumber: 'TRK123456789',
          notes: 'Order prepared and ready for shipment',
        })
        .expect(200);

      expect(prepareResponse.body).toMatchObject({
        status: 'preparing',
        trackingNumber: 'TRK123456789',
      });

      // Step 10: Merchant ships order
      const shipResponse = await request(app.getHttpServer())
        .put(`/orders/${orderId}/ship`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          carrier: 'UPS',
          service: 'Ground',
          trackingNumber: 'TRK123456789',
        })
        .expect(200);

      expect(shipResponse.body).toMatchObject({
        status: 'shipped',
        trackingNumber: 'TRK123456789',
        carrier: 'UPS',
        service: 'Ground',
      });

      // Step 11: Order delivered
      const deliverResponse = await request(app.getHttpServer())
        .put(`/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          notes: 'Package received in good condition',
        })
        .expect(200);

      expect(deliverResponse.body).toMatchObject({
        status: 'delivered',
        deliveredAt: expect.any(String),
      });

      // Step 12: Customer reviews order
      const reviewResponse = await request(app.getHttpServer())
        .post(`/orders/${orderId}/review`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'Great product and fast shipping!',
          productReviews: [
            {
              productId: productId,
              rating: 5,
              comment: 'Excellent quality product',
            },
          ],
        })
        .expect(201);

      expect(reviewResponse.body).toMatchObject({
        orderId: orderId,
        rating: 5,
        comment: 'Great product and fast shipping!',
        productReviews: expect.arrayContaining([
          expect.objectContaining({
            productId: productId,
            rating: 5,
          }),
        ]),
      });

      // Step 13: Verify final order status
      const finalOrderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(finalOrderResponse.body).toMatchObject({
        id: orderId,
        status: 'completed',
        total: expect.any(Number),
        trackingNumber: 'TRK123456789',
        deliveredAt: expect.any(String),
        review: expect.objectContaining({
          rating: 5,
        }),
      });
    });

    it('should handle order cancellation flow', async () => {
      // Create order (reusing setup from previous test)
      const orderDto = {
        items: [{ productId: productId, quantity: 1 }],
        shippingAddress: {
          street: '789 Cancel St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10003',
          firstName: 'Cancel',
          lastName: 'Customer',
        },
        billingAddress: {
          street: '789 Cancel St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10003',
          firstName: 'Cancel',
          lastName: 'Customer',
        },
        paymentMethod: {
          type: 'credit_card',
          cardToken: 'tok_visa_test',
        },
        shippingMethod: {
          name: 'Standard Shipping',
          cost: 5.99,
        },
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderDto)
        .expect(201);

      const cancelOrderId = orderResponse.body.id;

      // Process payment first
      await request(app.getHttpServer())
        .post(`/orders/${cancelOrderId}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentMethod: orderDto.paymentMethod,
          amount: orderResponse.body.total,
        })
        .expect(200);

      // Customer requests cancellation
      const cancelRequestResponse = await request(app.getHttpServer())
        .post(`/orders/${cancelOrderId}/cancel-request`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Changed my mind',
          refundRequested: true,
        })
        .expect(200);

      expect(cancelRequestResponse.body).toMatchObject({
        status: 'cancellation_requested',
        reason: 'Changed my mind',
        refundRequested: true,
      });

      // Merchant processes cancellation
      const cancelResponse = await request(app.getHttpServer())
        .put(`/orders/${cancelOrderId}/cancel`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          approved: true,
          refundAmount: orderResponse.body.total,
          notes: 'Cancellation approved, refund processed',
        })
        .expect(200);

      expect(cancelResponse.body).toMatchObject({
        status: 'cancelled',
        refundAmount: expect.any(Number),
        refundStatus: 'processed',
      });

      // Verify order status
      const cancelledOrderResponse = await request(app.getHttpServer())
        .get(`/orders/${cancelOrderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(cancelledOrderResponse.body).toMatchObject({
        id: cancelOrderId,
        status: 'cancelled',
        refundAmount: expect.any(Number),
        refundStatus: 'processed',
      });
    });

    it('should handle order return and refund flow', async () => {
      // Create and deliver order (reusing setup)
      const orderDto = {
        items: [{ productId: productId, quantity: 1 }],
        shippingAddress: {
          street: '321 Return Blvd',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10004',
          firstName: 'Return',
          lastName: 'Customer',
        },
        billingAddress: {
          street: '321 Return Blvd',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10004',
          firstName: 'Return',
          lastName: 'Customer',
        },
        paymentMethod: {
          type: 'credit_card',
          cardToken: 'tok_visa_test',
        },
        shippingMethod: {
          name: 'Standard Shipping',
          cost: 5.99,
        },
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderDto)
        .expect(201);

      const returnOrderId = orderResponse.body.id;

      // Complete order to delivered status (simplified)
      await request(app.getHttpServer())
        .post(`/orders/${returnOrderId}/payment`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentMethod: orderDto.paymentMethod,
          amount: orderResponse.body.total,
        })
        .expect(200);

      // Customer initiates return
      const returnRequestResponse = await request(app.getHttpServer())
        .post(`/orders/${returnOrderId}/return-request`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'defective',
          description: 'Product arrived damaged',
          items: [
            {
              productId: productId,
              quantity: 1,
              reason: 'defective',
            },
          ],
        })
        .expect(201);

      expect(returnRequestResponse.body).toMatchObject({
        returnId: expect.any(String),
        status: 'pending_approval',
        reason: 'defective',
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: productId,
            quantity: 1,
          }),
        ]),
      });

      const returnId = returnRequestResponse.body.returnId;

      // Merchant approves return
      const approveReturnResponse = await request(app.getHttpServer())
        .put(`/returns/${returnId}/approve`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          approved: true,
          refundAmount: orderResponse.body.total,
          returnShippingLabel: 'RET123456789',
        })
        .expect(200);

      expect(approveReturnResponse.body).toMatchObject({
        status: 'approved',
        refundAmount: expect.any(Number),
        returnShippingLabel: 'RET123456789',
      });

      // Customer ships return
      const shipReturnResponse = await request(app.getHttpServer())
        .put(`/returns/${returnId}/ship`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          trackingNumber: 'RET123456789',
          carrier: 'UPS',
        })
        .expect(200);

      expect(shipReturnResponse.body).toMatchObject({
        status: 'return_shipped',
        trackingNumber: 'RET123456789',
      });

      // Merchant receives return and processes refund
      const processReturnResponse = await request(app.getHttpServer())
        .put(`/returns/${returnId}/process`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          received: true,
          condition: 'damaged',
          refundAmount: orderResponse.body.total,
          notes: 'Return received, refund processed',
        })
        .expect(200);

      expect(processReturnResponse.body).toMatchObject({
        status: 'completed',
        refundAmount: expect.any(Number),
        refundStatus: 'processed',
      });

      // Verify return status
      const finalReturnResponse = await request(app.getHttpServer())
        .get(`/returns/${returnId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(finalReturnResponse.body).toMatchObject({
        id: returnId,
        status: 'completed',
        refundAmount: expect.any(Number),
        refundStatus: 'processed',
      });
    });
  });
});
