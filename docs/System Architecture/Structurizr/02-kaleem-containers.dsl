model {
  softwareSystem kaleem "Kleem" "منصة محادثة ذكية للتجار + متجر مصغّر مدمج." {

    // Frontends
    container platform_admin_portal "Platform Admin Portal" "React/MUI" "لوحة الأدمن العام"
    container merchant_portal       "Merchant Portal"       "React/MUI" "لوحة التاجر"
    container web_chat              "Web Chat Widget"       "JS Widget" "ودجت الدردشة"
    container storefront            "Micro Storefront"      "React/Next.js" "متجر مصغّر"

    // Backends & Infra
    container api        "Backend API"        "NestJS"  "Auth/Inbox/Training/Knowledge/Integrations/Webhooks"
    container workers    "Background Workers" "NestJS"  "AMQP consumers/jobs"
    container n8n        "Orchestrator"       "n8n"     "سير عمل AI/Tools"
    container embed      "Embedding Service"  "FastAPI" "توليد Embeddings"
    container extractor  "Extractor Service"  "FastAPI/Playwright" "استخلاص وفهرسة"
    container mongodb    "MongoDB"            "Mongo"
    container redis      "Redis"              "Redis"
    container qdrant     "Qdrant"             "Qdrant"
    container rabbit     "RabbitMQ"           "AMQP"
    container minio      "MinIO"              "S3-compatible"
  }
}
