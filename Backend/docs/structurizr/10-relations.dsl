model {
  // علاقات واجهات أمامية مع API
  kaleem.platform_admin_portal -> kaleem.api "REST/JSON"
  kaleem.merchant_portal       -> kaleem.api "REST/JSON"
  kaleem.web_chat              -> kaleem.api "جلسات/رسائل" "REST/WebSocket"
  kaleem.storefront            -> kaleem.api "Browsing/Cart" "REST/JSON"

  // قرار الذكاء والأدوات
  kaleem.api       -> kaleem.n8n       "Invoke AI workflow" "REST"
  kaleem.api       -> kaleem.extractor "Trigger extraction" "HTTP"
  kaleem.extractor -> kaleem.rabbit    "Publish indexing tasks" "AMQP"
  kaleem.workers   -> kaleem.qdrant    "Upsert vectors" "HTTP"

  // قواعد البيانات والكاش والرسائل
  kaleem.api     -> kaleem.mongodb "CRUD" "Driver"
  kaleem.api     -> kaleem.redis   "Cache" "TCP"
  kaleem.api     -> kaleem.rabbit  "Publish events" "AMQP"
  kaleem.workers -> kaleem.rabbit  "Consume jobs" "AMQP"
  kaleem.api     -> kaleem.qdrant  "Search" "HTTP"
  kaleem.api     -> kaleem.embed   "Create embedding" "HTTP"

  // أدوات من n8n إلى API
  kaleem.n8n -> kaleem.api "Tool-calls (searchProducts/knowledge)" "REST"

  // ربط مكونات الـ API داخليًا (أمثلة مختصرة)
  kaleem.api."ChannelWebhookController" -> kaleem.api."WebhookSignatureVerifier" "تحقق التوقيع"
  kaleem.api."ChannelWebhookController" -> kaleem.api."ConversationService"
  kaleem.api."ConversationsController"  -> kaleem.api."ConversationService"
  kaleem.api."ConversationsController"  -> kaleem.api."ConversationPolicyGuard"
  kaleem.api."ConversationPolicyGuard"  -> kaleem.api."AIOrchestratorClient"

  kaleem.api."ProductSearchService" -> kaleem.api."VectorService"
  kaleem.api."KnowledgeService"     -> kaleem.api."VectorService"
  kaleem.api."VectorService"        -> kaleem.api."EmbeddingClient"
  kaleem.api."KnowledgeService"     -> kaleem.api."ExtractorClient"

  // قنوات وتكاملات خارجية
  merchant_site -> kaleem.web_chat "استضافة ودجت الويب شات"
  whatsapp      -> kaleem.api "Inbound Webhook (messages/status)" "HTTPS"
  kaleem.api    -> whatsapp  "Send message" "HTTPS"
  telegram      -> kaleem.api "Inbound Webhook (updates)" "HTTPS"
  kaleem.api    -> telegram  "Send message" "HTTPS"
  kaleem.api    -> salla   "Sync منتجات/طلبات" "REST"
  kaleem.api    -> zid     "Sync منتجات/طلبات" "REST"
  kaleem.api    -> shopify "Sync منتجات/طلبات" "REST"
  kaleem.api    -> payment "إنشاء مدفوعات/تحقق" "REST"
  kaleem.n8n    -> llm     "Prompting/Completion" "HTTPS"
}
