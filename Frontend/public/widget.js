(function () {
  // ===== Idempotent init =====
  if (window.__KaleemWidgetLoaded) return;
  window.__KaleemWidgetLoaded = true;

  // ===== Read config =====
  const cfg = window.MusaidChat || {};
  try {
    const s = document.currentScript || document.getElementById("kleem-chat");
    const raw = s?.getAttribute?.("data-config");
    if (raw) Object.assign(cfg, JSON.parse(raw));
  } catch {}

  const { merchantId, apiBaseUrl } = cfg;
  if (!merchantId || !apiBaseUrl) {
    console.error("KaleemChat: missing merchantId or apiBaseUrl");
    return;
  }

  const debug = !!cfg.debug;
  const log = (...args) => debug && console.log("[KaleemWidget]", ...args);

  const headers = {};
  if (cfg.token) headers["Authorization"] = "Bearer " + cfg.token;

  // ===== Unified dark-brand palette (allowed only) =====
  const ALLOWED_BRANDS = [
    "#111827",
    "#1f2937",
    "#0b1f4b",
    "#1e1b4b",
    "#3b0764",
    "#134e4a",
    "#064e3b",
    "#14532d",
    "#4a0e0e",
    "#3e2723",
    // إضافة ألوان من mock-storefront-theme.json
    "#1565c0", // fatima-electronics
    "#b71c1c", // alsaeed-clothing
  ];
  const DEFAULT_BRAND = "#1565c0";
  
  // التحقق من أن اللون هو hex صالح (6 أرقام hex)
  const isValidHex = (hex) => {
    if (!hex) return false;
    const h = hex.startsWith("#") ? hex.slice(1) : hex;
    return /^[0-9a-f]{6}$/i.test(h);
  };
  
  const ensureAllowedBrandHex = (hex) => {
    if (!hex) return DEFAULT_BRAND;
    const h = (hex.startsWith("#") ? hex : "#" + hex).toLowerCase();
    
    // إذا كان اللون في القائمة المسموحة، استخدمه
    if (ALLOWED_BRANDS.includes(h)) return h;
    
    // إذا كان اللون hex صالح (6 أرقام)، استخدمه مباشرة
    // هذا يسمح بأي لون من storefront.brandDark
    if (isValidHex(h)) {
      console.log("[KaleemWidget] Using custom brand color:", h);
      return h;
    }
    
    // Fallback إلى اللون الافتراضي
    console.warn("[KaleemWidget] Invalid brand color, using default:", hex);
    return DEFAULT_BRAND;
  };

  // ===== helpers =====
  const safeFetchJson = async (url, init) => {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  const getContrast = (hex) => {
    try {
      const h = (hex || "#000").replace("#", "");
      if (!/^[0-9a-f]{6}$/i.test(h)) return "#fff";
      const n = parseInt(h, 16);
      const r = (n >> 16) & 255,
        g = (n >> 8) & 255,
        b = n & 255;
      const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return L > 0.6 ? "#111" : "#fff";
    } catch {
      return "#fff";
    }
  };

  const rgba = (hex, a) => {
    const h = (hex || DEFAULT_BRAND).replace("#", "");
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // ===== Session id =====
  const sessionKey = (id) => `kaleem_session_${id}`;
  const ensureSession = (id) => {
    let sid = null;
    try {
      sid = localStorage.getItem(sessionKey(id));
    } catch {}
    if (!sid) {
      sid =
        self.crypto?.randomUUID?.() ??
        Date.now().toString(36) + Math.random().toString(36).slice(2);
      try {
        localStorage.setItem(sessionKey(id), sid);
      } catch {}
    }
    return sid;
  };
  const sessionId = ensureSession(merchantId);

  // ===== runtime state =====
  let mode = cfg.mode; // 'bubble' | 'iframe' | 'inline'
  let settings = null;
  let destroyFns = [];
  let SLUG = null;

  // ===== Fetch settings/mode =====
  const fetchMode = async () => {
    if (mode) return mode;
    try {
      const js = await safeFetchJson(
        `${apiBaseUrl}/merchants/${merchantId}/embed-settings`,
        { headers }
      );
      mode = js?.embedMode || "bubble";
      return mode;
    } catch (err) {
      log("Failed to fetch embedMode, defaulting to bubble", err);
      mode = "bubble";
      return mode;
    }
  };

  const fetchSettings = async () => {
    settings = await safeFetchJson(
      `${apiBaseUrl}/merchants/${merchantId}/widget-settings`,
      { headers }
    );
    if (!settings) throw new Error("No widget settings");
  };

  // ===== Shadow host =====
  const createHost = () => {
    const host = document.createElement("div");
    host.id = "kaleem-widget-host";
    const mount = cfg.mountSelector
      ? document.querySelector(cfg.mountSelector)
      : document.body;
    if (!mount) return null;
    mount.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    destroyFns.push(() => host.remove());
    return shadow;
  };

  // ===== UI (bubble) =====
  const mountBubbleUI = (shadow) => {
    // الأولوية لـ cfg.brandColor (من storefront.brandDark) ثم settings.brandColor ثم DEFAULT_BRAND
    const brand = ensureAllowedBrandHex(
      cfg.brandColor || settings?.brandColor || DEFAULT_BRAND
    );
    const headerBg = brand,
      bodyBg = "#ffffff",
      headerText = getContrast(headerBg);
    const position =
      cfg.position === "left" ? "left:24px; right:auto;" : "right:24px;";

    const style = document.createElement("style");
    style.textContent = `
      :host{ all: initial; }
      .btn{
        position:fixed;bottom:24px;${position}
        background:${brand};border:none;border-radius:50%;width:56px;height:56px;
        color:${getContrast(
          brand
        )};font-size:24px;cursor:pointer;z-index:2147483647;
        display:grid;place-items:center;box-shadow:0 10px 24px ${rgba(
          brand,
          0.35
        )};
      }
      .btn:focus{outline:3px solid ${rgba(brand, 0.25)};}
      .wrap{
        position:fixed;bottom:90px;${position}width:356px;max-height:520px;background:${bodyBg};
        border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;
        overflow:hidden;z-index:2147483647;font-family:${
          settings.fontFamily || "Tajawal,system-ui,sans-serif"
        };
        color:#111;border:1px solid ${rgba(brand, 0.24)};
      }
      .hidden{display:none!important}
      .header{
        background:${headerBg};color:${headerText};padding:14px 16px;font-weight:800;display:flex;align-items:center;gap:10px
      }
      .dot{width:8px;height:8px;border-radius:50%;background:#44b700;box-shadow:0 0 0 2px ${rgba(
        "#44b700",
        0.15
      )} inset}
      .title{flex:1}
      .msgs{flex:1;padding:10px;overflow:auto;background:#fff}
      .day{display:flex;justify-content:center;margin:6px 0}
      .day span{font-size:12px;background:${rgba(
        brand,
        0.05
      )};border:1px solid ${rgba(
      brand,
      0.2
    )};border-radius:999px;padding:2px 8px;color:#444}
      .row{display:flex;margin:6px 0}
      .bubble{max-width:78%;padding:8px 10px;border-radius:16px;border:1px solid #eee;box-shadow:0 1px 2px rgba(0,0,0,.04);word-break:break-word}
      .me{justify-content:flex-end}
      .me .bubble{background:#f7f7f8}
      .bot .bubble{
        background:${brand}; color:${getContrast(brand)}; border-color:${rgba(
      brand,
      0.25
    )};
        box-shadow:0 2px 12px rgba(0,0,0,.06)
      }
      .meta{display:block;font-size:11px;opacity:.7;margin-top:4px;text-align:right}
      .typing{display:flex;align-items:center;gap:6px;margin:6px 0;color:${brand}}
      .typing .d{width:6px;height:6px;border-radius:50%;background:${brand};animation:blink 1s infinite}
      .typing .d:nth-child(2){animation-delay:.2s}
      .typing .d:nth-child(3){animation-delay:.4s}
      .composer{display:flex;gap:6px;padding:8px;border-top:1px solid ${rgba(
        brand,
        0.24
      )};background:#f8f9fb}
      .in{flex:1;border:none;border-radius:999px;padding:10px 14px;outline:none;background:#fff}
      .send{border:none;border-radius:999px;padding:10px 14px;background:${brand};color:${getContrast(
      brand
    )};cursor:pointer}
      .send[disabled]{opacity:.6;cursor:not-allowed}
      .powered{display:block;text-align:center;color:#9aa0a6;font-size:11px;padding:4px 0}
      @keyframes blink{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}
      @media (max-width: 420px){ .wrap{width:calc(100vw - 24px); bottom:78px;} }
    `;

    const container = document.createElement("div");
    container.setAttribute("dir", "rtl");
    container.innerHTML = `
      <button class="btn" aria-label="فتح المحادثة" title="تواصل معنا">💬</button>
      <div class="wrap hidden" role="dialog" aria-label="دردشة الدعم" aria-modal="false">
        <div class="header">
          <span class="dot" aria-hidden="true"></span>
          <div class="title">${settings.botName || "Kaleem Bot"}</div>
          <small>متصل الآن</small>
        </div>
        <div class="msgs" aria-live="polite"></div>
        <div class="composer">
          <input class="in" type="text" placeholder="اكتب رسالتك…" aria-label="نص الرسالة" />
          <button class="send" title="إرسال">إرسال</button>
        </div>
        ${
          settings?.showPoweredBy === false
            ? ""
            : `<small class="powered">مشغّل بواسطة <b style="color:${brand}">Kaleem</b></small>`
        }
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);

    const btn = shadow.querySelector(".btn");
    const panel = shadow.querySelector(".wrap");
    const msgs = shadow.querySelector(".msgs");
    const input = shadow.querySelector(".in");
    const send = shadow.querySelector(".send");

    // open/close
    const setOpen = (open) => {
      if (open) {
        panel.classList.remove("hidden");
        window.dispatchEvent(new CustomEvent("kaleem:widget:open"));
        saveOpenState(true);
        loadHistory(true);
      } else {
        panel.classList.add("hidden");
        window.dispatchEvent(new CustomEvent("kaleem:widget:close"));
        saveOpenState(false);
      }
    };
    btn.addEventListener("click", () =>
      setOpen(panel.classList.contains("hidden"))
    );

    // remember state
    const openKey = `kaleem_open_${merchantId}`;
    const saveOpenState = (v) => {
      try {
        localStorage.setItem(openKey, v ? "1" : "0");
      } catch {}
    };
    const loadOpenState = () => {
      try {
        return localStorage.getItem(openKey) === "1";
      } catch {
        return false;
      }
    };

    // history + render
    let lastTs = 0; // آخر طابع زمني مرسوم
    let sendingNow = false; // لمنع تعدد الإرسال السريع

    const render = (text, role, ts, metadata) => {
      const row = document.createElement("div");
      row.className = `row ${role === "customer" ? "me" : "bot"}`;
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerText = text || "";

      if (metadata?.imageUrl) {
        const img = document.createElement("img");
        img.src = metadata.imageUrl;
        img.style.maxWidth = "100%";
        img.style.display = "block";
        img.style.marginTop = "6px";
        bubble.appendChild(img);
      }

      if (Array.isArray(metadata?.buttons)) {
        const wrap = document.createElement("div");
        wrap.style.marginTop = "6px";
        wrap.style.display = "flex";
        wrap.style.flexWrap = "wrap";
        wrap.style.gap = "6px";
        metadata.buttons.forEach((b) => {
          const el = document.createElement("button");
          el.textContent = b.title;
          el.style.cssText = `background:${brand};color:${getContrast(
            brand
          )};border:none;border-radius:6px;padding:6px 10px;cursor:pointer;`;
          el.addEventListener("click", () => sendMessage(b.payload));
          wrap.appendChild(el);
        });
        bubble.appendChild(wrap);
      }

      const meta = document.createElement("small");
      meta.className = "meta";
      meta.textContent = ts
        ? new Date(ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      bubble.appendChild(meta);

      row.appendChild(bubble);
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;

      // مهم: حدّث آخر طابع زمني مرسوم لمنع تكرار الرسائل عند الـ polling
      if (ts) lastTs = Math.max(lastTs, +new Date(ts));
    };

    const loadHistory = async (silent) => {
      try {
        if (!SLUG) return;
        const res = await fetch(
          `${apiBaseUrl}/messages/public/${SLUG}/webchat/${sessionId}`,
          {
            headers,
          }
        );
        if (!res.ok) {
          if (!silent) msgs.innerHTML = "";
          return;
        }
        const text = await res.text();
        if (!text) {
          if (!silent) msgs.innerHTML = "";
          return;
        }
        const session = JSON.parse(text);
        if (!Array.isArray(session?.messages)) return;

        msgs.innerHTML = "";
        lastTs = 0; // نعيد الضبط قبل إعادة الرسم
        session.messages.forEach((m) =>
          render(m.text, m.role, m.timestamp, m.metadata)
        );
      } catch (e) {
        log("history error", e);
      }
    };

    // typing indicator
    let typingEl = null;
    const showTyping = () => {
      if (typingEl) return;
      typingEl = document.createElement("div");
      typingEl.className = "typing";
      typingEl.innerHTML =
        '<span class="d"></span><span class="d"></span><span class="d"></span>';
      msgs.appendChild(typingEl);
      msgs.scrollTop = msgs.scrollHeight;
    };
    const hideTyping = () => {
      if (!typingEl) return;
      typingEl.remove();
      typingEl = null;
    };

    // send
    const sendMessage = async (text) => {
      const t = (text || "").toString().trim();
      if (!t || sendingNow) return;

      sendingNow = true;
      send.disabled = true;
      input.disabled = true;

      const nowTs = Date.now();
      render(t, "customer", nowTs);
      // مهم: نرفع lastTs فورًا حتى لا يعيد الـ polling رسم نفس رسالة العميل
      lastTs = Math.max(lastTs, nowTs);
      input.value = "";
      showTyping();

      try {
        if (SLUG) {
          await fetch(`${apiBaseUrl}/webhooks/chat/incoming/${SLUG}`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              text: t,
              user: { source: "web-widget" },
              embedMode: mode || "bubble",
              channel: "webchat",
            }),
          });
        } else {
          await fetch(`${apiBaseUrl}/webhooks/incoming/${merchantId}`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: sessionId,
              merchantId,
              text: t,
              channel: "webchat",
            }),
          });
        }
      } catch (e) {
        log("send error", e);
        hideTyping();
        render("تعذر إرسال الرسالة، حاول مجددًا.", "bot", Date.now(), {
          error: true,
        });
      } finally {
        sendingNow = false;
        send.disabled = false;
        input.disabled = false;
        input.focus();
      }
    };

    send.addEventListener("click", () => {
      const t = input.value.trim();
      if (t) sendMessage(t);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const t = input.value.trim();
        if (t) sendMessage(t);
      }
    });

    // Polling updates (simple)
    let pollTimer = null;
    const startPolling = () => {
      if (cfg.disablePolling) return;
      stopPolling();
      pollTimer = setInterval(async () => {
        if (panel.classList.contains("hidden")) return;
        try {
          if (!SLUG) return;
          // لا تحاول النداء بدون slug
          const res = await fetch(
            `${apiBaseUrl}/messages/public/${SLUG}/webchat/${sessionId}`,
            { headers }
          );
          if (!res.ok) return;
          const text = await res.text();
          if (!text) return;
          const js = JSON.parse(text);
          if (!Array.isArray(js?.messages)) return;

          // فقط الرسائل الأحدث من آخر طابع زمني معروف
          const newOnes = js.messages.filter(
            (m) => +new Date(m.timestamp || 0) > lastTs
          );
          if (newOnes.length) hideTyping();
          newOnes.forEach((m) =>
            render(m.text, m.role, m.timestamp, m.metadata)
          );
        } catch (e) {
          log("poll error", e);
        }
      }, 1800);
      destroyFns.push(() => stopPolling());
    };
    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    // Handoff (optional)
    if (settings.handoffEnabled) {
      const hb = document.createElement("button");
      hb.textContent = "تحويل لإنسان";
      hb.setAttribute("title", "تحويل المحادثة لموظف");
      hb.style.cssText = `position:absolute; top:10px; inset-inline-end:10px; background:${brand}; color:${getContrast(
        brand
      )}; border:none; padding:4px 8px; border-radius:6px; cursor:pointer;`;
      shadow.querySelector(".header").appendChild(hb);
      const endpoint =
        cfg.handoffEndpoint ||
        `${apiBaseUrl}/merchants/${merchantId}/widget/handoff`;
      hb.addEventListener("click", async () => {
        try {
          await fetch(endpoint, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          alert("تم إرسال طلب التحويل");
        } catch (e) {
          alert("تعذر الإرسال الآن");
        }
      });
    }

    // Auto open
    const autoOpen = () => {
      const openOnLoad = cfg.openOnLoad === true || false;
      const delay = Number(cfg.autoOpenDelay || 0);
      const remembered = loadOpenState();
      if (remembered) setOpen(true);
      else if (openOnLoad) setTimeout(() => setOpen(true), delay);
    };

    autoOpen();
    if (SLUG) startPolling();
    // Public events
    window.dispatchEvent(
      new CustomEvent("kaleem:widget:ready", {
        detail: { merchantId, sessionId },
      })
    );

    // minimal API
    window.KaleemWidget = Object.assign(window.KaleemWidget || {}, {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(panel.classList.contains("hidden")),
      send: (t) => sendMessage(String(t || "")),
      destroy: () => {
        destroyFns.forEach((fn) => {
          try {
            fn();
          } catch {}
        });
        destroyFns = [];
      },
    });
  };

  // ===== Iframe mode =====
  const mountIframe = async () => {
    let shareUrl = null;
    try {
      const js = await safeFetchJson(
        `${apiBaseUrl}/merchants/${merchantId}/embed-settings`,
        { headers }
      );
      shareUrl = js?.shareUrl || null; // e.g. /chat/<slug>
    } catch {}
    const base = apiBaseUrl.replace(/\/api$/, "");
    const url = shareUrl
      ? `${location.origin.replace(/\/+$/, "")}${shareUrl}`
      : SLUG
      ? `${base}/chat/${SLUG}`
      : `${base}/chat`;

    const iframe = document.createElement("iframe");
    iframe.src = url;
    const side = cfg.position === "left" ? "left:0; right:auto;" : "right:0;";
    iframe.style.cssText = `position:fixed;bottom:0;${side}width:360px;height:520px;border:none;z-index:2147483647;border-radius:12px 12px 0 0; box-shadow:0 12px 40px rgba(0,0,0,.2);`;
    document.body.appendChild(iframe);
    destroyFns.push(() => iframe.remove());
  };

  // ===== Bootstrap =====
  (async () => {
    try {
      await fetchSettings();
      await fetchMode();

      // unified slug
      SLUG =
        cfg.publicSlug ||
        cfg.widgetSlug ||
        settings?.publicSlug ||
        settings?.widgetSlug ||
        settings?.slug ||
        null;
      if (!SLUG) {
        console.warn(
          "KaleemChat: missing widget/public slug; legacy endpoints will be used."
        );
      }

      if (mode === "iframe") {
        await mountIframe();
        return;
      }

      const shadow = createHost();
      if (!shadow) throw new Error("Failed to create host");
      mountBubbleUI(shadow);
    } catch (e) {
      console.error("KaleemChat init failed:", e);
    }
  })();
})();
