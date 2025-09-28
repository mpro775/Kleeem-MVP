# ERD (Entity Relationship Diagram) Documentation

## Overview
This directory contains the updated Entity Relationship Diagram (ERD) for the Kaleem AI project, reflecting the actual database structure and relationships.

## Recent Updates (September 2025)

### Major Changes Applied:

#### ✅ **Complete Schema Overhaul**
- **Updated all schemas** to reflect the actual project structure
- **Removed outdated fields** and relationships
- **Added missing entities** that were not represented

#### ✅ **Database Collections Updated**
- **Merchant Schema**: Updated with real fields (publicSlug, subscription, workingHours, etc.)
- **Product Schema**: Enhanced with source, externalId, offers, slug fields
- **Category Schema**: Added hierarchical structure (parent, ancestors, path)
- **Channel Schema**: Added provider-specific fields (WhatsApp, Telegram, etc.)
- **User Schema**: Updated with merchantId relationship and auth fields
- **Order Schema**: Enhanced with sessionId, customer data, source tracking

#### ✅ **New Entities Added**
- **Storefront**: Custom storefront configurations
- **SupportTicket**: Customer support system
- **WorkflowHistory**: Version control for workflows
- **ProductSetupConfig**: Integration configurations
- **BotChats, BotPrompt, BotFaq**: AI bot management
- **Vector Database Collections**: Qdrant collections for semantic search

#### ✅ **Improved Relationships**
- **Fixed foreign key relationships** between all entities
- **Added subdocument schemas** (Address, QuickConfig, SubscriptionPlan, etc.)
- **Enhanced multi-tenancy** representation
- **Added system tables** (authentication, usage tracking, event sourcing)

#### ✅ **Technical Improvements**
- **Organized by functional areas** (Core Business Logic, Communication, E-commerce, etc.)
- **Added comprehensive comments** and section dividers
- **Included Vector Database collections** for semantic search
- **Added webhook and event sourcing** entities

## File Structure

```
3-Database Schema/
├── erd.mmd                    # Main ERD diagram (Mermaid format)
├── INDEXING_STRATEGY.md       # Database indexing strategy
├── MULTI_TENANT_STRATEGY.md   # Multi-tenancy implementation
├── ERD_README.md             # This documentation file
└── [other schema files]
```

## Key Relationships

### Core Business Logic
- **User** → **Merchant** (1:N) - Users can own multiple merchants
- **Merchant** → **Product** (1:N) - Merchants have multiple products
- **Product** → **Category** (N:1) - Products belong to categories
- **Category** → **Category** (Self-referential) - Hierarchical category structure

### Communication & Channels
- **Merchant** → **Channel** (1:N) - Merchants configure multiple channels
- **Channel** → **Message** (1:N) - Messages flow through channels
- **Message** → **User** (N:1) - Messages can be rated by users

### E-commerce
- **Merchant** → **Order** (1:N) - Merchants receive orders
- **Product** → **Order** (1:N) - Products can be in multiple orders

### Analytics & AI
- **Merchant** → **AnalyticsEvent** (1:N) - Track events per merchant
- **Merchant** → **Lead** (1:N) - Capture leads per merchant
- **Vector Collections** - Separate collections for semantic search

## Multi-Tenancy Implementation

### Shared Database, Shared Collections
- **Primary Key Strategy**: All collections include `merchantId` as first field
- **Indexing Strategy**: Compound indexes start with `merchantId`
- **Access Control**: Repository layer enforces merchant isolation
- **Rate Limiting**: Per-merchant throttling via `ThrottlerTenantGuard`

### Security Measures
- **Row-Level Security**: All queries filtered by `merchantId`
- **Unique Constraints**: Scoped to merchant (e.g., `(merchantId, slug)`)
- **Webhook Verification**: Signature validation per channel
- **Cache Isolation**: Redis keys include merchant context

## Vector Database (Qdrant)

### Collections
- **ProductsVectors**: Product embeddings with metadata
- **OffersVectors**: Promotional content embeddings
- **FAQsVectors**: FAQ knowledge base embeddings
- **DocumentsVectors**: Document content embeddings

### Payload Structure
```json
{
  "merchantId": "string",
  "productId": "string",
  "categoryId": "string",
  "status": "active|inactive",
  "isAvailable": true,
  "price": 199.0,
  "source": "manual|api"
}
```

## Usage Guidelines

### For Developers
1. **Always include `merchantId`** in queries
2. **Use repository pattern** for data access
3. **Leverage existing indexes** for optimal performance
4. **Follow naming conventions** for consistency

### For Database Administrators
1. **Monitor index usage** regularly
2. **Review cardinality** of multi-tenant indexes
3. **Plan scaling strategies** for growing merchants
4. **Backup and recovery** procedures per merchant

## Future Enhancements

### Potential Improvements
- **Database per tenant** for enterprise customers
- **Read replicas** for improved performance
- **Advanced caching** strategies
- **Automated schema migrations** with zero-downtime

### Monitoring Points
- Index hit ratios
- Query performance per merchant
- Cache effectiveness
- Vector search latency

---

*Last Updated: September 2025*
*Document reflects the actual implementation as of the current codebase*
