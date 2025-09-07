import { describe, it, expect } from "vitest";
import type { Banner, CustomerInfo, OrderProduct, Order, Lead } from "./type";

describe("Store Types", () => {
  describe("Banner", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const banner: Banner = {
        image: "https://example.com/banner.jpg",
        text: "عرض خاص",
        url: "https://example.com/offer",
        color: "#FF0000",
        active: true,
        order: 1,
      };

      expect(banner.image).toBe("https://example.com/banner.jpg");
      expect(banner.text).toBe("عرض خاص");
      expect(banner.url).toBe("https://example.com/offer");
      expect(banner.color).toBe("#FF0000");
      expect(banner.active).toBe(true);
      expect(banner.order).toBe(1);
    });

    it("يجب أن يكون النص مطلوباً", () => {
      const banner: Banner = {
        text: "عرض خاص",
      };

      expect(banner.text).toBe("عرض خاص");
    });
  });

  describe("CustomerInfo", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const customer: CustomerInfo = {
        name: "أحمد محمد",
        phone: "+966501234567",
        address: "الرياض، المملكة العربية السعودية",
      };

      expect(customer.name).toBe("أحمد محمد");
      expect(customer.phone).toBe("+966501234567");
      expect(customer.address).toBe("الرياض، المملكة العربية السعودية");
    });

    it("يجب أن يدعم الخصائص الإضافية", () => {
      const customer: CustomerInfo = {
        name: "أحمد محمد",
        phone: "+966501234567",
        address: "الرياض، المملكة العربية السعودية",
        email: "ahmed@example.com",
        city: "الرياض",
      };

      expect(customer.email).toBe("ahmed@example.com");
      expect(customer.city).toBe("الرياض");
    });
  });

  describe("OrderProduct", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const orderProduct: OrderProduct = {
        productId: "prod-123",
        name: "منتج تجريبي",
        quantity: 2,
        price: 100.50,
        image: "https://example.com/product.jpg",
      };

      expect(orderProduct.productId).toBe("prod-123");
      expect(orderProduct.name).toBe("منتج تجريبي");
      expect(orderProduct.quantity).toBe(2);
      expect(orderProduct.price).toBe(100.50);
      expect(orderProduct.image).toBe("https://example.com/product.jpg");
    });

    it("يجب أن يدعم كائن المنتج الكامل", () => {
      const orderProduct: OrderProduct = {
        productId: "prod-123",
        product: {
          _id: "prod-123",
          merchantId: "merchant-123",
          name: "منتج تجريبي",
          description: "وصف المنتج",
          price: 100.50,
          images: ["https://example.com/product.jpg"],
          isAvailable: true,
          category: "test-category",
          specsBlock: [],
          keywords: [],
          source: "manual",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        name: "منتج تجريبي",
        quantity: 1,
        price: 100.50,
      };

      expect(typeof orderProduct.product === 'object' && orderProduct.product?._id).toBe("prod-123");
      expect(typeof orderProduct.product === 'object' && orderProduct.product?.name).toBe("منتج تجريبي");
    });
  });

  describe("Order", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const order: Order = {
        _id: "order-123",
        merchantId: "merchant-456",
        sessionId: "session-789",
        customer: {
          name: "أحمد محمد",
          phone: "+966501234567",
          address: "الرياض، المملكة العربية السعودية",
        },
        products: [
          {
            productId: "prod-123",
            name: "منتج تجريبي",
            quantity: 2,
            price: 100.50,
          },
        ],
        status: "pending",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      expect(order._id).toBe("order-123");
      expect(order.merchantId).toBe("merchant-456");
      expect(order.sessionId).toBe("session-789");
      expect(order.customer.name).toBe("أحمد محمد");
      expect(order.products).toHaveLength(1);
      expect(order.status).toBe("pending");
      expect(order.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(order.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("يجب أن يدعم حالات الطلب المختلفة", () => {
      const pendingOrder: Order = {
        _id: "order-1",
        merchantId: "merchant-1",
        sessionId: "session-1",
        customer: { name: "أحمد", phone: "+966501234567", address: "الرياض" },
        products: [],
        status: "pending",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      const paidOrder: Order = {
        _id: "order-2",
        merchantId: "merchant-1",
        sessionId: "session-1",
        customer: { name: "أحمد", phone: "+966501234567", address: "الرياض" },
        products: [],
        status: "paid",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      const canceledOrder: Order = {
        _id: "order-3",
        merchantId: "merchant-1",
        sessionId: "session-1",
        customer: { name: "أحمد", phone: "+966501234567", address: "الرياض" },
        products: [],
        status: "canceled",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      expect(pendingOrder.status).toBe("pending");
      expect(paidOrder.status).toBe("paid");
      expect(canceledOrder.status).toBe("canceled");
    });
  });

  describe("Lead", () => {
    it("يجب أن يكون له الخصائص المطلوبة", () => {
      const lead: Lead = {
        _id: "lead-123",
        merchantId: "merchant-456",
        sessionId: "session-789",
        data: {
          name: "أحمد محمد",
          phone: "+966501234567",
          address: "الرياض، المملكة العربية السعودية",
        },
        source: "storefront",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      expect(lead._id).toBe("lead-123");
      expect(lead.merchantId).toBe("merchant-456");
      expect(lead.sessionId).toBe("session-789");
      expect(lead.data.name).toBe("أحمد محمد");
      expect(lead.source).toBe("storefront");
      expect(lead.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(lead.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("يجب أن يكون المصدر اختياري", () => {
      const lead: Lead = {
        _id: "lead-123",
        merchantId: "merchant-456",
        sessionId: "session-789",
        data: {
          name: "أحمد محمد",
          phone: "+966501234567",
          address: "الرياض، المملكة العربية السعودية",
        },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      expect(lead.source).toBeUndefined();
    });
  });
});
