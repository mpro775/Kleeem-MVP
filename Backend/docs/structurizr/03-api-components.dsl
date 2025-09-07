model {
  container kaleem.api {
    // Controllers
    component "ChannelWebhookController" "Controller" "Webhook للقنوات"
    component "WebChatController"        "Controller" "جلسات الويب شات / Streaming"
    component "ConversationsController"  "Controller" "إدارة المحادثات"
    component "TrainingController"       "Controller" "تقييم/تدريب"
    component "KnowledgeController"      "Controller" "وثائق/FAQ/فهرسة"
    component "ProductsController"       "Controller" "بحث/تفاصيل/فهرسة منتجات"
    component "StorefrontController"     "Controller" "سلة/طلبات/مدفوعات"
    component "PaymentsController"       "Controller" "بوابة الدفع"
    component "IntegrationsController"   "Controller" "Salla/Zid/Shopify Auth/Sync"
    component "AdminController"          "Controller" "إعدادات عامة/تقارير"

    // Services
    component "ConversationService"      "Service"
    component "ConversationPolicyGuard"  "Service"
    component "HandoffService"           "Service"
    component "AIOrchestratorClient"     "Service"
    component "ToolRegistryService"      "Service"
    component "KnowledgeService"         "Service"
    component "ProductSearchService"     "Service"
    component "VectorService"            "Service"
    component "EmbeddingClient"          "Service"
    component "ExtractorClient"          "Service"
    component "FeedbackService"          "Service"
    component "InstructionService"       "Service"
    component "RerankerService"          "Service"
    component "PaymentsService"          "Service"
    component "IntegrationsService"      "Service"
    component "CacheService"             "Service"
    component "EventBus"                 "Service"
    component "AuditLogger"              "Service"
    component "WebhookSignatureVerifier" "Service"
    component "IdempotencyStore"         "Service"

    // Repos
    component "ConversationRepo" "Repository"
    component "MessageRepo"      "Repository"
    component "UnansweredRepo"   "Repository"
    component "InstructionRepo"  "Repository"
    component "MerchantRepo"     "Repository"
    component "PolicyRepo"       "Repository"
    component "ProductRepo"      "Repository"
    component "KnowledgeRepo"    "Repository"
    component "JobRepo"          "Repository"
  }
}
