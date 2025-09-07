model {
  deploymentEnvironment "docker-compose" {
    infrastructureNode host   "Docker Host" "Linux VM" {
      infrastructureNode backnet "Bridge Network" "Docker network: backnet"

      containerInstance api_i       of kaleem.api       { properties { "port" "3000" } }
      containerInstance workers_i   of kaleem.workers   { }
      containerInstance n8n_i       of kaleem.n8n       { properties { "port" "5678" } }
      containerInstance mongodb_i   of kaleem.mongodb   { properties { "port" "27017" } }
      containerInstance redis_i     of kaleem.redis     { properties { "port" "6379" } }
      containerInstance qdrant_i    of kaleem.qdrant    { properties { "port" "6333" } }
      containerInstance embed_i     of kaleem.embed     { properties { "port" "8000" } }
      containerInstance extractor_i of kaleem.extractor { properties { "port" "8001" } }
      containerInstance minio_i     of kaleem.minio     { properties { "ports" "9000,9001" } }
      containerInstance rabbit_i    of kaleem.rabbit    { properties { "ports" "5672,15672,15692" } }

      // علاقات الشبكة الأساسية
      api_i       -> mongodb_i   "Driver"
      api_i       -> redis_i     "TCP"
      api_i       -> qdrant_i    "HTTP"
      api_i       -> embed_i     "HTTP"
      api_i       -> rabbit_i    "AMQP"
      api_i       -> minio_i     "S3 API"

      workers_i   -> rabbit_i    "AMQP (consume)"
      workers_i   -> qdrant_i    "HTTP (indexing)"
      workers_i   -> mongodb_i   "Driver"
      workers_i   -> minio_i     "S3 API"

      extractor_i -> rabbit_i    "AMQP (publish indexing)"
      extractor_i -> minio_i     "S3 API"

      n8n_i       -> api_i       "REST (tools)"
    }
  }
}

views {
  deployment "docker-compose" {
    include *
    autoLayout lr
    title "Kleem — Deployment (docker-compose)"
  }
}
