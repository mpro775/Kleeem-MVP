# main.py
from fastapi import FastAPI, Query
from pydantic import BaseModel
from extractor import (
    full_extract,
    fetch_html,
    debug_list_ldjson,
    debug_list_itemprops,
    debug_list_meta,
)

app = FastAPI()

class ExtractResponse(BaseModel):
    name: str | None
    description: str | None
    images: list[str]
    price: float | None
    availability: str | None

@app.get("/extract/", response_model=dict[str, ExtractResponse])
def extract_endpoint(url: str = Query(..., description="رابط صفحة المنتج")):
    data = full_extract(url)
    return {"data": data}

@app.get("/debug/fields/")
def debug_fields(url: str = Query(..., description="رابط للتحليل")):
    html = fetch_html(url)
    debug_list_ldjson(html)
    debug_list_itemprops(html)
    debug_list_meta(html)
    return {"status": "see logs for LD-JSON, itemprop & meta tags"}
