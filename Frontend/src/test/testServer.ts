import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  // Authentication handlers
  http.post("/api/auth/signup", async () => {
    return HttpResponse.json({ 
      accessToken: "test-token-123", 
      user: { 
        id: "user-1", 
        role: "MERCHANT", 
        email: "test@example.com",
        name: "Test User"
      } 
    });
  }),
  
  http.post("/api/auth/login", async () => {
    return HttpResponse.json({ 
      accessToken: "test-token-123", 
      user: { 
        id: "user-1", 
        role: "MERCHANT", 
        email: "test@example.com",
        name: "Test User"
      } 
    });
  }),

  http.post("/api/auth/verify-email", async () => {
    return HttpResponse.json({ 
      success: true, 
      message: "Email verified successfully" 
    });
  }),

  // User profile handlers
  http.get("/api/user/profile", async () => {
    return HttpResponse.json({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: "MERCHANT",
      avatar: null
    });
  }),

  // Products handlers
  http.get("/api/products", async () => {
    return HttpResponse.json({
      products: [
        {
          id: "prod-1",
          name: "Test Product 1",
          price: 99.99,
          description: "Test description",
          category: "Electronics"
        },
        {
          id: "prod-2", 
          name: "Test Product 2",
          price: 149.99,
          description: "Another test description",
          category: "Clothing"
        }
      ],
      total: 2,
      page: 1,
      limit: 10
    });
  }),

  // Categories handlers
  http.get("/api/categories", async () => {
    return HttpResponse.json({
      categories: [
        { id: "cat-1", name: "Electronics", slug: "electronics" },
        { id: "cat-2", name: "Clothing", slug: "clothing" },
        { id: "cat-3", name: "Books", slug: "books" }
      ]
    });
  }),

  // Analytics handlers
  http.get("/api/analytics/dashboard", async () => {
    return HttpResponse.json({
      totalSales: 15000,
      totalOrders: 150,
      totalCustomers: 75,
      monthlyGrowth: 12.5
    });
  }),

  // Knowledge base handlers
  http.get("/api/knowledge/documents", async () => {
    return HttpResponse.json({
      documents: [
        { id: "doc-1", title: "FAQ 1", content: "Test content", type: "faq" },
        { id: "doc-2", title: "Guide 1", content: "Test guide", type: "guide" }
      ]
    });
  }),

  // Generic error handler
  http.all("*", async ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }),
];

export const server = setupServer(...handlers);
