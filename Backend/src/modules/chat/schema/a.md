graph TD
    subgraph Clients
      Browser[SPA (React/Vue/Angular)]
      Mobile[Mobile App]
      BotClients[واتساب/تيليجرام Connectors]
    end

    Clients -->|HTTPS / WebSocket| APIGW[API Gateway]

    subgraph Backend
      APIGW -->|HTTP| AuthService
      APIGW --> OfferService
      APIGW --> ProductService
      APIGW --> ChatService
      APIGW --> WorkflowService
      EventBus[(RabbitMQ/Kafka)]
      AuthService -->|publish/subscribe| EventBus
      OfferService -->|publish/subscribe| EventBus
      ProductService -->|publish/subscribe| EventBus
      ChatService -->|publish/subscribe| EventBus
      WorkflowService -->|publish/subscribe| EventBus
      DocumentService -->|publish/subscribe| EventBus
      ScraperService -->|publish/subscribe| EventBus
      VectorService -->|publish/subscribe| EventBus
      AnalyticsService -->|publish/subscribe| EventBus
      MailService -->|publish/subscribe| EventBus
    end
