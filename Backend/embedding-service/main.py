from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List
import uvicorn

app = FastAPI(
    title="Embeddings Service",
    description="API to generate embeddings for texts using sentence-transformers.",
    version="1.0.0"
)

class EmbeddingRequest(BaseModel):
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]

# يمكنك تغيير الموديل إذا أردت سرعة أكبر (paraphrase-MiniLM...), أو دقة أعلى (all-mpnet-base-v2)
model_name = "paraphrase-multilingual-MiniLM-L12-v2"
model = SentenceTransformer(model_name)

@app.post("/embed", response_model=EmbeddingResponse)
def embed(req: EmbeddingRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="No texts provided.")
    embeddings = model.encode(req.texts, show_progress_bar=False).tolist()
    return EmbeddingResponse(embeddings=embeddings)

@app.get("/")
def root():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
