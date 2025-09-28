# API Examples Documentation

This directory contains comprehensive examples of API requests and responses for all major endpoints in the Kaleem API.

## 📁 Available Examples

### 🔐 Authentication Examples
- **`auth-login.json`** - Successful user login response with tokens
- **`error-response.json`** - Error response format with validation details

### 🏪 E-commerce Examples
- **`products-list-page1.json`** - Paginated products list response
- **`create-product.json`** - Product creation response
- **`orders-list.json`** - Orders list with pagination
- **`categories-list.json`** - Categories with hierarchy

### 💬 Communication Examples
- **`messages-list.json`** - Chat messages with ratings and feedback
- **`missing-responses-list.json`** - Unanswered queries requiring attention
- **`channels-list.json`** - Communication channels configuration

### 📊 Analytics Examples
- **`analytics-overview.json`** - Comprehensive analytics dashboard data

### 🏢 Business Management Examples
- **`plans-list.json`** - Subscription plans and pricing
- **`merchant-profile.json`** - Complete merchant profile with all details

## 🔧 Example Usage

### Request Format
All examples follow the standard API response format:
```json
{
  "success": true,
  "message": null,
  "requestId": "req_123456789",
  "timestamp": "2025-09-26T10:30:00.000Z",
  "data": {
    // Response data here
  }
}
```

### Error Format
Error responses include detailed validation information:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "بيانات المدخلات غير صحيحة",
  "details": ["حقل 'email' مطلوب"],
  "timestamp": "2025-09-26T10:30:00.000Z",
  "requestId": "req_error_001"
}
```

## 🎯 Key Features Demonstrated

### ✅ Pagination
All list endpoints support cursor-based pagination:
```json
{
  "data": {
    "items": [...],
    "pageInfo": {
      "nextCursor": "eyJpZCI6...",
      "previousCursor": null,
      "hasNext": true,
      "hasPrev": false,
      "limit": 20
    }
  }
}
```

### ✅ Rich Product Data
Product examples include comprehensive information:
- Basic info (name, price, description)
- Inventory (stock, availability)
- Media (images, categories)
- Technical specifications (attributes)
- SEO (slugs, descriptions)

### ✅ Complete Order Lifecycle
Order examples show full transaction details:
- Items with quantities and prices
- Customer information
- Shipping addresses
- Order status tracking
- Financial calculations

### ✅ Advanced Analytics
Analytics examples demonstrate:
- Multi-channel performance
- Conversion tracking
- Trend analysis
- Product performance metrics

## 🚀 Integration Testing

These examples can be used for:

1. **API Testing** - Import into Postman or similar tools
2. **SDK Development** - Use as reference for client libraries
3. **Documentation** - Visual examples for developers
4. **Quality Assurance** - Test data validation
5. **Demo Purposes** - Showcase API capabilities

## 📝 Adding New Examples

When adding new examples:

1. Follow the standard response format
2. Include realistic, varied data
3. Add comprehensive field coverage
4. Update this README with the new example
5. Test with actual API calls

## 🔍 Validation

All examples have been validated to:
- ✅ Match API schema definitions
- ✅ Include proper data types
- ✅ Follow pagination standards
- ✅ Use realistic Arabic content
- ✅ Demonstrate error scenarios

---

*These examples represent real-world usage scenarios and can be used as templates for API integration and testing.*
