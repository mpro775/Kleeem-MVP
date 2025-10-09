# Schema Components Documentation

This directory contains OpenAPI schema components organized by functionality.

## File Structure

### 📁 **auth.yaml** - Authentication & User Management
- `User` - User profile and authentication
- `TokenPair` - Access and refresh token pair
- `AccessOnly` - Access token only response
- `RegisterDto` - User registration data
- `LoginDto` - User login data
- `RefreshRequestDto` - Token refresh request
- `LogoutRequestDto` - User logout request
- Additional auth-related DTOs

### 📁 **business.yaml** - Business Logic Entities
- `Plan` - Subscription plans
- `SubscriptionPlan` - Merchant subscriptions
- `Category` - Product categories with hierarchy
- `Channel` - Communication channels
- `ChannelProvider` - Channel provider enum
- `Lead` - Customer leads
- `Faq` - Frequently asked questions
- `Document` - File documents
- `Integration` - Third-party integrations

### 📁 **responses.yaml** - API Response Structures
- `ApiResponseBase` - Base response wrapper
- `ApiResponseAny` - Generic response with data
- `PageInfo` - Pagination information
- `CursorPageObject` - Paginated response data
- `ApiResponseCursorPage` - Paginated response wrapper
- `ErrorResponse` - Error response structure
- `ApiSuccessBase` - Success response base
- `ApiError` - Detailed error response
- `MessageResponse` - Simple message response
- `ValidateResetResponse` - Password reset validation

### 📁 **analytics.yaml** - Analytics & Communication
- `Message` - Chat messages and interactions
- `MissingResponse` - Unanswered customer queries
- `KleemMissingResponse` - AI-specific missing responses
- `AnalyticsEvent` - System analytics events
- `Stats` - Statistical data
- `UnavailableProduct` - Out of stock products
- `Notification` - User notifications

### 📁 **order.yaml** - Order Management
- `Order` - Customer orders and transactions
- Order items and fulfillment

### 📁 **product.yaml** - Product Management
- `Product` - Product catalog and inventory

### 📁 **merchant.yaml** - Merchant Profiles
- `Merchant` - Business merchant information

### 📁 **common.yaml** - Common Utilities
- `Address` - Physical addresses
- `WorkingHours` - Business hours
- `SourceUrl` - URL sources

## Usage Guidelines

1. **Import Order**: Always import from most specific to general
2. **Referencing**: Use `$ref: '#/components/schemas/SchemaName'`
3. **Extensions**: Extend base schemas rather than duplicating
4. **Validation**: All schemas include proper validation rules
5. **Examples**: Each schema includes realistic examples

## Integration with Main OpenAPI

These components are automatically integrated into the main OpenAPI specification through the `$ref` mechanism, ensuring consistency across all API documentation.
