model {
  container kaleem.n8n {
    component "AI Agent (Main)"            "Workflow"
    component "Classifier/Router"          "Workflow"
    component "Tool: searchProducts"       "HTTP Node"
    component "Tool: searchKnowledge"      "HTTP Node"
    component "LLM Node"                   "HTTP/Provider"
    component "Reply Builder"              "Workflow"
    component "Quality Gate (AI check)"    "Workflow"
    component "Analytics Hook"             "HTTP Node"
  }
}
