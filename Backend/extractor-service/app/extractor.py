import re
import json
import requests
from fastapi import HTTPException
from bs4 import BeautifulSoup
from trafilatura import fetch_url, extract as traf_extract
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    )
}


def fetch_html(url: str) -> str:
    try:
        res = requests.get(url, timeout=30, headers=DEFAULT_HEADERS)
        res.encoding = 'utf-8'
        html = res.text or ""
        if not any(marker in html for marker in [
            '<script type="application/ld+json"',
            '<script type="application/json"',
            'og:title',
            'product:price:amount',
        ]):
            raise HTTPException(status_code=204, detail="No product markers in HTML")
        res.raise_for_status()
        return html
    except Exception:
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                page = browser.new_page(user_agent=DEFAULT_HEADERS["User-Agent"])
                page.goto(url, wait_until="networkidle", timeout=60000)
                try:
                    page.wait_for_selector(
                        'script[type="application/ld+json"], script[type="application/json"], script[id^="ProductJson-"], .product-details, .price, h1, h2.product-title__title',
                        timeout=60000
                    )
                except PlaywrightTimeoutError:
                    pass
                html = page.content()
                browser.close()
                return html
        except PlaywrightTimeoutError as e:
            raise HTTPException(status_code=504, detail=f"Playwright timeout: {e}")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Fetch error: {e}")


def extract_structured(html: str):
    soup = BeautifulSoup(html, "html.parser")
    # JSON-LD
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
        except:
            continue
        items = data.get('@graph') or (data if isinstance(data, list) else [data])
        for item in items:
            if item.get('@type') == "Product":
                offers = item.get('offers') or {}
                if isinstance(offers, list):
                    offers = offers[0]
                price = offers.get('price')
                availability = offers.get('availability')
                images = item.get('image') or []
                if isinstance(images, str):
                    images = [images]
                return {
                    "name": item.get("name"),
                    "description": item.get("description"),
                    "images": images,
                    "price": float(price) if price else None,
                    "availability": availability.split('/')[-1] if availability else None,
                }
    # פלג־Shopify JSON
    shopify = soup.find("script", id=re.compile(r"ProductJson-"))
    if shopify and shopify.string:
        try:
            pj = json.loads(shopify.string)
            v0 = pj.get("variants", [{}])[0]
            return {
                "name": pj.get("title"),
                "description": pj.get("body_html"),
                "images": pj.get("images", []),
                "price": float(v0.get("price", 0)),
                "availability": "InStock" if v0.get("available") else "OutOfStock",
            }
        except:
            pass
    # פלג JSON כללי
    for tag in soup.find_all("script", type="application/json"):
        txt = tag.string or ""
        try:
            obj = json.loads(txt)
        except:
            continue
        if isinstance(obj, dict) and "title" in obj and "variants" in obj:
            v0 = obj["variants"][0] if obj["variants"] else {}
            return {
                "name": obj.get("title"),
                "description": obj.get("body_html"),
                "images": obj.get("images", []),
                "price": float(v0.get("price", 0)),
                "availability": "InStock" if v0.get("available") else "OutOfStock",
            }
    return None


def extract_meta(soup: BeautifulSoup):
    def m(keys):
        for k in keys:
            tag = soup.find("meta", property=k) or soup.find("meta", attrs={"name": k})
            if tag and tag.get("content"):
                return tag["content"]
        return None
    name = m(["og:title","twitter:title"])
    img  = m(["og:image","twitter:image"])
    return {
        "name": name,
        "description": m(["og:description","twitter:description"]),
        "images": [img] if img else [],
        "price": float(m(["product:price:amount","og:price:amount"]) or 0) or None,
        "availability": (m(["product:availability","og:availability"]) or "").split("/")[-1] or None,
    }


def regex_extract_price(text: str):
    m = re.search(r'([\d,]+(?:\.\d+)?)\s*(?:ريال|ر\.س|SAR|\$)', text)
    return float(m.group(1).replace(',', '')) if m else None


def regex_extract_availability(text: str):
    if re.search(r'\b(متوفر|in stock|available)\b', text, re.I):
        return "InStock"
    if re.search(r'\b(غير متوفر|نفد|out of stock)\b', text, re.I):
        return "OutOfStock"
    return None


def extract_dynamic_with_playwright(url: str):
    browser = None
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(user_agent=DEFAULT_HEADERS["User-Agent"])
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_selector("h1, h2.product-title__title, .price", timeout=60000)
            price_el = page.query_selector(".price")
            title_el = page.query_selector("h1") or page.query_selector("h2.product-title__title")
            price_txt = price_el.inner_text() if price_el else ""
            name_txt  = title_el.inner_text() if title_el else ""
            price = float(re.sub(r'[^\d.]','', price_txt)) if price_txt else None
            return {
                "name": name_txt.strip() or None,
                "description": None,
                "images": [],
                "price": price,
                "availability": None,
            }
    finally:
        if browser:
            browser.close()


def full_extract(url: str):
    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # 1) JSON-LD & Shopify & Generic JSON
    prod = extract_structured(html)
    if prod:
        return prod

    # 2) Meta
    meta = extract_meta(soup)
    if meta["name"] or meta["price"] is not None:
        return meta

    # 3) Heuristic + CSS-fallback
    text = soup.get_text(" ")
    price = regex_extract_price(text)
    avail = regex_extract_availability(text)
    if price is not None or avail:
        name = (soup.h1 and soup.h1.get_text(strip=True)) \
            or (soup.select_one("h2.product-title__title") and soup.select_one("h2.product-title__title").get_text(strip=True)) \
            or soup.title.string
        return {
            "name": name,
            "description": None,
            "images": meta["images"],
            "price": price,
            "availability": avail,
        }

    # 4) דינמי Playwright (כולל h2)
    try:
        return extract_dynamic_with_playwright(url)
    except:
        pass

    # 5) Fallback Trafilatura
    down = fetch_url(url)
    desc = traf_extract(down, include_images=True) or ""
    imgs = [i["src"] for i in soup.find_all("img") if i.get("src","").startswith("http")]
    return {
        "name": None,
        "description": desc,
        "images": imgs,
        "price": None,
        "availability": None,
    }


# -----------------------------------------------------------------------------
# Debug helpers (so /debug/fields/ can log ld-json / itemprop / meta tags)
#
def debug_list_ldjson(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    idx = 0
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
        except Exception:
            continue
        items = data.get('@graph') or ([data] if isinstance(data, dict) else data)
        for item in items:
            print(f"[LD-JSON #{idx}] keys = {list(item.keys())}")
            idx += 1


def debug_list_itemprops(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    props = {}
    for tag in soup.find_all(attrs={"itemprop": True}):
        k = tag['itemprop']
        props.setdefault(k, []).append(tag.get("content") or tag.get_text(strip=True))
    for k, vals in props.items():
        print(f"[itemprop] {k}: {vals[:3]}{'…' if len(vals)>3 else ''}")


def debug_list_meta(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup.find_all("meta"):
        key = tag.get("property") or tag.get("name")
        if key and tag.get("content"):
            print(f"[meta] {key}: {tag['content']}")
