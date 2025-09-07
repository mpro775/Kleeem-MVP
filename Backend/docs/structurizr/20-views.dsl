views {
  // Context
  systemContext kaleem {
    include *
    autoLayout lr
    title "Kleem — Context"
  }

  // Containers
  container kaleem {
    include *
    include whatsapp telegram salla zid shopify payment llm merchant_site
    autoLayout lr
    title "Kleem — Containers"
  }

  // Backend Components (API)
  component kaleem.api {
    include *
    autoLayout lr
    title "Kleem — Backend API Components"
  }

  // n8n Components
  component kaleem.n8n {
    include *
    autoLayout lr
    title "Kleem — n8n Components"
  }
}
