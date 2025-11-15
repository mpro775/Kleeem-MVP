import { setupWorker } from "msw/browser";
import { http, HttpResponse, delay, passthrough } from "msw";

// استيراد البيانات الوهمية
import mockUsers from "../../data/mock-users.json";
import mockProducts from "../../data/mock-products.json";
import mockConversations from "../../data/mock-conversations.json";
import mockDashboard from "../../data/mock-dashboard.json";
import mockCategories from "../../data/mock-categories.json";
import mockOrders from "../../data/mock-orders.json";
import mockCoupons from "../../data/mock-coupons.json";
import mockChannels from "../../data/mock-channels.json";
import mockAnalytics from "../../data/mock-analytics.json";
import mockKnowledge from "../../data/mock-knowledge.json";
import mockMerchantSettings from "../../data/mock-merchant-settings.json";
import mockLeads from "../../data/mock-leads.json";
import mockLeadsSettings from "../../data/mock-leads-settings.json";
import mockInstructions from "../../data/mock-instructions.json";
import mockMissingResponses from "../../data/mock-missing-responses.json";
import mockPromptStudio from "../../data/mock-prompt-studio.json";
import mockPromotions from "../../data/mock-promotions.json";
import mockWidgetConfig from "../../data/mock-widget-config.json";
import mockStorefrontTheme from "../../data/mock-storefront-theme.json";
import mockIntegrations from "../../data/mock-integrations.json";
import mockKaleemChat from "../../data/mock-kaleem-chat.json";
import mockContactConfig from "../../data/mock-contact-config.json";

// استيراد وظائف التخزين المحلي
import {
  StorageKeys,
  saveMapToStorage,
  loadMapFromStorage,
  saveArrayToStorage,
  loadArrayFromStorage,
} from "./storage";

// دالة لتوليد QR code وهمي (صورة PNG بسيطة)
function generateMockQRCode(): string {
  // QR code وهمي بصيغة base64 - صورة PNG 200x200 بكسل
  // هذا QR code وهمي يشبه QR code حقيقي
  // في الإنتاج، سيتم توليد QR code حقيقي من Evolution API
  try {
    // استخدام Canvas API لإنشاء QR code وهمي
    if (typeof document !== "undefined" && document.createElement) {
      const size = 200;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Canvas context not available");
      }
      
      // خلفية بيضاء
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      
      // نمط QR code وهمي (مربعات سوداء)
      ctx.fillStyle = "#000000";
      const moduleSize = 8; // حجم كل مربع (module)
      const modules = Math.floor(size / moduleSize);
      
      // نمط QR code بسيط يشبه QR code حقيقي
      // المربعات الثلاثة الكبيرة في الزوايا (Finder Patterns)
      const finderSize = 7;
      
      // دالة مساعدة لرسم Finder Pattern
      const drawFinderPattern = (startX: number, startY: number) => {
        // الإطار الخارجي (7x7)
        for (let i = 0; i < finderSize; i++) {
          for (let j = 0; j < finderSize; j++) {
            if (i === 0 || i === finderSize - 1 || j === 0 || j === finderSize - 1) {
              ctx.fillRect((startX + i) * moduleSize, (startY + j) * moduleSize, moduleSize, moduleSize);
            }
          }
        }
        // المربع الداخلي (3x3)
        for (let i = 2; i < 5; i++) {
          for (let j = 2; j < 5; j++) {
            ctx.fillRect((startX + i) * moduleSize, (startY + j) * moduleSize, moduleSize, moduleSize);
          }
        }
      };
      
      // الزاوية العلوية اليسرى
      drawFinderPattern(0, 0);
      
      // الزاوية العلوية اليمنى
      drawFinderPattern(modules - finderSize, 0);
      
      // الزاوية السفلية اليسرى
      drawFinderPattern(0, modules - finderSize);
      
      // خطوط التوقيت (Timing Patterns) - خطوط متقطعة بين المربعات الكبيرة
      for (let i = finderSize + 1; i < modules - finderSize - 1; i++) {
        if (i % 2 === 0) {
          // خط أفقي
          ctx.fillRect(i * moduleSize, finderSize * moduleSize, moduleSize, moduleSize);
          // خط عمودي
          ctx.fillRect(finderSize * moduleSize, i * moduleSize, moduleSize, moduleSize);
        }
      }
      
      // نمط بيانات وهمي (نقاط عشوائية تشبه البيانات)
      // تجنب المناطق المحجوزة (Finder Patterns و Timing Patterns)
      for (let i = 0; i < modules; i++) {
        for (let j = 0; j < modules; j++) {
          // تجنب المربعات الكبيرة في الزوايا
          const isInTopLeft = i < finderSize + 1 && j < finderSize + 1;
          const isInTopRight = i >= modules - finderSize - 1 && j < finderSize + 1;
          const isInBottomLeft = i < finderSize + 1 && j >= modules - finderSize - 1;
          const isTimingPattern = (i === finderSize + 1 && j >= finderSize + 1 && j < modules - finderSize - 1) ||
                                  (j === finderSize + 1 && i >= finderSize + 1 && i < modules - finderSize - 1);
          
          if (!isInTopLeft && !isInTopRight && !isInBottomLeft && !isTimingPattern) {
            // نمط عشوائي بسيط (55% فرصة لإنشاء نمط واقعي)
            if (Math.random() > 0.45) {
              ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
            }
          }
        }
      }
      
      const dataUrl = canvas.toDataURL("image/png");
      if (dataUrl && dataUrl.includes(",")) {
        const base64 = dataUrl.split(",")[1];
        console.log("[DEMO SERVER] Generated QR code, length:", base64.length);
        return base64;
      }
      
      throw new Error("Failed to generate data URL");
    }
  } catch (e) {
    console.warn("[DEMO SERVER] Failed to generate QR code with Canvas:", e);
  }
  
  // Fallback: استخدام QR code وهمي من API خارجي
  // هذا QR code بسيط يحتوي على نص "WHATSAPP:CONNECT"
  // QR code PNG 200x200 بكسل - نمط بسيط يشبه QR code حقيقي
  // هذا QR code وهمي تم إنشاؤه باستخدام نمط بسيط
  // في الإنتاج، سيتم استخدام QR code حقيقي من Evolution API
  const fallbackQR = "iVBORw0KGgoAAAANSUhEUgAAANIAAADSCAYAAADx8l5NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuZWRhMmIzZmFjLCAyMDIxLzExLzE3LTE3OjIzOjE5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgZGM6UmlnaHRzPSJDb3B5cmlnaHQgMjAyMSBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjMuMSAoV2luZG93cykiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4B//79/Pv6+fj39vX08/Lx8O/u7ezr6uno5+bl5OPi4eDf3t3c29rZ2NfW1dTT0tHQz87NzMvKycjHxsXEw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAAh+QQBCgAAACwAAAAAIAAgAAAD/0gRCVqpqbm5uQAAAIfkEAQoAAAAsAAAAACAAIAAAA/9IEQlaqam5ubkAAA==";
  console.log("[DEMO SERVER] Using fallback QR code");
  return fallbackQR;
}

// نوع المحادثة
type Conversation = {
  _id: string;
  merchantId: string;
  sessionId: string;
  channel: string;
  messages: Array<{
    role: "customer" | "bot" | "agent";
    text: string;
    timestamp: string;
    _id?: string;
    rating?: 0 | 1 | null;
    feedback?: string | null;
  }>;
  handoverToAgent?: boolean;
  createdAt: string;
  updatedAt: string;
};

// تخزين ديناميكي للمحادثات (في الذاكرة + LocalStorage)
const dynamicConversations = new Map<string, Conversation>();

// تحميل المحادثات من LocalStorage أو JSON
function initializeConversations() {
  const stored = loadMapFromStorage<Conversation>(StorageKeys.CONVERSATIONS);
  
  if (stored.size > 0) {
    // استخدام البيانات المحفوظة
    stored.forEach((conv, sessionId) => {
      dynamicConversations.set(sessionId, conv);
    });
    console.log("[DEMO SERVER] Loaded", stored.size, "conversations from LocalStorage");
    
    // التأكد من أن جميع المحادثات من JSON موجودة (لإضافة المحادثات الجديدة)
    mockConversations.forEach((conv) => {
      if (!dynamicConversations.has(conv.sessionId)) {
        console.log("[DEMO SERVER] Adding missing conversation from JSON:", conv.sessionId);
        dynamicConversations.set(conv.sessionId, conv as any);
      } else {
        // التأكد من أن المحادثة المحفوظة تحتوي على الرسائل
        const savedConv = dynamicConversations.get(conv.sessionId);
        if (savedConv && (!savedConv.messages || savedConv.messages.length === 0)) {
          // إذا كانت الرسائل مفقودة، استخدم الرسائل من JSON
          if (conv.messages && conv.messages.length > 0) {
            console.log("[DEMO SERVER] Restoring messages for conversation:", conv.sessionId);
            dynamicConversations.set(conv.sessionId, { ...savedConv, messages: conv.messages as any } as Conversation);
          }
        }
      }
    });
    
    // حفظ البيانات المحدثة
    saveMapToStorage(StorageKeys.CONVERSATIONS, dynamicConversations);
  } else {
    // استخدام البيانات الافتراضية من JSON
    mockConversations.forEach((conv) => {
      // التأكد من أن المحادثة تحتوي على الرسائل
      if (!conv.messages || !Array.isArray(conv.messages)) {
        console.warn("[DEMO SERVER] Conversation from JSON missing messages:", conv.sessionId, conv.channel);
      }
      dynamicConversations.set(conv.sessionId, conv as any);
    });
    // حفظ البيانات الافتراضية في LocalStorage
    saveMapToStorage(StorageKeys.CONVERSATIONS, dynamicConversations);
    console.log("[DEMO SERVER] Initialized", mockConversations.length, "conversations from JSON");
    console.log("[DEMO SERVER] Conversations with messages:", mockConversations.filter((c) => c.messages && c.messages.length > 0).length);
  }
}

initializeConversations();

// نوع الرابط
type Link = {
  _id: string;
  url: string;
  status: "pending" | "processing" | "processed" | "completed" | "failed";
  textLength?: number;
  errorMessage?: string;
  createdAt: string;
};

// تخزين ديناميكي للروابط (في الذاكرة + LocalStorage)
const dynamicLinks = new Map<string, Link>();

// تهيئة الروابط من LocalStorage أو JSON
function initializeLinks() {
  const stored = loadMapFromStorage<Link>(StorageKeys.LINKS);
  
  if (stored.size > 0) {
    stored.forEach((link, id) => {
      dynamicLinks.set(id, link);
    });
    console.log("[DEMO SERVER] Loaded", stored.size, "links from LocalStorage");
  } else {
    (mockKnowledge.links || []).forEach((link: any) => {
      dynamicLinks.set(link._id, {
        _id: link._id,
        url: link.url,
        status: link.status === "processed" ? "processed" : link.status === "processing" ? "processing" : link.status === "failed" ? "failed" : "pending",
        textLength: link.textLength || 0,
        errorMessage: link.errorMessage,
        createdAt: link.createdAt,
      });
    });
    saveMapToStorage(StorageKeys.LINKS, dynamicLinks);
    console.log("[DEMO SERVER] Initialized", (mockKnowledge.links || []).length, "links from JSON");
  }
}

initializeLinks();

// نوع السؤال الشائع
type FAQ = {
  _id: string;
  question: string;
  answer: string;
  status?: "pending" | "completed" | "failed" | "deleted";
  errorMessage?: string;
  createdAt: string;
};

// تخزين ديناميكي للأسئلة الشائعة (في الذاكرة + LocalStorage)
const dynamicFaqs = new Map<string, FAQ>();

// تهيئة الأسئلة الشائعة من LocalStorage أو JSON
function initializeFaqs() {
  const stored = loadMapFromStorage<FAQ>(StorageKeys.FAQS);
  
  if (stored.size > 0) {
    stored.forEach((faq, id) => {
      dynamicFaqs.set(id, faq);
    });
    console.log("[DEMO SERVER] Loaded", stored.size, "FAQs from LocalStorage");
  } else {
    (mockKnowledge.faqs || []).forEach((faq: any) => {
      dynamicFaqs.set(faq._id, {
        _id: faq._id,
        question: faq.question,
        answer: faq.answer,
        status: faq.status || "completed",
        errorMessage: faq.errorMessage,
        createdAt: faq.createdAt,
      });
    });
    saveMapToStorage(StorageKeys.FAQS, dynamicFaqs);
    console.log("[DEMO SERVER] Initialized", (mockKnowledge.faqs || []).length, "FAQs from JSON");
  }
}

initializeFaqs();

// نوع التعليمة
type Instruction = {
  _id: string;
  instruction: string;
  type: "auto" | "manual";
  active: boolean;
  merchantId?: string;
  relatedReplies?: string[];
  createdAt: string;
  updatedAt: string;
};

// تخزين ديناميكي للتعليمات (في الذاكرة + LocalStorage)
const dynamicInstructions = new Map<string, Instruction>();

// تهيئة التعليمات من LocalStorage أو JSON
function initializeInstructions() {
  const stored = loadMapFromStorage<Instruction>(StorageKeys.INSTRUCTIONS);
  
  if (stored.size > 0) {
    stored.forEach((inst, id) => {
      dynamicInstructions.set(id, inst);
    });
    console.log("[DEMO SERVER] Loaded", stored.size, "instructions from LocalStorage");
  } else {
    (mockInstructions || []).forEach((inst: any) => {
      dynamicInstructions.set(inst._id, {
        _id: inst._id,
        instruction: inst.instruction,
        type: inst.type || "manual",
        active: inst.active !== undefined ? inst.active : true,
        merchantId: inst.merchantId,
        relatedReplies: inst.relatedReplies || [],
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      });
    });
    saveMapToStorage(StorageKeys.INSTRUCTIONS, dynamicInstructions);
    console.log("[DEMO SERVER] Initialized", (mockInstructions || []).length, "instructions from JSON");
  }
}

initializeInstructions();

// نوع الرد المفقود
type MissingResponse = {
  _id: string;
  merchant: string;
  channel: "telegram" | "whatsapp" | "webchat";
  question: string;
  botReply: string;
  sessionId?: string;
  aiAnalysis?: string;
  customerId?: string;
  type: "missing_response" | "unavailable_product";
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
};

// تخزين ديناميكي للردود المفقودة (في الذاكرة + LocalStorage)
const dynamicMissingResponses = new Map<string, MissingResponse>();

// تهيئة الردود المفقودة من LocalStorage أو JSON
function initializeMissingResponses() {
  const stored = loadMapFromStorage<MissingResponse>(StorageKeys.MISSING_RESPONSES);
  
  if (stored.size > 0) {
    stored.forEach((mr, id) => {
      dynamicMissingResponses.set(id, mr);
    });
    console.log("[DEMO SERVER] Loaded", stored.size, "missing responses from LocalStorage");
  } else {
    (mockMissingResponses || []).forEach((mr: any) => {
      dynamicMissingResponses.set(mr._id, {
        _id: mr._id,
        merchant: mr.merchant,
        channel: mr.channel,
        question: mr.question,
        botReply: mr.botReply,
        sessionId: mr.sessionId,
        aiAnalysis: mr.aiAnalysis,
        customerId: mr.customerId,
        type: mr.type,
        resolved: mr.resolved !== undefined ? mr.resolved : false,
        resolvedAt: mr.resolvedAt,
        resolvedBy: mr.resolvedBy,
        createdAt: mr.createdAt,
      });
    });
    saveMapToStorage(StorageKeys.MISSING_RESPONSES, dynamicMissingResponses);
    console.log("[DEMO SERVER] Initialized", (mockMissingResponses || []).length, "missing responses from JSON");
  }
}

initializeMissingResponses();

// دالة مساعدة لحفظ البيانات الديناميكية في LocalStorage
function saveDynamicData() {
  try {
    saveMapToStorage(StorageKeys.CONVERSATIONS, dynamicConversations);
    saveMapToStorage(StorageKeys.LINKS, dynamicLinks);
    saveMapToStorage(StorageKeys.FAQS, dynamicFaqs);
    saveMapToStorage(StorageKeys.INSTRUCTIONS, dynamicInstructions);
    saveMapToStorage(StorageKeys.MISSING_RESPONSES, dynamicMissingResponses);
  } catch (error) {
    console.warn("[DEMO SERVER] Failed to save dynamic data:", error);
  }
}

// مساعد للبحث في المصفوفات
function findById<T extends { _id?: string; id?: string }>(
  arr: T[],
  id: string
): T | undefined {
  return arr.find((item) => item._id === id || item.id === id);
}

// مساعد للفلترة حسب merchantId
function filterByMerchantId<T extends { merchantId?: string }>(
  arr: T[],
  merchantId?: string | null
): T[] {
  if (!merchantId) return arr;
  return arr.filter((item) => item.merchantId === merchantId);
}

// مساعد للـ Pagination
function paginate<T>(
  arr: T[],
  page: number = 1,
  limit: number = 20
): { items: T[]; total: number; page: number; limit: number; totalPages: number } {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const items = arr.slice(startIndex, endIndex);
  return {
    items,
    total: arr.length,
    page,
    limit,
    totalPages: Math.ceil(arr.length / limit),
  };
}

// مساعد لإنشاء استجابة موحدة
function createResponse<T>(data: T, status: number = 200) {
  return HttpResponse.json(
    {
      success: status >= 200 && status < 300,
      data,
      requestId: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// دالة مساعدة لبناء الشجرة من قائمة مسطحة
function buildCategoryTree(categories: any[]): any[] {
  const categoryMap = new Map<string, any>();
  const roots: any[] = [];

  // إنشاء خريطة للفئات
  categories.forEach((cat) => {
    categoryMap.set(cat._id, { ...cat, children: [] });
  });

  // بناء الشجرة
  categories.forEach((cat) => {
    const node = categoryMap.get(cat._id)!;
    if (!cat.parent || cat.parent === null) {
      roots.push(node);
    } else {
      const parent = categoryMap.get(cat.parent);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        // إذا لم يوجد الأب، أضفه كجذر
        roots.push(node);
      }
    }
  });

  // ترتيب الفئات حسب order
  function sortByOrder(cats: any[]): any[] {
    return cats
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((cat) => ({
        ...cat,
        children: cat.children ? sortByOrder(cat.children) : undefined,
      }));
  }

  return sortByOrder(roots);
}

// دالة مساعدة لإعادة بناء path و ancestors
function rebuildCategoryPaths(categories: any[], categoryId: string, parentId: string | null, parentPath: string = ""): void {
  const category = categories.find((c) => c._id === categoryId);
  if (!category) return;

  const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, "-");
  const newPath = parentPath ? `${parentPath}/${slug}` : `/${slug}`;
  const ancestors = parentId ? [...(categories.find((c) => c._id === parentId)?.ancestors || []), parentId] : [];

  category.path = newPath;
  category.ancestors = ancestors;
  category.depth = ancestors.length;
  category.slug = slug;

  // تحديث الأطفال
  const children = categories.filter((c) => c.parent === categoryId);
  children.forEach((child) => {
    rebuildCategoryPaths(categories, child._id, categoryId, newPath);
  });
}

// دالة مساعدة لتحويل channels object إلى مصفوفة ChannelDoc[]
function convertChannelsToArray(merchantId: string, channelsObj: any): any[] {
  const channelsArray: any[] = [];
  
  // Mapping من keys في JSON إلى providers في API
  const providerMap: Record<string, string> = {
    telegram: "telegram",
    whatsappQr: "whatsapp_qr",
    whatsappApi: "whatsapp_cloud",
    webchat: "webchat",
    instagram: "instagram",
    messenger: "messenger",
  };

  if (!channelsObj || typeof channelsObj !== "object") {
    return channelsArray;
  }

  Object.keys(channelsObj).forEach((key) => {
    const channelData = channelsObj[key];
    const provider = providerMap[key] || key;
    
    if (channelData && typeof channelData === "object") {
      // استخدام _id الموجود في channelData أو إنشاء واحد جديد
      const channelId = (channelData as any)._id || `channel-${merchantId}-${key}`;
      
      channelsArray.push({
        _id: channelId,
        merchantId,
        provider,
        enabled: channelData.enabled !== undefined ? channelData.enabled : false,
        status: channelData.status || "disconnected",
        webhookUrl: channelData.webhookUrl || null,
        sessionId: channelData.sessionId || null,
        instanceId: channelData.instanceId || null,
        phoneNumberId: channelData.phoneNumberId || null,
        wabaId: channelData.wabaId || null,
        accessToken: channelData.accessToken || null,
        appSecret: channelData.appSecret || null,
        verifyToken: channelData.verifyToken || null,
        token: channelData.token || null,
        chatId: channelData.chatId || null,
        phone: channelData.phone || null,
        accountLabel: channelData.accountLabel || null,
        widgetSettings: channelData.widgetSettings || null,
        qr: (channelData as any).qr || null,
        createdAt: channelData.createdAt || new Date().toISOString(),
        updatedAt: channelData.updatedAt || new Date().toISOString(),
      });
    }
  });

  return channelsArray;
}

// ===== STOREFRONT THEME HELPERS =====
// تهيئة storefront theme من LocalStorage أو JSON
function getStorefrontTheme(merchantId: string): any {
  try {
    const stored = localStorage.getItem(StorageKeys.STOREFRONT_THEME);
    if (stored) {
      const themes = JSON.parse(stored) as Record<string, any>;
      if (themes[merchantId]) {
        return themes[merchantId];
      }
    }
  } catch (error) {
    console.warn("[DEMO SERVER] Failed to load storefront theme from localStorage:", error);
  }
  
  // Fallback إلى JSON الأصلي
  return (mockStorefrontTheme as any)[merchantId];
}

function saveStorefrontTheme(merchantId: string, theme: any): void {
  try {
    const stored = localStorage.getItem(StorageKeys.STOREFRONT_THEME);
    const themes = stored ? (JSON.parse(stored) as Record<string, any>) : {};
    themes[merchantId] = theme;
    localStorage.setItem(StorageKeys.STOREFRONT_THEME, JSON.stringify(themes));
  } catch (error) {
    console.warn("[DEMO SERVER] Failed to save storefront theme to localStorage:", error);
  }
}

// خادم MSW للعرض (استخدام setupWorker للبيئة المتصفح)
// ملاحظة: MSW يلتقط جميع الطلبات التي تطابق الـ patterns
// حتى لو كانت تحتوي على baseURL
export const demoServer = setupWorker(
  // ===== BYPASS EXTERNAL REQUESTS =====
  // تمرير طلبات الموارد الخارجية مباشرة بدون اعتراض
  http.get("https://via.placeholder.com/*", () => {
    return passthrough();
  }),
  http.get("https://flagcdn.com/*", () => {
    return passthrough();
  }),
  http.get("https://*.flagcdn.com/*", () => {
    return passthrough();
  }),

  // ===== AUTHENTICATION =====
  http.post("*/api/auth/login", async ({ request }) => {
    await delay(300); // محاكاة التأخير
    const body = (await request.json()) as { email: string; password: string };

    const user = mockUsers.find((u) => u.email === body.email);

    if (!user) {
      return createResponse(
        {
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          code: "INVALID_CREDENTIALS",
        },
        401
      );
    }

    // إنشاء token يحتوي على merchantId لاستخراجه لاحقاً
    const token = `demo-token-user-${user.id}-${Date.now()}`;
    if (user.merchantId) {
      // إضافة merchantId في token للاستخراج لاحقاً
      // استخراج آخر رقمين من ObjectId لاستخدامه في token
      const merchantNum = user.merchantId.slice(-2);
      const tokenWithMerchant = `demo-token-user-merchant-${merchantNum}-${Date.now()}`;
      
      return createResponse({
        accessToken: tokenWithMerchant,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          merchantId: user.merchantId,
          firstLogin: user.firstLogin,
          emailVerified: user.emailVerified,
          storeName: user.storeName,
          storeLogoUrl: user.storeLogoUrl,
          storeAvatarUrl: user.storeAvatarUrl,
        },
      });
    }

    return createResponse({
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        merchantId: user.merchantId,
        firstLogin: user.firstLogin,
        emailVerified: user.emailVerified,
        storeName: user.storeName,
        storeLogoUrl: user.storeLogoUrl,
        storeAvatarUrl: user.storeAvatarUrl,
      },
    });
  }),

  http.post("*/api/auth/register", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };

    const newUser = {
      id: `user-${Date.now()}`,
      name: body.name,
      email: body.email,
      role: "MERCHANT" as const,
      merchantId: `merchant-${Date.now()}`,
      firstLogin: true,
      emailVerified: false,
      storeName: null,
      storeLogoUrl: null,
      storeAvatarUrl: null,
    };

    return createResponse({
      accessToken: `demo-token-${newUser.id}`,
      user: newUser,
    });
  }),

  http.post("*/api/auth/verify-email", async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as { email: string; code: string };

    const user = mockUsers.find((u) => u.email === body.email);
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    return createResponse({
      accessToken: `demo-token-${user.id}`,
      user: {
        ...user,
        emailVerified: true,
      },
    });
  }),

  http.post("*/api/auth/forgot-password", async () => {
    await delay(300);
    return createResponse({ message: "تم إرسال رابط إعادة تعيين كلمة المرور" });
  }),

  http.get("*/api/auth/reset-password/validate", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return createResponse({ valid: false }, 400);
    }

    return createResponse({ valid: true });
  }),

  http.post("*/api/auth/reset-password", async () => {
    await delay(300);
    return createResponse({ message: "تم إعادة تعيين كلمة المرور بنجاح" });
  }),

  http.post("*/api/auth/resend-verification", async () => {
    await delay(200);
    return createResponse({ message: "تم إعادة إرسال رمز التحقق" });
  }),

  http.post("*/api/auth/ensure-merchant", async () => {
    await delay(200);
    const user = mockUsers.find((u) => u.role === "MERCHANT");
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    return createResponse({
      accessToken: `demo-token-${user.id}`,
      user,
    });
  }),

  // ===== PRODUCTS =====
  http.get("*/api/products", async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    let merchantId = url.searchParams.get("merchantId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
    if (!merchantId || merchantId === "") {
      merchantId = "507f1f77bcf86cd799439011";
    }

    console.log("[DEMO SERVER] GET /api/products", { merchantId, page, limit });

    // دمج المنتجات من JSON والمنتجات الديناميكية
    const productsMap = new Map<string, any>();
    
    // إضافة المنتجات من JSON أولاً
    (mockProducts || []).forEach((prod: any) => {
      productsMap.set(prod._id || prod.id, prod);
    });
    
    // إضافة/تحديث المنتجات من التخزين الديناميكي (الأحدث يفوز)
    const storedProducts = loadArrayFromStorage<any>(StorageKeys.PRODUCTS);
    storedProducts.forEach((prod: any) => {
      productsMap.set(prod._id || prod.id, prod);
    });

    let allProducts = Array.from(productsMap.values());
    
    // فلترة المنتجات المحذوفة
    allProducts = allProducts.filter((p: any) => !p.deleted);
    
    // فلترة حسب merchantId (الآن دائماً موجود)
    allProducts = filterByMerchantId(allProducts, merchantId);

    console.log("[DEMO SERVER] Products after filtering:", {
      merchantId,
      total: allProducts.length,
      sample: allProducts.slice(0, 2).map((p: any) => ({ id: p._id, name: p.name })),
    });

    // إذا كان هناك pagination، نرجع الشكل المطلوب
    if (page && limit) {
      const paginated = paginate(allProducts, page, limit);
      return createResponse({
        products: paginated.items,
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
      });
    }

    // إذا لم يكن هناك pagination، نرجع المصفوفة مباشرة (لتوافق مع getMerchantProducts)
    return createResponse(allProducts);
  }),

  http.get("*/api/products/:id", async ({ params }) => {
    await delay(300);
    const { id } = params;

    console.log("[DEMO SERVER] GET /api/products/:id", id);

    // البحث في المنتجات المخزنة أولاً
    const storedProducts = loadArrayFromStorage<any>(StorageKeys.PRODUCTS);
    let product = storedProducts.find((p: any) => (p._id === id || p.id === id) && !p.deleted);
    
    // إذا لم يوجد، البحث في JSON
    if (!product) {
      product = findById(mockProducts, id as string);
      // التحقق من أن المنتج لم يُحذف
      if (product) {
        const deletedProduct = storedProducts.find((p: any) => (p._id === id || p.id === id) && p.deleted);
        if (deletedProduct) {
          return createResponse({ message: "المنتج غير موجود" }, 404);
        }
      }
    }

    if (!product) {
      return createResponse({ message: "المنتج غير موجود" }, 404);
    }

    return createResponse(product);
  }),

  http.post("*/api/products", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] POST /api/products", body);

    const productId = `prod-${Date.now()}`;
    const newProduct = {
      _id: productId,
      id: productId,
      merchantId: body.merchantId || "507f1f77bcf86cd799439011",
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // حفظ المنتج في LocalStorage
    const storedProducts = loadArrayFromStorage<any>(StorageKeys.PRODUCTS);
    storedProducts.push(newProduct);
    saveArrayToStorage(StorageKeys.PRODUCTS, storedProducts);

    console.log("[DEMO SERVER] Created product:", productId);
    return createResponse(newProduct, 201);
  }),

  http.put("*/api/products/:id", async ({ params, request }) => {
    await delay(400);
    const { id } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] PUT /api/products/:id", id, body);

    // البحث في المنتجات المخزنة أولاً
    let product = findById(mockProducts, id as string);
    const storedProducts = loadArrayFromStorage<any>(StorageKeys.PRODUCTS);
    const storedIndex = storedProducts.findIndex((p: any) => (p._id === id || p.id === id));
    
    if (storedIndex !== -1) {
      product = storedProducts[storedIndex];
    }

    if (!product) {
      return createResponse({ message: "المنتج غير موجود" }, 404);
    }

    const updated = {
      ...product,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // تحديث في LocalStorage
    if (storedIndex !== -1) {
      storedProducts[storedIndex] = updated;
    } else {
      storedProducts.push(updated);
    }
    saveArrayToStorage(StorageKeys.PRODUCTS, storedProducts);

    console.log("[DEMO SERVER] Updated product:", id);
    return createResponse(updated);
  }),

  http.delete("*/api/products/:id", async ({ params }) => {
    await delay(300);
    const { id } = params;

    console.log("[DEMO SERVER] DELETE /api/products/:id", id);

    // البحث في المنتجات المخزنة
    const storedProducts = loadArrayFromStorage<any>(StorageKeys.PRODUCTS);
    const storedIndex = storedProducts.findIndex((p: any) => (p._id === id || p.id === id));
    
    // إذا كان المنتج من JSON، لا يمكن حذفه (نحذفه فقط من المخزن)
    // إذا كان من المنتجات الديناميكية، نحذفه
    if (storedIndex !== -1) {
      storedProducts.splice(storedIndex, 1);
      saveArrayToStorage(StorageKeys.PRODUCTS, storedProducts);
      console.log("[DEMO SERVER] Deleted product from storage:", id);
    } else {
      // إذا كان المنتج من JSON، نضيفه إلى قائمة المحذوفات أو نعيد رسالة
      const product = findById(mockProducts, id as string);
      if (!product) {
        return createResponse({ message: "المنتج غير موجود" }, 404);
      }
      // نضيف المنتج إلى قائمة المحذوفات (نضيف علامة deleted)
      const deletedProduct = { ...product, deleted: true, deletedAt: new Date().toISOString() };
      storedProducts.push(deletedProduct);
      saveArrayToStorage(StorageKeys.PRODUCTS, storedProducts);
      console.log("[DEMO SERVER] Marked product as deleted:", id);
    }

    return createResponse({ message: "تم حذف المنتج بنجاح" });
  }),

  http.post("*/api/products/:id/images", async ({ params }) => {
    await delay(600);
    const { id } = params;
    const product = findById(mockProducts, id as string);

    if (!product) {
      return createResponse({ message: "المنتج غير موجود" }, 404);
    }

    return createResponse({
      urls: [
        "https://via.placeholder.com/800x800?text=Image+1",
        "https://via.placeholder.com/800x800?text=Image+2",
      ],
      count: 2,
      accepted: 2,
      remaining: 4,
    });
  }),

  // ===== CONVERSATIONS =====
  http.get("*/api/messages", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    const channel = url.searchParams.get("channel");

    console.log("[DEMO SERVER] GET /api/messages", { merchantId, channel });

    // دمج المحادثات من JSON والمحادثات الديناميكية مع تجنب التكرار
    const conversationsMap = new Map<string, any>();
    
    // إضافة المحادثات من JSON أولاً
    mockConversations.forEach((conv) => {
      conversationsMap.set(conv.sessionId, conv);
    });
    
    // إضافة/تحديث المحادثات من التخزين الديناميكي (الأحدث يفوز)
    dynamicConversations.forEach((conv, sessionId) => {
      conversationsMap.set(sessionId, conv);
    });

    const allConversations = Array.from(conversationsMap.values());

    let filtered = allConversations;
    
    // إذا كان merchantId موجوداً، فلتر حسبه
    // إذا كان فارغاً أو غير موجود، نعيد جميع المحادثات للديمو
    if (merchantId && merchantId.trim() !== "") {
      filtered = filterByMerchantId(allConversations, merchantId);
      // إذا لم نجد محادثات لهذا merchant، نعيد محادثات التاجر الافتراضي للديمو
      if (filtered.length === 0) {
        console.log("[DEMO SERVER] No conversations for merchantId, returning demo conversations");
        filtered = filterByMerchantId(allConversations, "507f1f77bcf86cd799439011");
      }
    } else {
      // إذا لم يكن هناك merchantId، نعيد محادثات التاجر الافتراضي للديمو
      console.log("[DEMO SERVER] No merchantId provided, returning demo conversations");
      filtered = filterByMerchantId(allConversations, "507f1f77bcf86cd799439011");
    }
    
    if (channel && channel.trim() !== "") {
      filtered = filtered.filter((c) => c.channel === channel);
    }

    // تحديث الرسائل من التخزين الديناميكي
    const updatedConversations = filtered.map((conv) => {
      // البحث في dynamicConversations أولاً (الأحدث)
      const dynamicConv = dynamicConversations.get(conv.sessionId);
      if (dynamicConv) {
        // التأكد من وجود الرسائل
        const messages = dynamicConv.messages && dynamicConv.messages.length > 0 
          ? dynamicConv.messages 
          : (conv.messages && conv.messages.length > 0 ? conv.messages : []);
        
        return {
          ...conv,
          messages: messages,
          handoverToAgent: dynamicConv.handoverToAgent,
          updatedAt: dynamicConv.updatedAt,
        };
      }
      
      // إذا لم توجد في dynamicConversations، استخدم الرسائل من conv مباشرة
      // أو ابحث في mockConversations
      let messages = conv.messages || [];
      if (!messages || messages.length === 0) {
        const jsonConv = mockConversations.find((c) => c.sessionId === conv.sessionId);
        if (jsonConv && jsonConv.messages && jsonConv.messages.length > 0) {
          messages = jsonConv.messages;
          console.log("[DEMO SERVER] Restored messages from mockConversations for:", conv.sessionId, "count:", messages.length);
        }
      }
      
      return {
        ...conv,
        messages: messages,
      };
    });

    // ترتيب المحادثات حسب آخر تحديث (الأحدث أولاً)
    updatedConversations.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // التأكد من أن جميع المحادثات تحتوي على الرسائل
    const finalConversations = updatedConversations.map((conv) => {
      // التأكد من وجود الرسائل
      if (!conv.messages || !Array.isArray(conv.messages) || conv.messages.length === 0) {
        console.warn("[DEMO SERVER] Conversation missing messages:", conv.sessionId, conv.channel);
        // البحث عن الرسائل في التخزين الديناميكي أو JSON
        const dynamicConv = dynamicConversations.get(conv.sessionId);
        if (dynamicConv && dynamicConv.messages) {
          return { ...conv, messages: dynamicConv.messages };
        }
        // البحث في mockConversations
        const jsonConv = mockConversations.find((c) => c.sessionId === conv.sessionId);
        if (jsonConv && jsonConv.messages) {
          return { ...conv, messages: jsonConv.messages };
        }
      }
      return conv;
    });

    console.log("[DEMO SERVER] Returning conversations:", finalConversations.length, "for merchantId:", merchantId || "demo", "channel:", channel || "all");
    console.log("[DEMO SERVER] Channels breakdown:", {
      whatsapp: finalConversations.filter((c) => c.channel === "whatsapp").length,
      telegram: finalConversations.filter((c) => c.channel === "telegram").length,
      webchat: finalConversations.filter((c) => c.channel === "webchat").length,
    });
    console.log("[DEMO SERVER] Messages per conversation:", finalConversations.map((c) => ({
      sessionId: c.sessionId,
      channel: c.channel,
      merchantId: c.merchantId,
      messagesCount: c.messages?.length || 0,
      hasMessages: !!(c.messages && Array.isArray(c.messages) && c.messages.length > 0),
    })));
    
    // التأكد النهائي من أن جميع المحادثات تحتوي على الرسائل
    const verifiedConversations = finalConversations.map((conv) => {
      // إذا كانت الرسائل مفقودة، حاول البحث عنها مرة أخرى
      if (!conv.messages || !Array.isArray(conv.messages) || conv.messages.length === 0) {
        console.warn("[DEMO SERVER] Final check - Conversation missing messages:", conv.sessionId);
        
        // البحث في dynamicConversations
        const dynamicConv = dynamicConversations.get(conv.sessionId);
        if (dynamicConv && dynamicConv.messages && dynamicConv.messages.length > 0) {
          console.log("[DEMO SERVER] Found messages in dynamicConversations for:", conv.sessionId, "count:", dynamicConv.messages.length);
          return { ...conv, messages: dynamicConv.messages };
        }
        
        // البحث في mockConversations
        const jsonConv = mockConversations.find((c) => c.sessionId === conv.sessionId);
        if (jsonConv && jsonConv.messages && jsonConv.messages.length > 0) {
          console.log("[DEMO SERVER] Found messages in mockConversations for:", conv.sessionId, "count:", jsonConv.messages.length);
          return { ...conv, messages: jsonConv.messages };
        }
        
        console.error("[DEMO SERVER] No messages found for conversation:", conv.sessionId);
      }
      return conv;
    });
    
    return createResponse(verifiedConversations);
  }),

  http.get("*/api/messages/session/:sessionId", async ({ params }) => {
    await delay(200);
    const { sessionId } = params;
    
    console.log("[DEMO SERVER] GET /api/messages/session/:sessionId", sessionId);

    // البحث عن محادثة في التخزين الديناميكي أو JSON
    let conversation = dynamicConversations.get(sessionId as string);
    
    if (!conversation) {
      // البحث في mockConversations
      conversation = mockConversations.find((c) => c.sessionId === sessionId) as any;
      if (conversation) {
        // نسخ المحادثة إلى التخزين الديناميكي
        dynamicConversations.set(sessionId as string, { ...conversation });
        conversation = dynamicConversations.get(sessionId as string)!;
      }
    }

    if (!conversation) {
      // إنشاء محادثة جديدة للديمو
      conversation = {
        _id: `conv-${Date.now()}`,
        merchantId: "507f1f77bcf86cd799439011",
        sessionId: sessionId as string,
        channel: "webchat",
        messages: [],
        handoverToAgent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dynamicConversations.set(sessionId as string, conversation);
      saveDynamicData();
    }

    // التأكد من أن conversation موجود
    if (!conversation) {
      return createResponse({ message: "المحادثة غير موجودة" }, 404);
    }

    return createResponse({
      _id: conversation._id,
      sessionId: conversation.sessionId,
      merchantId: conversation.merchantId,
      channel: conversation.channel,
      handoverToAgent: conversation.handoverToAgent ?? false,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  }),

  http.get("*/api/messages/public/:slug/webchat/:sessionId", async ({ params }) => {
    await delay(200);
    const { sessionId } = params;
    
    console.log("[DEMO SERVER] GET /api/messages/public/:slug/webchat/:sessionId", sessionId);
    
    // البحث عن محادثة في التخزين الديناميكي أولاً
    let conversation = dynamicConversations.get(sessionId as string);

    if (!conversation) {
      // البحث في mockConversations
      conversation = mockConversations.find((c) => c.sessionId === sessionId) as any;
      if (conversation) {
        // نسخ المحادثة إلى التخزين الديناميكي
        dynamicConversations.set(sessionId as string, { ...conversation });
        conversation = dynamicConversations.get(sessionId as string)!;
        console.log("[DEMO SERVER] Found conversation in mockConversations:", sessionId, "Messages:", conversation.messages?.length || 0);
      }
    }

    if (!conversation) {
      // إنشاء محادثة جديدة للديمو مع رسالة ترحيبية
      conversation = {
        _id: `conv-${Date.now()}`,
        merchantId: "507f1f77bcf86cd799439011",
        sessionId: sessionId as string,
        channel: "webchat",
        messages: [
          {
            role: "bot",
            text: "مرحباً! أنا مساعد كليم. كيف يمكنني مساعدتك اليوم؟",
            timestamp: new Date().toISOString(),
            _id: `msg-${Date.now()}`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dynamicConversations.set(sessionId as string, conversation);
      saveDynamicData();
      console.log("[DEMO SERVER] Created new conversation for session:", sessionId);
    }

    // التأكد من وجود الرسائل
    if (!conversation.messages || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
      console.warn("[DEMO SERVER] Conversation has no messages, searching in mockConversations:", sessionId);
      const jsonConv = mockConversations.find((c) => c.sessionId === sessionId);
      if (jsonConv && jsonConv.messages && jsonConv.messages.length > 0) {
        conversation.messages = jsonConv.messages as any;
        dynamicConversations.set(sessionId as string, conversation);
        saveDynamicData();
        console.log("[DEMO SERVER] Restored messages from mockConversations:", jsonConv.messages.length);
      }
    }

    console.log("[DEMO SERVER] GET messages for session:", sessionId, "Messages count:", conversation.messages?.length || 0);
    console.log("[DEMO SERVER] Messages preview:", conversation.messages?.slice(0, 2).map((m: any) => ({ role: m.role, text: m.text?.substring(0, 50) })));
    
    return createResponse({
      messages: conversation.messages || [],
    });
  }),

  http.patch("*/api/messages/session/:sessionId/messages/:messageId/rate", async ({ params, request }) => {
    await delay(200);
    const { sessionId, messageId } = params;
    const body = (await request.json()) as { rating: number; feedback?: string };

    console.log("[DEMO SERVER] PATCH /api/messages/session/:sessionId/messages/:messageId/rate", {
      sessionId,
      messageId,
      rating: body.rating,
      feedback: body.feedback,
    });

    // البحث عن المحادثة في التخزين الديناميكي
    let conversation = dynamicConversations.get(sessionId as string);

    if (!conversation) {
      // البحث في mockConversations
      conversation = mockConversations.find((c) => c.sessionId === sessionId) as any;
      if (conversation) {
        // نسخ المحادثة إلى التخزين الديناميكي
        dynamicConversations.set(sessionId as string, { ...conversation });
        conversation = dynamicConversations.get(sessionId as string)!;
      }
    }

    if (!conversation) {
      return createResponse({ message: "المحادثة غير موجودة" }, 404);
    }

    // التأكد من وجود الرسائل
    if (!conversation.messages || !Array.isArray(conversation.messages)) {
      // محاولة استعادة الرسائل من mockConversations
      const jsonConv = mockConversations.find((c) => c.sessionId === sessionId);
      if (jsonConv && jsonConv.messages && jsonConv.messages.length > 0) {
        conversation.messages = jsonConv.messages as any;
      } else {
        conversation.messages = [];
      }
    }

    // البحث عن الرسالة وتحديثها
    const messageIndex = conversation.messages.findIndex((m: any) => m._id === messageId);
    
    if (messageIndex === -1) {
      console.warn("[DEMO SERVER] Message not found:", messageId, "in session:", sessionId);
      return createResponse({ message: "الرسالة غير موجودة" }, 404);
    }

    // تحديث التقييم والملاحظات
    const updatedMessage = {
      ...conversation.messages[messageIndex],
      rating: body.rating as 0 | 1 | null,
      feedback: body.feedback || null,
    };

    conversation.messages[messageIndex] = updatedMessage;
    conversation.updatedAt = new Date().toISOString();

    // حفظ التغييرات
    dynamicConversations.set(sessionId as string, conversation);
    saveDynamicData();

    console.log("[DEMO SERVER] Updated message rating:", {
      messageId,
      rating: updatedMessage.rating,
      feedback: updatedMessage.feedback,
    });

    return createResponse({
      message: "تم تقييم الرسالة بنجاح",
      rating: body.rating,
      feedback: body.feedback,
    });
  }),

  http.patch("*/api/messages/session/:sessionId/handover", async ({ params, request }) => {
    await delay(200);
    const { sessionId } = params;
    const body = (await request.json()) as { handoverToAgent: boolean };

    console.log("[DEMO SERVER] PATCH /api/messages/session/:sessionId/handover", { sessionId, handoverToAgent: body.handoverToAgent });

    // البحث عن المحادثة وتحديث حالة handoverToAgent
    let conversation = dynamicConversations.get(sessionId as string);
    
    if (!conversation) {
      // البحث في mockConversations
      conversation = mockConversations.find((c) => c.sessionId === sessionId) as any;
      if (conversation) {
        // نسخ المحادثة إلى التخزين الديناميكي لتعديلها
        dynamicConversations.set(sessionId as string, { ...conversation });
        conversation = dynamicConversations.get(sessionId as string)!;
      }
    }

    if (conversation) {
      // تحديث حالة handoverToAgent في المحادثة
      (conversation as any).handoverToAgent = body.handoverToAgent;
      (conversation as any).updatedAt = new Date().toISOString();
      dynamicConversations.set(sessionId as string, conversation);
      saveDynamicData();
      console.log("[DEMO SERVER] Updated handoverToAgent:", body.handoverToAgent);
    }

    return createResponse({
      handoverToAgent: body.handoverToAgent,
      message: body.handoverToAgent ? "تم نقل المحادثة للوكيل" : "تم إرجاع المحادثة للبوت",
    });
  }),

  http.post("*/api/webhooks/chat/incoming/:slug", async ({ params, request }) => {
    console.log("[DEMO SERVER] Received POST /api/webhooks/chat/incoming/:slug", params);
    await delay(500); // محاكاة وقت معالجة
    const { slug: _slug } = params;
    const body = (await request.json()) as {
      sessionId: string;
      text: string;
      user?: { id?: string; name?: string };
      channel?: string;
      embedMode?: string;
    };

    console.log("[DEMO SERVER] Request body:", body);
    const sessionId = body.sessionId || `webchat-${Date.now()}`;
    const userMessage = body.text || "";

    // البحث عن محادثة موجودة أو إنشاء واحدة جديدة
    let conversation = dynamicConversations.get(sessionId);

    if (!conversation) {
      conversation = {
        _id: `conv-${Date.now()}`,
        merchantId: "507f1f77bcf86cd799439011",
        sessionId: sessionId,
        channel: "webchat",
        messages: [
          {
            role: "bot",
            text: "مرحباً! أنا مساعد كليم. كيف يمكنني مساعدتك اليوم؟",
            timestamp: new Date().toISOString(),
            _id: `msg-${Date.now()}`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dynamicConversations.set(sessionId, conversation);
      saveDynamicData();
    }

    // إضافة رسالة المستخدم
    const customerMessage = {
      role: "customer" as const,
      text: userMessage,
      timestamp: new Date().toISOString(),
      _id: `msg-${Date.now()}-customer`,
    };

    conversation.messages.push(customerMessage);

    // محاكاة رد ذكي من البوت بناءً على الرسالة
    let botReply = "شكراً لرسالتك! كيف يمكنني مساعدتك؟";
    const text = userMessage.toLowerCase();

    if (text.includes("مرحب") || text.includes("أهلاً") || text.includes("السلام")) {
      botReply = "أهلاً وسهلاً! أنا مساعد كليم. كيف يمكنني مساعدتك اليوم؟";
    } else if (text.includes("سعر") || text.includes("تكلفة") || text.includes("كم")) {
      botReply = "يمكنك الاطلاع على الأسعار في صفحة المنتجات. هل تريد معرفة سعر منتج محدد؟";
    } else if (text.includes("شحن") || text.includes("توصيل")) {
      botReply = "نقدم خدمة الشحن في جميع أنحاء اليمن خلال 1-3 أيام عمل. الشحن مجاني للطلبات التي تزيد عن 150,000 ريال يمني.";
    } else if (text.includes("ضمان") || text.includes("كفالة")) {
      botReply = "جميع المنتجات الإلكترونية تأتي بضمان من الشركة المصنعة لمدة سنة واحدة.";
    } else if (text.includes("متوفر") || text.includes("موجود")) {
      botReply = "نعم، المنتج متوفر حالياً. هل تريد إضافته إلى السلة؟";
    } else if (text.includes("شكر") || text.includes("مشكور")) {
      botReply = "العفو! أنا هنا لمساعدتك دائماً. هل لديك أي أسئلة أخرى؟";
    } else if (text.includes("منتج") || text.includes("سلعة")) {
      botReply = "لدينا مجموعة متنوعة من المنتجات الإلكترونية. يمكنك تصفح المتجر أو أخبرني عن المنتج الذي تبحث عنه.";
    } else if (text.includes("طلب") || text.includes("شراء")) {
      botReply = "رائع! يمكنك إضافة المنتجات إلى السلة من المتجر. هل تحتاج مساعدة في إتمام الطلب؟";
    }

    // إضافة رد البوت بعد تأخير قصير
    const botMessage = {
      role: "bot" as const,
      text: botReply,
      timestamp: new Date().toISOString(),
      _id: `msg-${Date.now()}-bot`,
    };

    conversation.messages.push(botMessage);
    conversation.updatedAt = new Date().toISOString();

    // حفظ المحادثة المحدثة
    dynamicConversations.set(sessionId, conversation);

    console.log("[DEMO SERVER] Bot reply added:", botReply);
    console.log("[DEMO SERVER] Conversation messages count:", conversation.messages.length);

    return createResponse({
      message: "تم استلام الرسالة بنجاح",
      sessionId: sessionId,
      status: "accepted",
    });
  }),

  http.post("*/api/webhooks/agent-reply/:merchantId", async ({ params, request }) => {
    console.log("[DEMO SERVER] Received POST /api/webhooks/agent-reply/:merchantId", params);
    await delay(300);
    const { merchantId } = params;
    const body = (await request.json()) as {
      sessionId: string;
      text: string;
      channel: string;
      agentId?: string;
    };

    console.log("[DEMO SERVER] Agent message:", body);

    const sessionId = body.sessionId;
    const agentMessage = body.text;

    // البحث عن المحادثة
    let conversation = dynamicConversations.get(sessionId);

    if (!conversation) {
      // البحث في mockConversations
      conversation = mockConversations.find((c) => c.sessionId === sessionId) as any;
      if (conversation) {
        dynamicConversations.set(sessionId, { ...conversation });
        conversation = dynamicConversations.get(sessionId)!;
      }
    }

    if (!conversation) {
      // إنشاء محادثة جديدة
      conversation = {
        _id: `conv-${Date.now()}`,
        merchantId: merchantId as string,
        sessionId: sessionId,
        channel: body.channel as any,
        messages: [],
        handoverToAgent: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dynamicConversations.set(sessionId, conversation);
      saveDynamicData();
    }

    // إضافة رسالة الموظف
    const message = {
      role: "agent" as const,
      text: agentMessage,
      timestamp: new Date().toISOString(),
      _id: `msg-${Date.now()}-agent`,
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    dynamicConversations.set(sessionId, conversation);
    saveDynamicData();

    console.log("[DEMO SERVER] Agent message added to conversation");

    // محاكاة WebSocket: إرسال الرسالة إلى جميع المتصفحات المفتوحة
    // في الواقع، سيتم جلب الرسائل عبر polling
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("demo-message-received", {
          detail: {
            sessionId,
            message,
          },
        })
      );
    }

    return createResponse({
      sessionId: sessionId,
      status: "sent",
    });
  }),

  http.post("*/api/webhooks/incoming/:merchantId", async ({ params, request }) => {
    console.log("[DEMO SERVER] Received POST /api/webhooks/incoming/:merchantId", params);
    await delay(500);
    const body = (await request.json()) as {
      sessionId?: string;
      from?: string;
      text?: string;
      channel?: string;
    };
    console.log("[DEMO SERVER] Request body (legacy):", body);
    
    const sessionId = body.sessionId || body.from || `webchat-${Date.now()}`;
    const userMessage = body.text || "";

    // استخدام نفس منطق الـ handler الموحّد
    let conversation = dynamicConversations.get(sessionId);

    if (!conversation) {
      conversation = {
        _id: `conv-${Date.now()}`,
        merchantId: params.merchantId as string,
        sessionId: sessionId,
        channel: "webchat",
        messages: [
          {
            role: "bot",
            text: "مرحباً! أنا مساعد كليم. كيف يمكنني مساعدتك اليوم؟",
            timestamp: new Date().toISOString(),
            _id: `msg-${Date.now()}`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dynamicConversations.set(sessionId, conversation);
    }

    if (userMessage) {
      const customerMessage = {
        role: "customer" as const,
        text: userMessage,
        timestamp: new Date().toISOString(),
        _id: `msg-${Date.now()}-customer`,
      };
      conversation.messages.push(customerMessage);

      const text = userMessage.toLowerCase();
      let botReply = "شكراً لرسالتك! كيف يمكنني مساعدتك؟";
      if (text.includes("مرحب") || text.includes("أهلاً") || text.includes("السلام")) {
        botReply = "أهلاً وسهلاً! أنا مساعد كليم. كيف يمكنني مساعدتك اليوم؟";
      } else if (text.includes("سعر") || text.includes("تكلفة") || text.includes("كم")) {
        botReply = "يمكنك الاطلاع على الأسعار في صفحة المنتجات. هل تريد معرفة سعر منتج محدد؟";
      } else if (text.includes("شحن") || text.includes("توصيل")) {
        botReply = "نقدم خدمة الشحن في جميع أنحاء اليمن خلال 1-3 أيام عمل. الشحن مجاني للطلبات التي تزيد عن 150,000 ريال يمني.";
      } else if (text.includes("ضمان") || text.includes("كفالة")) {
        botReply = "جميع المنتجات الإلكترونية تأتي بضمان من الشركة المصنعة لمدة سنة واحدة.";
      } else if (text.includes("متوفر") || text.includes("موجود")) {
        botReply = "نعم، المنتج متوفر حالياً. هل تريد إضافته إلى السلة؟";
      } else if (text.includes("شكر") || text.includes("مشكور")) {
        botReply = "العفو! أنا هنا لمساعدتك دائماً. هل لديك أي أسئلة أخرى؟";
      }

      const botMessage = {
        role: "bot" as const,
        text: botReply,
        timestamp: new Date().toISOString(),
        _id: `msg-${Date.now()}-bot`,
      };
      conversation.messages.push(botMessage);
      conversation.updatedAt = new Date().toISOString();
      dynamicConversations.set(sessionId, conversation);
      saveDynamicData();
    }

    return createResponse({
      message: "تم إرسال الرسالة بنجاح",
      sessionId: sessionId,
      status: "accepted",
    });
  }),

  // ===== DASHBOARD & ANALYTICS =====
  http.get("*/api/analytics/overview", async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "month";
    const merchantId = url.searchParams.get("merchantId");

    console.log("[DEMO SERVER] GET /api/analytics/overview", { period, merchantId });

    // حساب البيانات الديناميكية بناءً على merchantId
    const merchantProducts = merchantId 
      ? filterByMerchantId(mockProducts, merchantId)
      : mockProducts;
    
    const merchantOrders = merchantId
      ? filterByMerchantId(mockOrders, merchantId)
      : mockOrders;
    
    const merchantConversations = merchantId
      ? filterByMerchantId(Array.from(dynamicConversations.values()), merchantId)
      : Array.from(dynamicConversations.values());

    // حساب الإحصائيات بناءً على البيانات المفلترة
    const dashboard = {
      ...mockDashboard,
      productsCount: merchantProducts.length,
      orders: {
        ...mockDashboard.orders,
        count: merchantOrders.length,
        byStatus: {
          pending: merchantOrders.filter((o: any) => o.status === "pending").length,
          confirmed: merchantOrders.filter((o: any) => o.status === "confirmed").length,
          shipped: merchantOrders.filter((o: any) => o.status === "shipped").length,
          delivered: merchantOrders.filter((o: any) => o.status === "delivered").length,
          cancelled: merchantOrders.filter((o: any) => o.status === "canceled" || o.status === "cancelled").length,
        },
        totalSales: merchantOrders.reduce((sum: number, o: any) => {
          const orderTotal = (o.products || []).reduce((pSum: number, p: any) => pSum + (p.price * p.quantity), 0);
          return sum + orderTotal;
        }, 0),
      },
      sessions: {
        count: merchantConversations.length,
        changePercent: mockDashboard.sessions.changePercent,
      },
      messages: merchantConversations.reduce((sum: number, c: any) => sum + (c.messages?.length || 0), 0),
      topProducts: merchantProducts.slice(0, 4).map((p: any) => ({
        productId: p._id,
        name: p.name,
        count: Math.floor(Math.random() * 50) + 10, // عدد عشوائي للديمو
      })),
    };

    return createResponse(dashboard);
  }),

  http.get("*/api/analytics/products-count", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");

    const merchantProducts = merchantId 
      ? filterByMerchantId(mockProducts, merchantId)
      : mockProducts;

    return createResponse({ total: merchantProducts.length });
  }),

  http.get("*/api/analytics/messages-timeline", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const period = (url.searchParams.get("period") || "week") as "week" | "month" | "quarter";
    const groupBy = url.searchParams.get("groupBy") || "day";

    console.log("[DEMO SERVER] GET /api/analytics/messages-timeline", { period, groupBy });

    // إرجاع البيانات حسب الفترة المطلوبة
    let timelineData: Array<{ _id: string; count: number }> = [];
    
    if (mockAnalytics.messagesTimeline && typeof mockAnalytics.messagesTimeline === "object") {
      const timeline = mockAnalytics.messagesTimeline as any;
      timelineData = timeline[period] || timeline.week || timeline.month || timeline.quarter || [];
    }

    console.log("[DEMO SERVER] Returning timeline data:", {
      period,
      count: timelineData.length,
      sample: timelineData.slice(0, 3),
    });

    return createResponse(timelineData);
  }),

  http.get("*/api/analytics/top-products", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "month";
    const limit = parseInt(url.searchParams.get("limit") || "8");
    const merchantId = url.searchParams.get("merchantId");

    console.log("[DEMO SERVER] GET /api/analytics/top-products", { period, limit, merchantId });

    const merchantProducts = merchantId 
      ? filterByMerchantId(mockProducts, merchantId)
      : mockProducts;

    const topProducts = merchantProducts.slice(0, limit).map((p: any) => ({
      productId: p._id,
      name: p.name,
      count: Math.floor(Math.random() * 50) + 10, // عدد عشوائي للديمو
    }));

    console.log("[DEMO SERVER] Returning top products:", {
      count: topProducts.length,
      sample: topProducts.slice(0, 3),
    });

    return createResponse(topProducts);
  }),

  http.get("*/api/analytics/top-keywords", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    // const _period = url.searchParams.get("period") || "month"; // Unused
    const limit = parseInt(url.searchParams.get("limit") || "10");

    return createResponse(mockDashboard.topKeywords.slice(0, limit));
  }),

  http.get("*/api/analytics/missing-responses/stats", async () => {
    await delay(300);
    // const url = new URL(request.url); // Unused
    // const _days = parseInt(url.searchParams.get("days") || "7"); // Unused

    return createResponse(mockAnalytics.missingResponses.stats);
  }),

  http.get("*/api/analytics/missing-responses", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const channel = url.searchParams.get("channel") || "all";
    // const _resolved = url.searchParams.get("resolved") || "false"; // Unused

    let filtered = mockAnalytics.missingResponses.unresolved;
    if (channel !== "all") {
      filtered = filtered.filter((item) => item.channel === channel);
    }

    const paginated = paginate(filtered, page, limit);

    return createResponse({
      items: paginated.items,
      total: paginated.total,
    });
  }),

  http.get("*/api/merchants/:merchantId/checklist", async ({ params }) => {
    await delay(300);
    const { merchantId: _merchantId } = params;

    const checklist: Array<{
      key: string;
      title: string;
      items: Array<{
        key: string;
        title: string;
        isComplete: boolean;
        message?: string;
        actionPath?: string;
        skippable?: boolean;
        isSkipped?: boolean;
      }>;
    }> = [
      {
        key: "setup",
        title: "الإعدادات الأساسية",
        items: [
          {
            key: "add-products",
            title: "إضافة منتجات",
            isComplete: true,
            message: "تم إضافة 4 منتجات",
          },
          {
            key: "connect-channel",
            title: "ربط قناة اتصال",
            isComplete: true,
            message: "واتساب متصل",
            actionPath: "/merchant/channels",
          },
          {
            key: "setup-knowledge",
            title: "إعداد قاعدة المعرفة",
            isComplete: false,
            message: "أضف أسئلة شائعة",
            actionPath: "/merchant/knowledge",
            skippable: true,
          },
        ],
      },
    ];

    return createResponse(checklist);
  }),

  http.post("*/api/merchants/:merchantId/checklist/:itemKey/skip", async () => {
    await delay(200);
    return createResponse({ message: "تم تخطي العنصر" });
  }),

  // ===== CATEGORIES =====
  http.get("*/api/categories", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    const tree = url.searchParams.get("tree") === "true";

    console.log("[DEMO SERVER] GET /api/categories", { merchantId, tree });

    // دمج الفئات من JSON والفئات الديناميكية
    const categoriesMap = new Map<string, any>();
    
    // إضافة الفئات من JSON أولاً
    function addCategoriesFromJSON(cats: any[]) {
      cats.forEach((cat: any) => {
        categoriesMap.set(cat._id, { ...cat });
        if (cat.children && Array.isArray(cat.children)) {
          addCategoriesFromJSON(cat.children);
        }
      });
    }
    addCategoriesFromJSON(mockCategories);
    
    // إضافة/تحديث الفئات من التخزين الديناميكي (الأحدث يفوز)
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    storedCategories.forEach((cat: any) => {
      if (!cat.deleted) {
        categoriesMap.set(cat._id, cat);
      }
    });

    let allCategories = Array.from(categoriesMap.values());
    
    // فلترة حسب merchantId
    if (merchantId) {
      allCategories = filterByMerchantId(allCategories, merchantId);
    }

    // فلترة الفئات المحذوفة
    allCategories = allCategories.filter((c: any) => !c.deleted);

    console.log("[DEMO SERVER] Categories after filtering:", {
      merchantId,
      total: allCategories.length,
      sample: allCategories.slice(0, 2).map((c: any) => ({ id: c._id, name: c.name })),
    });

    if (tree) {
      // إرجاع الشجرة
      const treeData = buildCategoryTree(allCategories);
      return createResponse(treeData);
    }

    // إرجاع flat list
    return createResponse(allCategories);
  }),

  http.get("*/api/categories/:id", async ({ params }) => {
    await delay(200);
    const { id } = params;

    console.log("[DEMO SERVER] GET /api/categories/:id", id);

    function findCategory(cats: any[]): any {
      for (const cat of cats) {
        if (cat._id === id && !cat.deleted) return cat;
        if (cat.children) {
          const found = findCategory(cat.children);
          if (found) return found;
        }
      }
      return null;
    }

    // البحث في الفئات المخزنة أولاً
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    let category = storedCategories.find((c: any) => c._id === id && !c.deleted);
    
    // إذا لم يوجد، البحث في JSON
    if (!category) {
      category = findCategory(mockCategories);
      // التحقق من أن الفئة لم تُحذف
      if (category) {
        const deletedCategory = storedCategories.find((c: any) => c._id === id && c.deleted);
        if (deletedCategory) {
          return createResponse({ message: "الفئة غير موجودة" }, 404);
        }
      }
    }

    if (!category) {
      return createResponse({ message: "الفئة غير موجودة" }, 404);
    }

    return createResponse(category);
  }),

  http.get("*/api/categories/:id/breadcrumbs", async ({ params }) => {
    await delay(200);
    const { id: _id } = params;

    return createResponse([
      { name: "الرئيسية", slug: "home", path: "/", depth: 0 },
      { name: "هواتف وتابلت", slug: "phones-tablets", path: "/phones-tablets", depth: 1 },
    ]);
  }),

  http.get("*/api/categories/:id/subtree", async ({ params }) => {
    await delay(200);
    const { id } = params;

    console.log("[DEMO SERVER] GET /api/categories/:id/subtree", id);

    // دمج جميع الفئات
    const categoriesMap = new Map<string, any>();
    function addCategoriesFromJSON(cats: any[]) {
      cats.forEach((cat: any) => {
        categoriesMap.set(cat._id, { ...cat });
        if (cat.children && Array.isArray(cat.children)) {
          addCategoriesFromJSON(cat.children);
        }
      });
    }
    addCategoriesFromJSON(mockCategories);
    
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    storedCategories.forEach((cat: any) => {
      if (!cat.deleted) {
        categoriesMap.set(cat._id, cat);
      }
    });

    const allCategories = Array.from(categoriesMap.values()).filter((c: any) => !c.deleted);
    const category = allCategories.find((c: any) => c._id === id);

    if (!category) {
      return createResponse({ message: "الفئة غير موجودة" }, 404);
    }

    // بناء الشجرة الفرعية
    function buildSubtree(catId: string): any {
      const cat = allCategories.find((c: any) => c._id === catId);
      if (!cat) return null;

      const children = allCategories
        .filter((c: any) => c.parent === catId)
        .map((c) => buildSubtree(c._id))
        .filter((c) => c !== null);

      return {
        ...cat,
        children: children.length > 0 ? children : undefined,
      };
    }

    const subtree = buildSubtree(id as string);
    return createResponse(subtree);
  }),

  http.post("*/api/categories", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] POST /api/categories", body);

    const categoryId = `cat-${Date.now()}`;
    const merchantId = body.merchantId || "507f1f77bcf86cd799439011";
    const parentId = body.parent || null;
    
    // الحصول على جميع الفئات لإعادة بناء paths
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    const allCategories = [...mockCategories, ...storedCategories.filter((c: any) => !c.deleted)];
    
    // بناء slug و path
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let path = `/${slug}`;
    let ancestors: string[] = [];
    let depth = 0;

    if (parentId) {
      const parent = allCategories.find((c: any) => c._id === parentId);
      if (parent) {
        path = `${parent.path}/${slug}`;
        ancestors = [...(parent.ancestors || []), parentId];
        depth = ancestors.length + 1;
      }
    }

    // حساب order (آخر فئة في نفس المستوى + 1)
    const siblings = allCategories.filter((c: any) => c.parent === parentId && c.merchantId === merchantId);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((c: any) => c.order || 0)) : -1;
    const order = maxOrder + 1;

    const newCategory = {
      _id: categoryId,
      merchantId,
      name: body.name,
      slug,
      path,
      parent: parentId,
      image: body.image || null,
      keywords: body.keywords || [],
      ancestors,
      depth,
      order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // حفظ الفئة في LocalStorage
    storedCategories.push(newCategory);
    saveArrayToStorage(StorageKeys.CATEGORIES, storedCategories);

    console.log("[DEMO SERVER] Created category:", categoryId, newCategory.name);
    return createResponse(newCategory, 201);
  }),

  http.put("*/api/categories/:id", async ({ params, request }) => {
    await delay(400);
    const { id } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] PUT /api/categories/:id", id, body);

    // البحث في الفئات المخزنة أولاً
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    let category = storedCategories.find((c: any) => c._id === id);
    
    // إذا لم يوجد، البحث في JSON
    if (!category) {
      function findCategory(cats: any[]): any {
        for (const cat of cats) {
          if (cat._id === id) return cat;
          if (cat.children) {
            const found = findCategory(cat.children);
            if (found) return found;
          }
        }
        return null;
      }
      category = findCategory(mockCategories);
    }

    if (!category || category.deleted) {
      return createResponse({ message: "الفئة غير موجودة" }, 404);
    }

    // تحديث البيانات
    const updated = {
      ...category,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // إذا تغير parent، إعادة بناء paths و ancestors
    if (body.parent !== undefined && body.parent !== category.parent) {
      const allCategories = [...mockCategories, ...storedCategories.filter((c: any) => !c.deleted && c._id !== id)];
      const parentPath = body.parent 
        ? (allCategories.find((c: any) => c._id === body.parent)?.path || "")
        : "";
      rebuildCategoryPaths([...allCategories, updated], id as string, body.parent, parentPath);
    }

    // تحديث في LocalStorage
    const storedIndex = storedCategories.findIndex((c: any) => c._id === id);
    if (storedIndex !== -1) {
      storedCategories[storedIndex] = updated;
    } else {
      storedCategories.push(updated);
    }
    saveArrayToStorage(StorageKeys.CATEGORIES, storedCategories);

    console.log("[DEMO SERVER] Updated category:", id, updated.name);
    return createResponse(updated);
  }),

  http.patch("*/api/categories/:id/move", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] PATCH /api/categories/:id/move", id, body);

    // البحث في الفئات المخزنة أولاً
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    let category = storedCategories.find((c: any) => c._id === id);
    
    // إذا لم يوجد، البحث في JSON
    if (!category) {
      function findCategory(cats: any[]): any {
        for (const cat of cats) {
          if (cat._id === id) return cat;
          if (cat.children) {
            const found = findCategory(cat.children);
            if (found) return found;
          }
        }
        return null;
      }
      category = findCategory(mockCategories);
    }

    if (!category || category.deleted) {
      return createResponse({ message: "الفئة غير موجودة" }, 404);
    }

    const newParent = body.parent !== undefined ? body.parent : category.parent;
    
    // إعادة بناء paths و ancestors
    const allCategories = [...mockCategories, ...storedCategories.filter((c: any) => !c.deleted && c._id !== id)];
    const parentPath = newParent 
      ? (allCategories.find((c: any) => c._id === newParent)?.path || "")
      : "";
    
    rebuildCategoryPaths([...allCategories, { ...category, parent: newParent }], id as string, newParent, parentPath);
    
    const updated = {
      ...category,
      parent: newParent,
      updatedAt: new Date().toISOString(),
    };

    // تحديث order إذا تم تحديده
    if (body.position !== undefined || body.afterId || body.beforeId) {
      const siblings = allCategories.filter((c: any) => c.parent === newParent && c.merchantId === category.merchantId && c._id !== id);
      
      if (body.afterId) {
        const afterIndex = siblings.findIndex((c: any) => c._id === body.afterId);
        updated.order = afterIndex >= 0 ? siblings[afterIndex].order + 1 : siblings.length;
      } else if (body.beforeId) {
        const beforeIndex = siblings.findIndex((c: any) => c._id === body.beforeId);
        updated.order = beforeIndex >= 0 ? siblings[beforeIndex].order : siblings.length;
      } else if (body.position !== undefined) {
        updated.order = body.position;
      }
    }

    // تحديث في LocalStorage
    const storedIndex = storedCategories.findIndex((c: any) => c._id === id);
    if (storedIndex !== -1) {
      storedCategories[storedIndex] = updated;
    } else {
      storedCategories.push(updated);
    }
    saveArrayToStorage(StorageKeys.CATEGORIES, storedCategories);

    console.log("[DEMO SERVER] Moved category:", id, "to parent:", newParent);
    return createResponse(updated);
  }),

  http.delete("*/api/categories/:id", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const url = new URL(request.url);
    const cascade = url.searchParams.get("cascade") === "true";

    console.log("[DEMO SERVER] DELETE /api/categories/:id", id, { cascade });

    // البحث في الفئات المخزنة أولاً
    const storedCategories = loadArrayFromStorage<any>(StorageKeys.CATEGORIES);
    let category = storedCategories.find((c: any) => c._id === id);
    
    // إذا لم يوجد، البحث في JSON
    if (!category) {
      function findCategory(cats: any[]): any {
        for (const cat of cats) {
          if (cat._id === id) return cat;
          if (cat.children) {
            const found = findCategory(cat.children);
            if (found) return found;
          }
        }
        return null;
      }
      category = findCategory(mockCategories);
    }

    if (!category || category.deleted) {
      return createResponse({ message: "الفئة غير موجودة" }, 404);
    }

    // البحث عن الأطفال
    const allCategories = [...mockCategories, ...storedCategories.filter((c: any) => !c.deleted)];
    const children = allCategories.filter((c: any) => c.parent === id);

    if (children.length > 0 && !cascade) {
      return createResponse(
        { message: `لا يمكن حذف الفئة لأنها تحتوي على ${children.length} فئة فرعية. استخدم cascade=true لحذفها مع الفئات الفرعية.` },
        400
      );
    }

    // حذف الفئة (أو وضع علامة deleted إذا كانت من JSON)
    if (cascade) {
      // حذف جميع الأطفال بشكل متتالي
      function deleteCategoryAndChildren(catId: string) {
        const catChildren = allCategories.filter((c: any) => c.parent === catId);
        catChildren.forEach((child) => {
          deleteCategoryAndChildren(child._id);
        });
        
        const storedIndex = storedCategories.findIndex((c: any) => c._id === catId);
        if (storedIndex !== -1) {
          storedCategories.splice(storedIndex, 1);
        } else {
          // إذا كانت من JSON، نضيف علامة deleted
          const jsonCategory = allCategories.find((c: any) => c._id === catId);
          if (jsonCategory) {
            storedCategories.push({ ...jsonCategory, deleted: true, deletedAt: new Date().toISOString() });
          }
        }
      }
      
      deleteCategoryAndChildren(id as string);
    } else {
      // حذف الفئة فقط
      const storedIndex = storedCategories.findIndex((c: any) => c._id === id);
      if (storedIndex !== -1) {
        storedCategories.splice(storedIndex, 1);
      } else {
        // إذا كانت من JSON، نضيف علامة deleted
        storedCategories.push({ ...category, deleted: true, deletedAt: new Date().toISOString() });
      }
    }

    saveArrayToStorage(StorageKeys.CATEGORIES, storedCategories);

    console.log("[DEMO SERVER] Deleted category:", id, cascade ? "(with children)" : "");
    return createResponse({ message: "تم حذف الفئة بنجاح" });
  }),

  http.post("*/api/categories/:id/image", async ({ params }) => {
    await delay(500);
    const { id: _id } = params;

    return createResponse({
      url: "https://via.placeholder.com/300x300?text=Category+Image",
    });
  }),

  // ===== ORDERS =====
  http.get("*/api/orders", async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    console.log("[DEMO SERVER] GET /api/orders", { merchantId, status, page, limit });

    let filtered = mockOrders;
    
    // فلترة حسب merchantId
    if (merchantId) {
      filtered = filterByMerchantId(mockOrders, merchantId);
    }
    
    // فلترة حسب الحالة
    if (status) {
      filtered = filtered.filter((o) => o.status === status);
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const paginated = paginate(filtered, page, limit);

    console.log("[DEMO SERVER] Returning orders:", paginated.items.length, "of", paginated.total, "for merchantId:", merchantId || "all");
    return createResponse({
      orders: paginated.items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
    });
  }),

  http.get("*/api/orders/:id", async ({ params }) => {
    await delay(300);
    const { id } = params;
    const order = findById(mockOrders, id as string);

    if (!order) {
      return createResponse({ message: "الطلب غير موجود" }, 404);
    }

    return createResponse(order);
  }),

  http.patch("*/api/orders/:id/status", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const body = (await request.json()) as { status: string };

    const order = findById(mockOrders, id as string);
    if (!order) {
      return createResponse({ message: "الطلب غير موجود" }, 404);
    }

    return createResponse({
      ...order,
      status: body.status,
    });
  }),

  // ===== COUPONS =====
  http.get("*/api/coupons", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search");

    // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
    const effectiveMerchantId = merchantId || "507f1f77bcf86cd799439011";

    let filtered = mockCoupons;
    if (effectiveMerchantId) {
      filtered = filterByMerchantId(mockCoupons, effectiveMerchantId);
    }
    if (status) {
      filtered = filtered.filter((c) => c.status === status);
    }
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const paginated = paginate(filtered, page, limit);

    return createResponse({
      coupons: paginated.items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
    });
  }),

  http.get("*/api/coupons/:id", async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");

    const coupon = findById(mockCoupons, id as string);
    if (!coupon) {
      return createResponse({ message: "الكوبون غير موجود" }, 404);
    }

    if (merchantId && coupon.merchantId !== merchantId) {
      return createResponse({ message: "غير مصرح" }, 403);
    }

    return createResponse(coupon);
  }),

  http.post("*/api/coupons", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as any;

    const newCoupon = {
      _id: `coupon-${Date.now()}`,
      merchantId: body.merchantId,
      code: body.code.toUpperCase(),
      usedCount: 0,
      usedByCustomers: [],
      status: "active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    };

    return createResponse(newCoupon, 201);
  }),

  http.patch("*/api/coupons/:id", async ({ params, request }) => {
    await delay(400);
    const { id } = params;
    const body = (await request.json()) as any;

    const coupon = findById(mockCoupons, id as string);
    if (!coupon) {
      return createResponse({ message: "الكوبون غير موجود" }, 404);
    }

    return createResponse({
      ...coupon,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete("*/api/coupons/:id", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");

    const coupon = findById(mockCoupons, id as string);
    if (!coupon) {
      return createResponse({ message: "الكوبون غير موجود" }, 404);
    }

    if (merchantId && coupon.merchantId !== merchantId) {
      return createResponse({ message: "غير مصرح" }, 403);
    }

    return createResponse({ message: "تم حذف الكوبون بنجاح" });
  }),

  http.post("*/api/coupons/generate-codes", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { count: number; length?: number };

    const codes: string[] = [];
    for (let i = 0; i < body.count; i++) {
      codes.push(
        `DEMO${Math.random().toString(36).toUpperCase().slice(2, (body.length || 8) + 2)}`
      );
    }

    return createResponse({ codes });
  }),

  // ===== CHANNELS =====
  http.get("*/api/merchants/:merchantId", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    const channels = (mockChannels as any)[merchantId as string];

    if (!channels) {
      return createResponse({ message: "التاجر غير موجود" }, 404);
    }

    const merchant = (mockMerchantSettings as any)[merchantId as string];
    if (!merchant) {
      return createResponse({ message: "التاجر غير موجود" }, 404);
    }

    return createResponse({
      ...merchant,
      channels,
    });
  }),

  http.get("*/api/merchants/:merchantId/channels", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;

    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/channels", merchantId);

    // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
    const effectiveMerchantId = (merchantId as string) || "507f1f77bcf86cd799439011";
    
    const channelsObj = (mockChannels as any)[effectiveMerchantId];

    if (!channelsObj) {
      console.log("[DEMO SERVER] No channels found for merchantId:", effectiveMerchantId);
      return createResponse([]);
    }

    // تحويل الكائن إلى مصفوفة ChannelDoc[]
    const channelsArray = convertChannelsToArray(effectiveMerchantId, channelsObj);

    console.log("[DEMO SERVER] Returning channels:", channelsArray.length, "channels for merchantId:", effectiveMerchantId);
    return createResponse(channelsArray);
  }),

  http.post("*/api/merchants/:merchantId/channels", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/channels", merchantId, body);

    // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
    const effectiveMerchantId = merchantId || "507f1f77bcf86cd799439011";
    
    // Mapping من provider إلى key في JSON
    const keyMap: Record<string, string> = {
      telegram: "telegram",
      whatsapp_qr: "whatsappQr",
      whatsapp_cloud: "whatsappApi",
      webchat: "webchat",
      instagram: "instagram",
      messenger: "messenger",
    };

    const provider = body.provider || "";
    const key = keyMap[provider] || provider;

    // إنشاء قناة جديدة
    const newChannel = {
      _id: `channel-${effectiveMerchantId}-${key}-${Date.now()}`,
      merchantId: effectiveMerchantId,
      provider,
      enabled: body.enabled !== undefined ? body.enabled : true,
      status: body.status || "pending",
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("[DEMO SERVER] Created channel:", newChannel._id, "for merchantId:", effectiveMerchantId);
    return createResponse(newChannel, 201);
  }),

  http.put("*/api/merchants/:merchantId", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as any;

    const merchant = (mockMerchantSettings as any)[merchantId as string];
    if (!merchant) {
      return createResponse({ message: "التاجر غير موجود" }, 404);
    }

    return createResponse({
      ...merchant,
      ...body,
    });
  }),

  // Update channel
  http.patch("*/api/channels/:channelId", async ({ params, request }) => {
    await delay(300);
    const { channelId } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] PATCH /api/channels/:channelId", channelId, body);

    // البحث عن القناة في mockChannels وتحديثها
    const channelIdStr = channelId as string;
    let updatedChannel: any = null;

    // البحث في جميع التجار
    for (const merchantId in mockChannels) {
      const channelsObj = (mockChannels as any)[merchantId];
      for (const key in channelsObj) {
        const channel = channelsObj[key];
        // إذا كانت القناة تحتوي على _id مطابق
        if (channel && (channel as any)._id === channelIdStr) {
          updatedChannel = {
            ...channel,
            ...body,
            _id: channelIdStr,
            updatedAt: new Date().toISOString(),
          };
          // تحديث البيانات في mockChannels
          (mockChannels as any)[merchantId][key] = updatedChannel;
          break;
        }
      }
      if (updatedChannel) break;
    }

    if (!updatedChannel) {
      // إذا لم نجد القناة، أنشئ واحدة جديدة
      updatedChannel = {
        _id: channelIdStr,
        ...body,
        updatedAt: new Date().toISOString(),
      };
    }

    return createResponse(updatedChannel);
  }),

  // Delete/Disable/Disconnect/Wipe channel
  http.delete("*/api/channels/:channelId", async ({ params, request }) => {
    await delay(300);
    const { channelId } = params;
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "disconnect";

    console.log("[DEMO SERVER] DELETE /api/channels/:channelId", channelId, mode);

    const channelIdStr = channelId as string;

    // البحث عن القناة وتحديث حالتها حسب mode
    for (const merchantId in mockChannels) {
      const channelsObj = (mockChannels as any)[merchantId];
      for (const key in channelsObj) {
        const channel = channelsObj[key];
        if (channel && (channel as any)._id === channelIdStr) {
          if (mode === "wipe") {
            // حذف كامل: إزالة البيانات الحساسة
            (mockChannels as any)[merchantId][key] = {
              enabled: false,
              status: "disconnected",
            };
          } else if (mode === "disable") {
            // تعطيل: تعطيل القناة فقط
            (mockChannels as any)[merchantId][key] = {
              ...channel,
              enabled: false,
              status: "disconnected",
            };
          } else {
            // فصل: فصل الاتصال ولكن الحفاظ على الإعدادات
            (mockChannels as any)[merchantId][key] = {
              ...channel,
              enabled: false,
              status: "disconnected",
            };
          }
          break;
        }
      }
    }

    return createResponse({
      message: `تم ${mode === "wipe" ? "حذف" : mode === "disable" ? "تعطيل" : "فصل"} القناة بنجاح`,
    });
  }),

  // Connect channel (for WhatsApp QR, Telegram, etc.)
  // يجب أن يكون هذا الـ handler قبل الـ handlers العامة
  // استخدام pattern أكثر مرونة لدعم channelId مع شرطات
  http.post("*/api/channels/*/actions/connect", async ({ request }) => {
    await delay(500);
    
    // استخراج channelId من URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const channelIdIndex = pathParts.indexOf("channels");
    const channelIdStr = channelIdIndex >= 0 && channelIdIndex < pathParts.length - 1 
      ? pathParts[channelIdIndex + 1] 
      : "";
    
    console.log("[DEMO SERVER] POST /api/channels/*/actions/connect", channelIdStr, "URL:", url.pathname);
    
    // let _body: any = {}; // Unused
    try {
      await request.json(); // Parse but don't store
    } catch (e) {
      // تجاهل خطأ parsing إذا كان body فارغاً
    }

    // البحث عن القناة
    // الـ channelId يأتي بالشكل: channel-{merchantId}-{key} أو channel-{merchantId}-{key}-{timestamp}
    let channel: any = null;
    let merchantId: string | null = null;
    let channelKey: string | null = null;

    // محاولة استخراج merchantId و channelKey من channelId
    const channelIdParts = channelIdStr.split("-");
    if (channelIdParts.length >= 3 && channelIdParts[0] === "channel") {
      // channel-{merchantId}-{key} أو channel-{merchantId}-{key}-{timestamp}
      const possibleMerchantId = channelIdParts[1];
      const possibleKey = channelIdParts[2];
      
      // البحث في mockChannels
      if ((mockChannels as any)[possibleMerchantId]) {
        const channelsObj = (mockChannels as any)[possibleMerchantId];
        const keyMap: Record<string, string> = {
          whatsappQr: "whatsappQr",
          whatsappqr: "whatsappQr",
          telegram: "telegram",
          webchat: "webchat",
          whatsappApi: "whatsappApi",
          whatsappapi: "whatsappApi",
        };
        
        const normalizedKey = keyMap[possibleKey] || possibleKey;
        
        if (channelsObj[normalizedKey]) {
          channel = channelsObj[normalizedKey];
          merchantId = possibleMerchantId;
          channelKey = normalizedKey;
        }
      }
    }

    // إذا لم نجد القناة بالطريقة السابقة، ابحث في جميع التجار
    if (!channel) {
      for (const mid in mockChannels) {
        const channelsObj = (mockChannels as any)[mid];
        for (const key in channelsObj) {
          const ch = channelsObj[key];
          const chId = (ch as any)._id || `channel-${mid}-${key}`;
          if (chId === channelIdStr || chId.includes(channelIdStr) || channelIdStr.includes(chId)) {
            channel = ch;
            merchantId = mid;
            channelKey = key;
            break;
          }
        }
        if (channel) break;
      }
    }

    // إذا لم نجد القناة، أنشئ واحدة جديدة للـ WhatsApp QR
    if (!channel && channelIdStr.includes("whatsappQr")) {
      // استخراج merchantId من channelId
      const merchantIdMatch = channelIdStr.match(/channel-([^-]+)-/);
      if (merchantIdMatch && merchantIdMatch[1]) {
        merchantId = merchantIdMatch[1];
        channelKey = "whatsappQr";
        
        // إنشاء قناة جديدة
        if (!(mockChannels as any)[merchantId]) {
          (mockChannels as any)[merchantId] = {};
        }
        
        channel = {
          _id: channelIdStr,
          enabled: false,
          status: "disconnected",
        };
        
        (mockChannels as any)[merchantId][channelKey] = channel;
      }
    }

    if (!channel || !merchantId || !channelKey) {
      console.warn("[DEMO SERVER] Channel not found:", channelIdStr);
      return createResponse({ message: "القناة غير موجودة" }, 404);
    }

    // إذا كانت قناة WhatsApp QR، أنشئ QR code وهمي
    if (channelKey === "whatsappQr" || (channel as any).provider === "whatsapp_qr") {
      // إنشاء QR code وهمي (base64 صورة QR code بسيطة)
      // هذا QR code وهمي - في الإنتاج سيتم توليده من Evolution API
      // QR code بسيط يحتوي على نص "WHATSAPP:CONNECT"
      // صورة PNG 200x200 بكسل مع نمط QR code بسيط
      const qrCodeBase64 = generateMockQRCode();
      
      // تحديث حالة القناة في mockChannels
      const updatedChannel = {
        ...channel,
        _id: channelIdStr,
        enabled: true,
        status: "pending",
        qr: `data:image/png;base64,${qrCodeBase64}`,
        updatedAt: new Date().toISOString(),
      };
      
      (mockChannels as any)[merchantId!][channelKey!] = updatedChannel;

      return createResponse({
        qr: `data:image/png;base64,${qrCodeBase64}`,
        status: "pending",
      });
    }

    // للقنوات الأخرى، فقط قم بتحديث الحالة
    if (merchantId && channelKey) {
      (mockChannels as any)[merchantId][channelKey] = {
        ...channel,
        enabled: true,
        status: "connected",
        updatedAt: new Date().toISOString(),
      };
    }

    return createResponse({
      status: "connected",
    });
  }),

  // Get channel status (for polling QR code status)
  http.get("*/api/channels/:channelId/status", async ({ params }) => {
    await delay(200);
    const { channelId } = params;

    const channelIdStr = channelId as string;

    // البحث عن القناة
    let channel: any = null;
    let merchantId: string | null = null;
    let channelKey: string | null = null;

    for (const mid in mockChannels) {
      const channelsObj = (mockChannels as any)[mid];
      for (const key in channelsObj) {
        const ch = channelsObj[key];
        if (ch && (ch as any)._id === channelIdStr) {
          channel = ch;
          merchantId = mid;
          channelKey = key;
          break;
        }
      }
      if (channel) break;
    }

    if (!channel) {
      return createResponse({ status: "not_found" }, 404);
    }

    // محاكاة تغيير الحالة من "pending" إلى "connected" بعد فترة
    const status = (channel as any).status || "disconnected";
    
    // إذا كانت الحالة "pending" وكانت قناة WhatsApp QR، قم بتغييرها إلى "connected" بعد محاولة واحدة
    if (status === "pending" && channelKey === "whatsappQr") {
      // في الواقع، يمكنك إضافة منطق أكثر تعقيداً هنا
      // مثلاً: تغيير الحالة بعد عدد معين من الطلبات
      const shouldConnect = Math.random() > 0.7; // 30% فرصة للاتصال في كل طلب
      
      if (shouldConnect && merchantId && channelKey) {
        (mockChannels as any)[merchantId][channelKey] = {
          ...channel,
          status: "connected",
          enabled: true,
          updatedAt: new Date().toISOString(),
        };
        
        return createResponse({
          status: "connected",
          details: {
            connected: true,
            phone: (channel as any).phone || "+967123456789",
          },
        });
      }
    }

    return createResponse({
      status: status,
      details: {
        connected: status === "connected",
        phone: (channel as any).phone,
      },
    });
  }),

  // ===== KNOWLEDGE BASE =====
  http.get("*/api/knowledge/documents", async () => {
    await delay(300);
    return createResponse(mockKnowledge.documents);
  }),

  // FAQs
  http.get("*/api/merchants/:merchantId/faqs", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/faqs", merchantId);

    // دمج الأسئلة الشائعة من JSON والأسئلة الديناميكية
    const faqsMap = new Map<string, any>();
    
    // إضافة الأسئلة من JSON أولاً
    (mockKnowledge.faqs || []).forEach((faq: any) => {
      faqsMap.set(faq._id, faq);
    });
    
    // إضافة/تحديث الأسئلة من التخزين الديناميكي (الأحدث يفوز)
    dynamicFaqs.forEach((faq, id) => {
      faqsMap.set(id, {
        _id: faq._id,
        question: faq.question,
        answer: faq.answer,
        status: faq.status,
        errorMessage: faq.errorMessage,
        createdAt: faq.createdAt,
      });
    });

    const allFaqs = Array.from(faqsMap.values());
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    allFaqs.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log("[DEMO SERVER] Returning FAQs:", allFaqs.length);
    return createResponse(allFaqs);
  }),

  http.get("*/api/merchants/:merchantId/faqs/status", async ({ params }) => {
    await delay(200);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/faqs/status", merchantId);

    // حساب الحالات من البيانات الفعلية (JSON + الديناميكية)
    const faqsMap = new Map<string, any>();
    (mockKnowledge.faqs || []).forEach((faq: any) => {
      faqsMap.set(faq._id, faq);
    });
    dynamicFaqs.forEach((faq, id) => {
      faqsMap.set(id, faq);
    });

    const allFaqs = Array.from(faqsMap.values());
    const total = allFaqs.length;
    
    let completed = 0;
    let failed = 0;
    let deleted = 0;
    let pending = 0;

    allFaqs.forEach((f: any) => {
      const status = f.status || "completed";
      if (status === "completed") completed++;
      else if (status === "failed") failed++;
      else if (status === "deleted") deleted++;
      else if (status === "pending") pending++;
      else completed++; // افتراضي: مكتمل
    });

    console.log("[DEMO SERVER] FAQs status:", { total, completed, failed, deleted, pending });

    return createResponse({
      total: total || 0,
      completed: completed || 0,
      failed: failed || 0,
      deleted: deleted || 0,
      pending: pending || 0,
    });
  }),

  http.post("*/api/merchants/:merchantId/faqs", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as Array<{ question: string; answer: string }>;

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/faqs", merchantId, body.length);

    const timestamp = Date.now();
    const newFaqs = body.map((faq, index) => {
      const faqId = `faq-${timestamp}-${index}`;
      const newFaq = {
        _id: faqId,
        question: faq.question,
        answer: faq.answer,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      
      // إضافة السؤال إلى التخزين الديناميكي
      dynamicFaqs.set(faqId, newFaq);
      saveDynamicData();
      
      // محاكاة تغيير الحالة بعد 3-5 ثواني
      setTimeout(() => {
        const currentFaq = dynamicFaqs.get(faqId);
        if (currentFaq && currentFaq.status === "pending") {
          // 85% نجاح، 15% فشل
          const shouldFail = Math.random() < 0.15;
          const updatedFaq = {
            ...currentFaq,
            status: shouldFail ? ("failed" as const) : ("completed" as const),
            errorMessage: shouldFail ? "فشل في معالجة السؤال" : undefined,
          };
          dynamicFaqs.set(faqId, updatedFaq);
          saveDynamicData();
          
          console.log("[DEMO SERVER] FAQ processed:", faqId, updatedFaq.status);
          
          // إرسال حدث لتحديث الواجهة
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("demo-faq-updated", {
                detail: { faqId, faq: updatedFaq },
              })
            );
          }
        }
      }, 3000 + Math.random() * 2000);
      
      return newFaq;
    });

    console.log("[DEMO SERVER] Added FAQs:", newFaqs.length, "Status: pending");
    return createResponse(newFaqs);
  }),

  http.delete("*/api/merchants/:merchantId/faqs/:faqId", async ({ params }) => {
    await delay(300);
    const { faqId } = params;

    console.log("[DEMO SERVER] DELETE /api/merchants/:merchantId/faqs/:faqId", faqId);

    // إزالة السؤال من التخزين الديناميكي
    dynamicFaqs.delete(faqId as string);
    saveDynamicData();

    return createResponse({ message: "تم حذف السؤال الشائع بنجاح" });
  }),

  // Knowledge Links (URLs)
  http.get("*/api/knowledge/links", async () => {
    await delay(300);
    return createResponse(mockKnowledge.links);
  }),

  http.get("*/api/merchants/:merchantId/knowledge/urls", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/knowledge/urls", merchantId);
    console.log("[DEMO SERVER] Static links count:", (mockKnowledge.links || []).length);
    console.log("[DEMO SERVER] Dynamic links count:", dynamicLinks.size);

    // دمج الروابط من JSON والروابط الديناميكية
    const linksMap = new Map<string, any>();
    
    // إضافة الروابط من JSON أولاً
    (mockKnowledge.links || []).forEach((link: any) => {
      linksMap.set(link._id, link);
    });
    
    // إضافة/تحديث الروابط من التخزين الديناميكي (الأحدث يفوز)
    dynamicLinks.forEach((link, id) => {
      linksMap.set(id, {
        _id: link._id,
        url: link.url,
        status: link.status,
        textLength: link.textLength,
        errorMessage: link.errorMessage,
        createdAt: link.createdAt,
      });
    });

    const allLinks = Array.from(linksMap.values());
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    allLinks.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log("[DEMO SERVER] Returning links:", allLinks.length);
    console.log("[DEMO SERVER] Links statuses:", allLinks.map((l: any) => ({ id: l._id, url: l.url, status: l.status })));
    return createResponse(allLinks);
  }),

  http.get("*/api/merchants/:merchantId/knowledge/urls/status", async ({ params }) => {
    await delay(200);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/knowledge/urls/status", merchantId);

    // حساب الحالات من البيانات الفعلية (JSON + الديناميكية)
    const linksMap = new Map<string, any>();
    (mockKnowledge.links || []).forEach((link: any) => {
      linksMap.set(link._id, link);
    });
    dynamicLinks.forEach((link, id) => {
      linksMap.set(id, link);
    });

    const allLinks = Array.from(linksMap.values());
    const total = allLinks.length;
    
    let completed = 0;
    let failed = 0;
    let pending = 0;

    allLinks.forEach((l: any) => {
      const status = l.status || "";
      if (status === "processed" || status === "completed") completed++;
      else if (status === "failed") failed++;
      else if (status === "processing" || status === "pending") pending++;
    });

    console.log("[DEMO SERVER] Links status:", { total, completed, failed, pending });

    return createResponse({
      total: total || 0,
      completed: completed || 0,
      failed: failed || 0,
      pending: pending || 0,
    });
  }),

  http.post("*/api/merchants/:merchantId/knowledge/urls", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as { urls: string[] };

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/knowledge/urls", merchantId);
    console.log("[DEMO SERVER] Request body:", body);
    console.log("[DEMO SERVER] URLs count:", body.urls?.length || 0);
    
    if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
      console.error("[DEMO SERVER] Invalid request body - no urls array");
      return createResponse({ message: "يجب إرسال مصفوفة من الروابط" }, 400);
    }

    const timestamp = Date.now();
    const newLinks = body.urls.map((url, index) => {
      const linkId = `link-${timestamp}-${index}`;
      const link = {
        _id: linkId,
        url,
        status: "pending" as const,
        textLength: 0,
        createdAt: new Date().toISOString(),
      };
      
      // إضافة الرابط إلى التخزين الديناميكي
      dynamicLinks.set(linkId, link);
      saveDynamicData();
      
      // محاكاة تغيير الحالة بعد 3-5 ثواني
      setTimeout(() => {
        const currentLink = dynamicLinks.get(linkId);
        if (currentLink && currentLink.status === "pending") {
          // 80% نجاح، 20% فشل
          const shouldFail = Math.random() < 0.2;
          const updatedLink = {
            ...currentLink,
            status: shouldFail ? ("failed" as const) : ("processing" as const),
            errorMessage: shouldFail ? "تعذر الوصول إلى الصفحة" : undefined,
          };
          dynamicLinks.set(linkId, updatedLink);
          saveDynamicData();
          
          // إذا نجح، غيّر إلى "processed" بعد 2-3 ثواني أخرى
          if (!shouldFail) {
            setTimeout(() => {
              const processingLink = dynamicLinks.get(linkId);
              if (processingLink && processingLink.status === "processing") {
                const finalLink = {
                  ...processingLink,
                  status: "processed" as const,
                  textLength: Math.floor(Math.random() * 2000) + 500, // نص عشوائي بين 500-2500 حرف
                };
                dynamicLinks.set(linkId, finalLink);
                saveDynamicData();
                console.log("[DEMO SERVER] Link processed:", linkId, finalLink.status);
                
                // إرسال حدث لتحديث الواجهة
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("demo-link-updated", {
                      detail: { linkId, link: finalLink },
                    })
                  );
                }
              }
            }, 2000 + Math.random() * 1000);
          } else {
            console.log("[DEMO SERVER] Link failed:", linkId);
            // إرسال حدث لتحديث الواجهة
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("demo-link-updated", {
                  detail: { linkId, link: updatedLink },
                })
              );
            }
          }
        }
      }, 3000 + Math.random() * 2000);
      
      return link;
    });

    console.log("[DEMO SERVER] Added links:", newLinks.length, "Status: pending");
    return createResponse(newLinks);
  }),

  http.delete("*/api/merchants/:merchantId/knowledge/urls/:linkId", async ({ params }) => {
    await delay(300);
    const { linkId } = params;

    console.log("[DEMO SERVER] DELETE /api/merchants/:merchantId/knowledge/urls/:linkId", linkId);

    // إزالة الرابط من التخزين الديناميكي
    dynamicLinks.delete(linkId as string);
    saveDynamicData();

    return createResponse({ message: "تم حذف الرابط بنجاح" });
  }),

  // Documents
  http.get("*/api/merchants/:merchantId/documents", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/documents", merchantId);

    return createResponse(mockKnowledge.documents);
  }),

  http.post("*/api/merchants/:merchantId/documents", async ({ params, request }) => {
    await delay(500);
    const { merchantId } = params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/documents", merchantId, file?.name);

    const newDocument = {
      _id: `doc-${Date.now()}`,
      name: file?.name || "document.pdf",
      url: "https://via.placeholder.com/200x200?text=Document",
      size: file?.size || 0,
      type: file?.type || "application/pdf",
      uploadedAt: new Date().toISOString(),
      status: "processing",
    };

    return createResponse(newDocument);
  }),

  http.delete("*/api/merchants/:merchantId/documents/:docId", async ({ params }) => {
    await delay(300);
    const { docId } = params;

    console.log("[DEMO SERVER] DELETE /api/merchants/:merchantId/documents/:docId", docId);

    return createResponse({ message: "تم حذف الملف بنجاح" });
  }),

  // ===== MERCHANT SETTINGS =====
  http.get("*/api/merchants/:merchantId", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId", merchantId);
    
    const merchant = (mockMerchantSettings as any)[merchantId as string];
    
    if (!merchant) {
      // إرجاع بيانات افتراضية للديمو
      const defaultMerchant = {
        _id: merchantId as string,
        name: "متجر تجريبي",
        logoUrl: "https://via.placeholder.com/200x200?text=Logo",
        phone: "+967-1-234-5678",
        publicSlug: "demo-store",
        publicSlugEnabled: true,
        businessDescription: "متجر تجريبي للعرض",
        addresses: [
          {
            street: "شارع تجريبي",
            city: "صنعاء",
            state: "أمانة العاصمة",
            postalCode: "12345",
            country: "اليمن",
          },
        ],
        workingHours: [
          { day: "Sunday", openTime: "09:00", closeTime: "22:00" },
          { day: "Monday", openTime: "09:00", closeTime: "22:00" },
          { day: "Tuesday", openTime: "09:00", closeTime: "22:00" },
          { day: "Wednesday", openTime: "09:00", closeTime: "22:00" },
          { day: "Thursday", openTime: "09:00", closeTime: "22:00" },
          { day: "Friday", openTime: "14:00", closeTime: "22:00" },
          { day: "Saturday", openTime: "09:00", closeTime: "22:00" },
        ],
        returnPolicy: "",
        exchangePolicy: "",
        shippingPolicy: "",
        categories: [],
        customCategory: null,
        socialLinks: {},
      };
      
      console.log("[DEMO SERVER] Merchant not found, returning default merchant");
      return createResponse(defaultMerchant);
    }
    
    console.log("[DEMO SERVER] Returning merchant:", merchant.name);
    return createResponse(merchant);
  }),

  http.put("*/api/merchants/:merchantId", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as any;
    
    console.log("[DEMO SERVER] PUT /api/merchants/:merchantId", merchantId, body);
    
    // تحديث البيانات في التخزين (في الواقع، هذا في الذاكرة فقط)
    const merchant = (mockMerchantSettings as any)[merchantId as string] || {};
    const updatedMerchant = {
      ...merchant,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    // تحديث في mockMerchantSettings (لكن هذا لن يحدث في الواقع لأن JSON ثابت)
    // في الواقع، نعيد البيانات المحدثة فقط
    console.log("[DEMO SERVER] Updated merchant:", updatedMerchant.name);
    return createResponse(updatedMerchant);
  }),

  http.post("*/api/merchants/:merchantId/logo", async ({ params }) => {
    await delay(600);
    const { merchantId } = params;

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/logo", merchantId);

    return createResponse({
      url: "https://via.placeholder.com/200x200?text=Logo",
    });
  }),

  http.get("*/api/merchants/check-public-slug", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    console.log("[DEMO SERVER] GET /api/merchants/check-public-slug", slug);

    // محاكاة التحقق من توفر slug
    const takenSlugs = ["fatima-electronics", "alsaeed-clothing"];
    const available = !takenSlugs.includes(slug || "");

    return createResponse({ available });
  }),

  http.patch("*/api/storefronts/by-merchant/:merchantId", async ({ params, request }) => {
    await delay(300);
    const { merchantId } = params;
    const body = (await request.json()) as { slug: string };

    console.log("[DEMO SERVER] PATCH /api/storefronts/by-merchant/:merchantId", merchantId, body);

    return createResponse({ slug: body.slug });
  }),

  // ===== ONBOARDING =====
  http.patch("*/api/merchants/:merchantId/onboarding/basic", async ({ params, request }) => {
    await delay(500);
    const { merchantId } = params;
    const body = (await request.json()) as {
      name: string;
      phone?: string;
      businessType?: string;
      businessDescription?: string;
      categories?: string[];
      customCategory?: string;
      logoUrl?: string;
      addresses?: unknown[];
    };

    console.log("[DEMO SERVER] PATCH /api/merchants/:merchantId/onboarding/basic", merchantId, body);

    // محاكاة حفظ البيانات الأساسية
    // في الواقع، سيتم حفظها في mockMerchantSettings
    const merchantSettings = (mockMerchantSettings as any)[merchantId as string] || {};
    
    // تحديث البيانات
    const updatedSettings = {
      ...merchantSettings,
      name: body.name,
      phone: body.phone || merchantSettings.phone,
      businessType: body.businessType,
      businessDescription: body.businessDescription,
      categories: body.categories || [],
      customCategory: body.customCategory,
      logoUrl: body.logoUrl || merchantSettings.logoUrl,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    // حفظ في الذاكرة (في الواقع، سيتم حفظه في localStorage إذا لزم الأمر)
    (mockMerchantSettings as any)[merchantId as string] = updatedSettings;

    return createResponse({
      success: true,
      message: "تم حفظ المعلومات الأساسية بنجاح",
      merchant: updatedSettings,
    });
  }),

  // ===== LEADS =====
  http.get("*/api/merchants/:merchantId/leads", async ({ params }) => {
    await delay(300);
    const { merchantId: _merchantId } = params;
    // mockLeads لا يحتوي على merchantId، نعيد جميع الـ leads للديمو
    const leads = Array.isArray(mockLeads) ? mockLeads : [];
    return createResponse(leads);
  }),

  http.get("*/api/merchants/:merchantId/leads-settings", async ({ params }) => {
    await delay(200);
    const { merchantId } = params;
    const settings = (mockLeadsSettings as any)[merchantId as string] || {
      enabled: false,
      fields: [],
    };
    return createResponse(settings);
  }),

  http.patch("*/api/merchants/:merchantId/leads-settings", async ({ params, request }) => {
    await delay(300);
    const { merchantId: _merchantId } = params;
    const body = (await request.json()) as any;

    return createResponse({
      enabled: body.enabled ?? false,
      fields: body.fields ?? [],
    });
  }),

  // ===== INSTRUCTIONS =====
  http.get("*/api/instructions", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const active = url.searchParams.get("active");

    console.log("[DEMO SERVER] GET /api/instructions", { page, limit, active });

    // دمج التعليمات من JSON والتعليمات الديناميكية
    const instructionsMap = new Map<string, any>();
    
    // إضافة التعليمات من JSON أولاً
    (mockInstructions || []).forEach((inst: any) => {
      instructionsMap.set(inst._id, inst);
    });
    
    // إضافة/تحديث التعليمات من التخزين الديناميكي (الأحدث يفوز)
    dynamicInstructions.forEach((inst, id) => {
      instructionsMap.set(id, {
        _id: inst._id,
        instruction: inst.instruction,
        type: inst.type,
        active: inst.active,
        merchantId: inst.merchantId,
        relatedReplies: inst.relatedReplies,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      });
    });

    let filtered = Array.from(instructionsMap.values());
    
    // فلترة حسب الحالة
    if (active === "true") {
      filtered = filtered.filter((i) => i.active === true);
    } else if (active === "false") {
      filtered = filtered.filter((i) => i.active === false);
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const paginated = paginate(filtered, page, limit);

    console.log("[DEMO SERVER] Returning instructions:", paginated.items.length, "of", paginated.total);
    return createResponse({
      items: paginated.items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
    });
  }),

  http.post("*/api/instructions", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { instruction: string; type?: "auto" | "manual" };

    console.log("[DEMO SERVER] POST /api/instructions", body);

    const instructionId = `inst-${Date.now()}`;
    const newInstruction = {
      _id: instructionId,
      instruction: body.instruction,
      type: body.type || "manual",
      active: true,
      merchantId: "507f1f77bcf86cd799439011",
      relatedReplies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // إضافة التعليمات إلى التخزين الديناميكي
    dynamicInstructions.set(instructionId, newInstruction);
    saveDynamicData();

    console.log("[DEMO SERVER] Added instruction:", instructionId);
    return createResponse(newInstruction, 201);
  }),

  http.patch("*/api/instructions/:id", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const body = (await request.json()) as Partial<{ instruction: string; type: "auto" | "manual"; active: boolean }>;

    console.log("[DEMO SERVER] PATCH /api/instructions/:id", id, body);

    // البحث في التخزين الديناميكي أولاً
    let instruction = dynamicInstructions.get(id as string);
    
    // إذا لم يوجد، البحث في JSON
    if (!instruction) {
      const jsonInst = findById(mockInstructions, id as string);
      if (jsonInst) {
        // نسخ التعليمات من JSON إلى التخزين الديناميكي
        instruction = {
          _id: jsonInst._id,
          instruction: jsonInst.instruction,
          type: (jsonInst.type === "auto" || jsonInst.type === "manual") ? jsonInst.type : "manual",
          active: jsonInst.active !== undefined ? jsonInst.active : true,
          merchantId: jsonInst.merchantId,
          relatedReplies: jsonInst.relatedReplies || [],
          createdAt: jsonInst.createdAt,
          updatedAt: jsonInst.updatedAt,
        };
        dynamicInstructions.set(id as string, instruction);
      }
    }

    if (!instruction) {
      console.error("[DEMO SERVER] Instruction not found:", id);
      return createResponse({ message: "التعليمات غير موجودة" }, 404);
    }

    // تحديث التعليمات
    const updatedInstruction = {
      ...instruction,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    dynamicInstructions.set(id as string, updatedInstruction);
    saveDynamicData();

    console.log("[DEMO SERVER] Updated instruction:", id);
    return createResponse(updatedInstruction);
  }),

  http.delete("*/api/instructions/:id", async ({ params }) => {
    await delay(300);
    const { id } = params;

    console.log("[DEMO SERVER] DELETE /api/instructions/:id", id);

    // البحث في التخزين الديناميكي أولاً
    const instruction = dynamicInstructions.get(id as string) || findById(mockInstructions, id as string);
    
    if (!instruction) {
      console.error("[DEMO SERVER] Instruction not found:", id);
      return createResponse({ message: "التعليمات غير موجودة" }, 404);
    }

    // إزالة التعليمات من التخزين الديناميكي
    dynamicInstructions.delete(id as string);
    saveDynamicData();

    console.log("[DEMO SERVER] Deleted instruction:", id);
    return createResponse({ message: "تم حذف التعليمات بنجاح" });
  }),

  http.patch("*/api/instructions/:id/activate", async ({ params }) => {
    await delay(200);
    const { id } = params;

    console.log("[DEMO SERVER] PATCH /api/instructions/:id/activate", id);

    // البحث في التخزين الديناميكي أولاً
    let instruction = dynamicInstructions.get(id as string);
    
    // إذا لم يوجد، البحث في JSON
    if (!instruction) {
      const jsonInst = findById(mockInstructions, id as string);
      if (jsonInst) {
        instruction = {
          _id: jsonInst._id,
          instruction: jsonInst.instruction,
          type: (jsonInst.type === "auto" || jsonInst.type === "manual") ? jsonInst.type : "manual",
          active: jsonInst.active !== undefined ? jsonInst.active : true,
          merchantId: jsonInst.merchantId,
          relatedReplies: jsonInst.relatedReplies || [],
          createdAt: jsonInst.createdAt,
          updatedAt: jsonInst.updatedAt,
        };
        dynamicInstructions.set(id as string, instruction);
      }
    }

    if (!instruction) {
      console.error("[DEMO SERVER] Instruction not found:", id);
      return createResponse({ message: "التعليمات غير موجودة" }, 404);
    }

    const updatedInstruction = {
      ...instruction,
      active: true,
      updatedAt: new Date().toISOString(),
    };

    dynamicInstructions.set(id as string, updatedInstruction);
    saveDynamicData();

    console.log("[DEMO SERVER] Activated instruction:", id);
    return createResponse(updatedInstruction);
  }),

  http.patch("*/api/instructions/:id/deactivate", async ({ params }) => {
    await delay(200);
    const { id } = params;

    console.log("[DEMO SERVER] PATCH /api/instructions/:id/deactivate", id);

    // البحث في التخزين الديناميكي أولاً
    let instruction = dynamicInstructions.get(id as string);
    
    // إذا لم يوجد، البحث في JSON
    if (!instruction) {
      const jsonInst = findById(mockInstructions, id as string);
      if (jsonInst) {
        instruction = {
          _id: jsonInst._id,
          instruction: jsonInst.instruction,
          type: (jsonInst.type === "auto" || jsonInst.type === "manual") ? jsonInst.type : "manual",
          active: jsonInst.active !== undefined ? jsonInst.active : true,
          merchantId: jsonInst.merchantId,
          relatedReplies: jsonInst.relatedReplies || [],
          createdAt: jsonInst.createdAt,
          updatedAt: jsonInst.updatedAt,
        };
        dynamicInstructions.set(id as string, instruction);
      }
    }

    if (!instruction) {
      console.error("[DEMO SERVER] Instruction not found:", id);
      return createResponse({ message: "التعليمات غير موجودة" }, 404);
    }

    const updatedInstruction = {
      ...instruction,
      active: false,
      updatedAt: new Date().toISOString(),
    };

    dynamicInstructions.set(id as string, updatedInstruction);
    saveDynamicData();

    console.log("[DEMO SERVER] Deactivated instruction:", id);
    return createResponse(updatedInstruction);
  }),

  http.get("*/api/instructions/suggestions", async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const suggestions = [
      {
        badReply: "لا أعرف",
        count: 15,
        instruction: "عندما لا تعرف الإجابة، اطلب من العميل التواصل مع خدمة العملاء",
      },
      {
        badReply: "غير متوفر",
        count: 8,
        instruction: "عندما يكون المنتج غير متوفر، اذكر البدائل المتاحة",
      },
    ].slice(0, limit);

    return createResponse({ items: suggestions });
  }),

  http.post("*/api/instructions/auto/generate", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { badReplies: string[] };

    const results = body.badReplies.map((badReply) => ({
      badReply,
      instruction: `تعليمات مخصصة لـ: ${badReply}`,
    }));

    return createResponse({ results });
  }),

  // ===== MISSING RESPONSES =====
  http.get("*/api/analytics/missing-responses", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const resolved = url.searchParams.get("resolved");
    const channel = url.searchParams.get("channel");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const merchantId = url.searchParams.get("merchantId");

    console.log("[DEMO SERVER] GET /api/analytics/missing-responses", { page, limit, resolved, channel, type, search, merchantId });

    // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
    const effectiveMerchantId = merchantId || "507f1f77bcf86cd799439011";

    // دمج الردود المفقودة من JSON والردود الديناميكية
    const missingMap = new Map<string, any>();
    
    // إضافة الردود من JSON أولاً
    (mockMissingResponses || []).forEach((mr: any) => {
      missingMap.set(mr._id, mr);
    });
    
    // إضافة/تحديث الردود من التخزين الديناميكي (الأحدث يفوز)
    dynamicMissingResponses.forEach((mr, id) => {
      missingMap.set(id, {
        _id: mr._id,
        merchant: mr.merchant,
        channel: mr.channel,
        question: mr.question,
        botReply: mr.botReply,
        sessionId: mr.sessionId,
        aiAnalysis: mr.aiAnalysis,
        customerId: mr.customerId,
        type: mr.type,
        resolved: mr.resolved,
        resolvedAt: mr.resolvedAt,
        resolvedBy: mr.resolvedBy,
        createdAt: mr.createdAt,
      });
    });

    let filtered = Array.from(missingMap.values());
    
    // فلترة حسب merchantId (مهم!)
    filtered = filtered.filter((m) => m.merchant === effectiveMerchantId);
    
    // فلترة حسب الحالة
    if (resolved === "true") {
      filtered = filtered.filter((m) => m.resolved === true);
    } else if (resolved === "false") {
      filtered = filtered.filter((m) => m.resolved === false);
    }
    if (channel && channel !== "all") {
      filtered = filtered.filter((m) => m.channel === channel);
    }
    if (type && type !== "all") {
      filtered = filtered.filter((m) => m.type === type);
    }
    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.question.toLowerCase().includes(search.toLowerCase()) ||
          m.botReply.toLowerCase().includes(search.toLowerCase())
      );
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const paginated = paginate(filtered, page, limit);

    console.log("[DEMO SERVER] Returning missing responses:", paginated.items.length, "of", paginated.total, "for merchantId:", effectiveMerchantId);
    return createResponse({
      items: paginated.items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
    });
  }),

  http.patch("*/api/analytics/missing-responses/:id/resolve", async ({ params }) => {
    await delay(300);
    const { id } = params;

    console.log("[DEMO SERVER] PATCH /api/analytics/missing-responses/:id/resolve", id);

    // البحث في التخزين الديناميكي أولاً
    let missing = dynamicMissingResponses.get(id as string);
    
    // إذا لم يوجد، البحث في JSON
    if (!missing) {
      const jsonMissing = findById(mockMissingResponses, id as string);
      if (jsonMissing) {
        missing = {
          _id: jsonMissing._id,
          merchant: jsonMissing.merchant,
          channel: (jsonMissing.channel === "telegram" || jsonMissing.channel === "whatsapp" || jsonMissing.channel === "webchat") 
            ? jsonMissing.channel 
            : "webchat",
          question: jsonMissing.question,
          botReply: jsonMissing.botReply,
          sessionId: jsonMissing.sessionId,
          aiAnalysis: jsonMissing.aiAnalysis,
          customerId: jsonMissing.customerId,
          type: (jsonMissing.type === "missing_response" || jsonMissing.type === "unavailable_product")
            ? jsonMissing.type
            : "missing_response",
          resolved: jsonMissing.resolved !== undefined ? jsonMissing.resolved : false,
          resolvedAt: jsonMissing.resolvedAt,
          resolvedBy: jsonMissing.resolvedBy,
          createdAt: jsonMissing.createdAt,
        };
        if (missing) {
          dynamicMissingResponses.set(id as string, missing);
        }
      }
    }

    if (!missing) {
      console.error("[DEMO SERVER] Missing response not found:", id);
      return createResponse({ message: "الرد المفقود غير موجود" }, 404);
    }

    // تحديث الحالة إلى محلول
    const updatedMissing = {
      ...missing,
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: "user-merchant-001",
    };

    dynamicMissingResponses.set(id as string, updatedMissing);
    saveDynamicData();

    console.log("[DEMO SERVER] Resolved missing response:", id);
    return createResponse(updatedMissing);
  }),

  http.post("*/api/analytics/missing-responses/:id/add-to-knowledge", async ({ params, request }) => {
    await delay(400);
    const { id } = params;
    const body = (await request.json()) as { question: string; answer: string };

    console.log("[DEMO SERVER] POST /api/analytics/missing-responses/:id/add-to-knowledge", id, body);

    // البحث في التخزين الديناميكي أولاً
    let missing = dynamicMissingResponses.get(id as string);
    
    // إذا لم يوجد، البحث في JSON
    if (!missing) {
      const jsonMissing = findById(mockMissingResponses, id as string);
      if (jsonMissing) {
        missing = {
          _id: jsonMissing._id,
          merchant: jsonMissing.merchant,
          channel: (jsonMissing.channel === "telegram" || jsonMissing.channel === "whatsapp" || jsonMissing.channel === "webchat") 
            ? jsonMissing.channel 
            : "webchat",
          question: jsonMissing.question,
          botReply: jsonMissing.botReply,
          sessionId: jsonMissing.sessionId,
          aiAnalysis: jsonMissing.aiAnalysis,
          customerId: jsonMissing.customerId,
          type: (jsonMissing.type === "missing_response" || jsonMissing.type === "unavailable_product")
            ? jsonMissing.type
            : "missing_response",
          resolved: jsonMissing.resolved !== undefined ? jsonMissing.resolved : false,
          resolvedAt: jsonMissing.resolvedAt,
          resolvedBy: jsonMissing.resolvedBy,
          createdAt: jsonMissing.createdAt,
        };
        if (missing) {
          dynamicMissingResponses.set(id as string, missing);
        }
      }
    }

    if (!missing) {
      console.error("[DEMO SERVER] Missing response not found:", id);
      return createResponse({ message: "الرد المفقود غير موجود" }, 404);
    }

    // إضافة FAQ جديد إلى المعرفة
    const faqId = `faq-${Date.now()}`;
    const newFaq = {
      _id: faqId,
      question: body.question,
      answer: body.answer,
      status: "completed" as const,
      createdAt: new Date().toISOString(),
    };
    
    dynamicFaqs.set(faqId, newFaq);

    // تحديث حالة الرد المفقود إلى محلول
    const updatedMissing = {
      ...missing,
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: "user-merchant-001",
    };

    dynamicMissingResponses.set(id as string, updatedMissing);
    saveDynamicData();

    console.log("[DEMO SERVER] Added to knowledge and resolved:", id, "FAQ:", faqId);
    return createResponse({
      success: true,
      faqId,
      missingResponseId: id as string,
      resolved: true,
    });
  }),

  http.patch("*/api/analytics/missing-responses/resolve", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as { ids: string[] };

    console.log("[DEMO SERVER] PATCH /api/analytics/missing-responses/resolve", body.ids.length, "items");

    let resolvedCount = 0;

    body.ids.forEach((id) => {
      // البحث في التخزين الديناميكي أولاً
      let missing = dynamicMissingResponses.get(id);
      
      // إذا لم يوجد، البحث في JSON
      if (!missing) {
        const jsonMissing = findById(mockMissingResponses, id);
        if (jsonMissing) {
          const channelValue = (jsonMissing.channel === "telegram" || jsonMissing.channel === "whatsapp" || jsonMissing.channel === "webchat") 
            ? jsonMissing.channel 
            : "webchat";
          const typeValue = (jsonMissing.type === "missing_response" || jsonMissing.type === "unavailable_product")
            ? jsonMissing.type
            : "missing_response";
          
          const newMissing = {
            _id: jsonMissing._id,
            merchant: jsonMissing.merchant,
            channel: channelValue as "telegram" | "whatsapp" | "webchat",
            question: jsonMissing.question,
            botReply: jsonMissing.botReply,
            sessionId: jsonMissing.sessionId,
            aiAnalysis: jsonMissing.aiAnalysis,
            customerId: jsonMissing.customerId,
            type: typeValue as "missing_response" | "unavailable_product",
            resolved: jsonMissing.resolved !== undefined ? jsonMissing.resolved : false,
            resolvedAt: jsonMissing.resolvedAt,
            resolvedBy: jsonMissing.resolvedBy,
            createdAt: jsonMissing.createdAt,
          };
          dynamicMissingResponses.set(id, newMissing);
          missing = newMissing;
        }
      }

      if (missing && !missing.resolved) {
        const updatedMissing = {
          ...missing,
          resolved: true,
          resolvedAt: new Date().toISOString(),
          resolvedBy: "user-merchant-001",
        };
        dynamicMissingResponses.set(id, updatedMissing);
        resolvedCount++;
      }
    });

    saveDynamicData();
    console.log("[DEMO SERVER] Bulk resolved:", resolvedCount, "of", body.ids.length);
    return createResponse({
      resolved: resolvedCount,
      message: `تم حل ${resolvedCount} رد مفقود`,
    });
  }),

  // ===== PROMPT STUDIO =====
  http.get("*/api/merchants/:merchantId/prompt/quick-config", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/prompt/quick-config", merchantId);
    
    const merchantData = (mockPromptStudio as any)[merchantId as string];
    const config = merchantData?.quickConfig || {
      dialect: "خليجي",
      tone: "ودّي",
      customInstructions: [],
      includeClosingPhrase: true,
      closingText: "هل أقدر أساعدك بشي ثاني؟ 😊",
      customerServicePhone: "",
      customerServiceWhatsapp: "",
    };

    console.log("[DEMO SERVER] Returning quick-config:", config);
    return createResponse(config);
  }),

  http.patch("*/api/merchants/:merchantId/prompt/quick-config", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] PATCH /api/merchants/:merchantId/prompt/quick-config", merchantId, body);

    return createResponse({
      ...body,
    });
  }),

  http.get("*/api/merchants/:merchantId/prompt/advanced-template", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    
    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/prompt/advanced-template", merchantId);
    
    const merchantData = (mockPromptStudio as any)[merchantId as string];
    const template = merchantData?.advancedTemplate || "";

    console.log("[DEMO SERVER] Returning advanced-template:", template ? "exists" : "empty");
    return createResponse({ template });
  }),

  http.post("*/api/merchants/:merchantId/prompt/advanced-template", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as { template: string; note?: string };

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/prompt/advanced-template", merchantId);

    return createResponse({
      template: body.template,
      note: body.note,
      message: "تم حفظ القالب المتقدم بنجاح",
    });
  }),

  http.post("*/api/merchants/:merchantId/prompt/preview", async ({ params, request }) => {
    await delay(500);
    const { merchantId } = params;
    const body = (await request.json()) as any;

    console.log("[DEMO SERVER] POST /api/merchants/:merchantId/prompt/preview", merchantId, {
      useAdvanced: body.useAdvanced,
      quickConfig: body.quickConfig ? "exists" : "missing",
    });

    // الحصول على بيانات المتجر من mockMerchantSettings
    const merchantSettings = (mockMerchantSettings as any)[merchantId as string];
    const storeName = merchantSettings?.name || "المتجر";

    // محاكاة أفضل للـ preview بناءً على البيانات
    let previewText = "";
    const customerServicePhone = body.quickConfig?.customerServicePhone || "";
    const customerServiceWhatsapp = body.quickConfig?.customerServiceWhatsapp || "";
    
    if (body.useAdvanced && body.quickConfig) {
      // استخدام القالب المتقدم مع البيانات
      const merchantData = (mockPromptStudio as any)[merchantId as string];
      const template = merchantData?.advancedTemplate || "";
      if (template) {
        previewText = template
          .replace(/{storeName}/g, storeName)
          .replace(/{dialect}/g, body.quickConfig.dialect || "خليجي")
          .replace(/{tone}/g, body.quickConfig.tone || "ودّي")
          .replace(/{customInstructions}/g, body.quickConfig.customInstructions?.join("\n") || "")
          .replace(/{customerServicePhone}/g, customerServicePhone)
          .replace(/{customerServiceWhatsapp}/g, customerServiceWhatsapp);
        
        // إضافة نص خدمة العملاء إذا كان موجوداً ولم يكن موجوداً في القالب
        if ((customerServicePhone || customerServiceWhatsapp) && !template.includes("{customerServicePhone}") && !template.includes("{customerServiceWhatsapp}")) {
          let customerServiceSection = "\n\nإذا لم تستطع الإجابة على سؤال العميل، يمكنك توجيهه للتواصل مع خدمة العملاء:\n";
          if (customerServicePhone) {
            customerServiceSection += `- الهاتف: ${customerServicePhone}\n`;
          }
          if (customerServiceWhatsapp) {
            const whatsappLink = customerServiceWhatsapp.startsWith("http") 
              ? customerServiceWhatsapp 
              : `https://wa.me/${customerServiceWhatsapp.replace(/[^0-9]/g, "")}`;
            customerServiceSection += `- واتساب: ${whatsappLink}\n`;
          }
          previewText += customerServiceSection;
        }
        
        previewText = previewText.replace(/{closingPhrase}/g, body.quickConfig.includeClosingPhrase ? (body.quickConfig.closingText || "") : "");
      } else {
        previewText = "هذا معاينة للقالب المتقدم. يمكنك تخصيصه حسب احتياجاتك.";
      }
    } else if (body.quickConfig) {
      // بناء preview من quick config
      const dialect = body.quickConfig.dialect || "خليجي";
      const tone = body.quickConfig.tone || "ودّي";
      const instructions = body.quickConfig.customInstructions?.join("\n") || "";
      const closing = body.quickConfig.includeClosingPhrase ? (body.quickConfig.closingText || "") : "";
      const customerServicePhone = body.quickConfig.customerServicePhone || "";
      const customerServiceWhatsapp = body.quickConfig.customerServiceWhatsapp || "";
      
      // بناء نص خدمة العملاء
      let customerServiceText = "";
      if (customerServicePhone || customerServiceWhatsapp) {
        customerServiceText = "\n\nإذا لم تستطع الإجابة على سؤال العميل، يمكنك توجيهه للتواصل مع خدمة العملاء:\n";
        if (customerServicePhone) {
          customerServiceText += `- الهاتف: ${customerServicePhone}\n`;
        }
        if (customerServiceWhatsapp) {
          const whatsappLink = customerServiceWhatsapp.startsWith("http") 
            ? customerServiceWhatsapp 
            : `https://wa.me/${customerServiceWhatsapp.replace(/[^0-9]/g, "")}`;
          customerServiceText += `- واتساب: ${whatsappLink}\n`;
        }
      }
      
      previewText = `أنت مساعد ذكي لـ ${storeName}. استخدم اللهجة ${dialect} والنغمة ${tone}.\n\n${instructions}${customerServiceText}\n\n${closing}`;
    } else {
      previewText = "مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟";
    }

    console.log("[DEMO SERVER] Returning preview:", previewText.substring(0, 100) + "...");
    return createResponse(previewText);
  }),

  http.get("*/api/merchants/:merchantId/prompt/final-prompt", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;

    console.log("[DEMO SERVER] GET /api/merchants/:merchantId/prompt/final-prompt", merchantId);

    // الحصول على بيانات المتجر من mockMerchantSettings
    const merchantSettings = (mockMerchantSettings as any)[merchantId as string];
    const storeName = merchantSettings?.name || "المتجر";

    const merchantData = (mockPromptStudio as any)[merchantId as string];
    const quickConfig = merchantData?.quickConfig || {};
    const advancedTemplate = merchantData?.advancedTemplate || "";

    let finalPrompt = "";
    if (advancedTemplate) {
      finalPrompt = advancedTemplate
        .replace(/{storeName}/g, storeName)
        .replace(/{dialect}/g, quickConfig.dialect || "خليجي")
        .replace(/{tone}/g, quickConfig.tone || "ودّي")
        .replace(/{customInstructions}/g, quickConfig.customInstructions?.join("\n") || "")
        .replace(/{customerServicePhone}/g, quickConfig.customerServicePhone || "")
        .replace(/{customerServiceWhatsapp}/g, quickConfig.customerServiceWhatsapp || "")
        .replace(/{closingPhrase}/g, quickConfig.includeClosingPhrase ? (quickConfig.closingText || "") : "");
    } else {
      finalPrompt = `أنت مساعد ذكي لـ ${storeName}. مهمتك مساعدة العملاء في الإجابة على الأسئلة وتقديم معلومات عن المنتجات.`;
    }

    return createResponse({
      prompt: finalPrompt,
    });
  }),

  // ===== PROMOTIONS =====
  http.get("*/api/promotions", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // في وضع الديمو، استخدم merchantId افتراضي إذا لم يكن موجوداً
    const effectiveMerchantId = merchantId || "507f1f77bcf86cd799439011";

    let filtered = mockPromotions;
    if (effectiveMerchantId) {
      filtered = filterByMerchantId(mockPromotions, effectiveMerchantId);
    }
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    const paginated = paginate(filtered, page, limit);

    return createResponse({
      promotions: paginated.items,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
    });
  }),

  http.get("*/api/promotions/:id", async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");

    const promotion = findById(mockPromotions, id as string);
    if (!promotion) {
      return createResponse({ message: "العرض غير موجود" }, 404);
    }

    if (merchantId && promotion.merchantId !== merchantId) {
      return createResponse({ message: "غير مصرح" }, 403);
    }

    return createResponse(promotion);
  }),

  http.post("*/api/promotions", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as any;

    const newPromotion = {
      _id: `promo-${Date.now()}`,
      merchantId: body.merchantId,
      timesUsed: 0,
      totalDiscountGiven: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body,
    };

    return createResponse(newPromotion, 201);
  }),

  http.patch("*/api/promotions/:id", async ({ params, request }) => {
    await delay(400);
    const { id } = params;
    const body = (await request.json()) as any;

    const promotion = findById(mockPromotions, id as string);
    if (!promotion) {
      return createResponse({ message: "العرض غير موجود" }, 404);
    }

    return createResponse({
      ...promotion,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete("*/api/promotions/:id", async ({ params, request }) => {
    await delay(300);
    const { id } = params;
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");

    const promotion = findById(mockPromotions, id as string);
    if (!promotion) {
      return createResponse({ message: "العرض غير موجود" }, 404);
    }

    if (merchantId && promotion.merchantId !== merchantId) {
      return createResponse({ message: "غير مصرح" }, 403);
    }

    return createResponse({ message: "تم حذف العرض بنجاح" });
  }),

  // ===== SUPPORT =====
  http.post("*/api/support/contact/merchant", async ({ request }) => {
    await delay(500);
    const formData = await request.formData();
    const payloadStr = formData.get("payload") as string;
    JSON.parse(payloadStr); // Parse but don't store

    return createResponse({
      id: `ticket-${Date.now()}`,
      ticketNumber: `TKT-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }),

  // ===== WIDGET CONFIG =====
  http.get("*/api/merchants/:merchantId/widget-settings", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    const config = (mockWidgetConfig as any)[merchantId as string] || {
      botName: "مساعد ذكي",
      brandColor: "#1976d2",
      welcomeMessage: "مرحباً! كيف يمكنني مساعدتك؟",
      embedMode: "bubble",
      isActive: true,
    };

    return createResponse(config);
  }),

  http.put("*/api/merchants/:merchantId/widget-settings", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as any;

    // حفظ التغييرات في mockWidgetConfig
    if (!(mockWidgetConfig as any)[merchantId as string]) {
      (mockWidgetConfig as any)[merchantId as string] = {};
    }
    (mockWidgetConfig as any)[merchantId as string] = {
      ...(mockWidgetConfig as any)[merchantId as string],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    console.log("[DEMO SERVER] PUT /api/merchants/:merchantId/widget-settings", merchantId, body);

    return createResponse({
      ...(mockWidgetConfig as any)[merchantId as string],
    });
  }),

  http.post("*/api/merchants/:merchantId/widget-settings/slug", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;

    const config = (mockWidgetConfig as any)[merchantId as string];
    const slug = config?.widgetSlug || `widget-${merchantId}`;

    return createResponse({ widgetSlug: slug });
  }),

  // ===== ADVANCED SETTINGS =====
  // Get user profile
  http.get("*/api/users/:userId", async ({ params }) => {
    await delay(300);
    const { userId } = params;
    const user = mockUsers.find((u: any) => u.id === userId);
    
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    return createResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      merchantId: user.merchantId || null,
    });
  }),

  // Update user profile
  http.put("*/api/users/:userId", async ({ params, request }) => {
    await delay(400);
    const { userId } = params;
    const body = (await request.json()) as { name?: string; phone?: string };
    const user = mockUsers.find((u: any) => u.id === userId);
    
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    // تحديث البيانات محلياً (في الواقع، يجب حفظها في localStorage أو Map)
    const updatedUser = {
      ...user,
      name: body.name ?? user.name,
      phone: body.phone ?? user.phone,
    };

    return createResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      role: updatedUser.role,
      merchantId: updatedUser.merchantId || null,
    });
  }),

  // Change password
  http.post("*/api/auth/change-password", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    // محاكاة التحقق من كلمة المرور
    if (!body.currentPassword || !body.newPassword || body.newPassword !== body.confirmPassword) {
      return createResponse({ message: "بيانات غير صحيحة" }, 400);
    }

    return createResponse({ status: "ok" });
  }),

  // Get user notifications preferences
  http.get("*/api/users/:userId/notifications", async ({ params }) => {
    await delay(300);
    const { userId } = params;
    const user = mockUsers.find((u: any) => u.id === userId);
    
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    // إرجاع تفضيلات افتراضية
    return createResponse({
      channels: {
        inApp: true,
        email: true,
        telegram: false,
        whatsapp: false,
      },
      topics: {
        syncFailed: true,
        syncCompleted: true,
        webhookFailed: true,
        embeddingsCompleted: true,
        missingResponsesDigest: "daily" as const,
      },
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: "Asia/Aden",
      },
    });
  }),

  // Update user notifications preferences
  http.put("*/api/users/:userId/notifications", async ({ params, request }) => {
    await delay(400);
    const { userId } = params;
    const body = (await request.json()) as any;
    const user = mockUsers.find((u: any) => u.id === userId);
    
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    // إرجاع البيانات المحدثة
    return createResponse(body);
  }),

  // Set product source (requires password confirmation)
  http.patch("*/api/merchants/:merchantId/product-source", async ({ params, request }) => {
    await delay(500);
    const { merchantId } = params;
    const body = (await request.json()) as {
      source: "internal" | "salla" | "zid";
      confirmPassword: string;
    };

    if (!body.confirmPassword) {
      return createResponse({ message: "كلمة المرور مطلوبة" }, 400);
    }

    // تحديث mock-integrations.json محلياً
    const integration = (mockIntegrations as any)[merchantId as string];
    if (integration) {
      (mockIntegrations as any)[merchantId as string] = {
        ...integration,
        productSource: body.source,
      };
    }

    return createResponse({ success: true });
  }),

  // Delete user account
  http.post("*/api/users/:userId/delete", async ({ params, request }) => {
    await delay(600);
    const { userId } = params;
    const body = (await request.json()) as { confirmPassword: string };
    const user = mockUsers.find((u: any) => u.id === userId);
    
    if (!user) {
      return createResponse({ message: "المستخدم غير موجود" }, 404);
    }

    if (!body.confirmPassword) {
      return createResponse({ message: "كلمة المرور مطلوبة" }, 400);
    }

    return createResponse({ message: "تم حذف الحساب بنجاح" });
  }),

  // n8n Workflow ensure
  http.post("*/api/n8n/workflows/me/ensure", async ({ request }) => {
    await delay(800);
    const body = (await request.json()) as {
      forceRecreate?: boolean;
      activate?: boolean;
    };

    // محاكاة إنشاء/تأكيد workflow
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const recreated = body.forceRecreate ?? false;
    const activated = body.activate ?? true;

    return createResponse({
      workflowId,
      recreated,
      activated,
    });
  }),

  // ===== STOREFRONT THEME =====
  http.get("*/api/storefront/merchant/:merchantId", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    const storefront = getStorefrontTheme(merchantId as string);

    if (!storefront) {
      return createResponse({ message: "المتجر غير موجود" }, 404);
    }

    return createResponse(storefront);
  }),

  http.get("*/api/storefront/:slug", async ({ params }) => {
    await delay(300);
    const { slug } = params;

    // معالجة خاصة للديمو
    if (slug === "demo") {
      const demoMerchantId = "507f1f77bcf86cd799439011";
      const demoStorefront = getStorefrontTheme(demoMerchantId);
      // const _demoMerchant = (mockMerchantSettings as any)[demoMerchantId]; // Unused
      const demoProducts = filterByMerchantId(mockProducts, demoMerchantId);
      const demoCategories = filterByMerchantId(mockCategories, demoMerchantId);

      return createResponse({
        merchantId: demoMerchantId,
        merchant: demoMerchantId,
        storefront: demoStorefront,
        products: demoProducts,
        categories: demoCategories,
      });
    }

    // البحث في LocalStorage أولاً، ثم في JSON
    let storefront: any = null;
    try {
      const stored = localStorage.getItem(StorageKeys.STOREFRONT_THEME);
      if (stored) {
        const themes = JSON.parse(stored) as Record<string, any>;
        storefront = Object.values(themes).find((s: any) => s.slug === slug);
      }
    } catch (error) {
      console.warn("[DEMO SERVER] Failed to load storefront from localStorage:", error);
    }

    // Fallback إلى JSON الأصلي
    if (!storefront) {
      storefront = Object.values(mockStorefrontTheme as any).find(
        (s: any) => s.slug === slug
      );
    }

    if (!storefront) {
      return createResponse({ message: "المتجر غير موجود" }, 404);
    }

    // إرجاع storefront مع products و categories
    const merchantId = (storefront as any).merchant;
    const products = filterByMerchantId(mockProducts, merchantId);
    const categories = filterByMerchantId(mockCategories, merchantId);

    return createResponse({
      merchantId,
      merchant: merchantId,
      storefront,
      products,
      categories,
    });
  }),

  http.patch("*/api/storefront/by-merchant/:merchantId", async ({ params, request }) => {
    await delay(400);
    const { merchantId } = params;
    const body = (await request.json()) as any;

    const currentStorefront = getStorefrontTheme(merchantId as string);
    if (!currentStorefront) {
      return createResponse({ message: "المتجر غير موجود" }, 404);
    }

    // تحديث البيانات بشكل دائم
    const updatedStorefront = {
      ...currentStorefront,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    // حفظ التغييرات في LocalStorage
    saveStorefrontTheme(merchantId as string, updatedStorefront);

    console.log("[DEMO SERVER] PATCH /api/storefront/by-merchant/:merchantId", merchantId, "Updated:", updatedStorefront);

    return createResponse(updatedStorefront);
  }),

  http.post("*/api/storefront/by-merchant/:merchantId/banners/upload", async ({ params }) => {
    await delay(600);
    const { merchantId: _merchantId } = params;

    return createResponse({
      urls: [
        "https://via.placeholder.com/1200x400?text=Banner+1",
        "https://via.placeholder.com/1200x400?text=Banner+2",
      ],
      accepted: 2,
      remaining: 3,
      max: 5,
    });
  }),

  http.get("*/api/storefront/slug/check", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    const takenSlugs = ["fatima-electronics", "alsaeed-clothing"];
    const available = !takenSlugs.includes(slug || "");

    return createResponse({ available });
  }),

  http.get("*/api/public/:slug/bundle", async ({ params }) => {
    await delay(300);
    const { slug } = params;

    // معالجة خاصة للديمو
    if (slug === "demo") {
      const demoMerchantId = "507f1f77bcf86cd799439011";
      const demoStorefront = getStorefrontTheme(demoMerchantId);
      const demoProducts = filterByMerchantId(mockProducts, demoMerchantId);
      const demoCategories = filterByMerchantId(mockCategories, demoMerchantId);

      return createResponse({
        storefront: demoStorefront,
        products: demoProducts,
        categories: demoCategories,
        merchantId: demoMerchantId,
        merchant: demoMerchantId,
      });
    }

    // البحث في LocalStorage أولاً، ثم في JSON
    let storefront: any = null;
    try {
      const stored = localStorage.getItem(StorageKeys.STOREFRONT_THEME);
      if (stored) {
        const themes = JSON.parse(stored) as Record<string, any>;
        storefront = Object.values(themes).find((s: any) => s.slug === slug);
      }
    } catch (error) {
      console.warn("[DEMO SERVER] Failed to load storefront from localStorage:", error);
    }

    // Fallback إلى JSON الأصلي
    if (!storefront) {
      storefront = Object.values(mockStorefrontTheme as any).find(
        (s: any) => s.slug === slug
      );
    }

    if (!storefront) {
      return createResponse({ message: "المتجر غير موجود" }, 404);
    }

    const merchantId = (storefront as any).merchant;
    const products = filterByMerchantId(mockProducts, merchantId);
    const categories = filterByMerchantId(mockCategories, merchantId);

    return createResponse({
      storefront,
      products,
      categories,
      merchantId,
      merchant: merchantId,
    });
  }),

  // ===== INTEGRATIONS =====
  http.get("*/api/integrations/status", async ({ request }) => {
    await delay(300);
    
    // استخراج merchantId من token أو headers
    let merchantId = "507f1f77bcf86cd799439011"; // افتراضي
    
    try {
      const authHeader = request.headers.get("Authorization");
      if (authHeader) {
        // في التطبيق الحقيقي، سيتم فك تشفير JWT token
        // هنا نستخدم pattern matching بسيط: demo-token-user-merchant-001-xxx (يتم تحويله إلى ObjectId)
        const tokenMatch = authHeader.match(/demo-token-user-merchant-(\d+)/);
        if (tokenMatch) {
          const num = tokenMatch[1];
          // تحويل رقم التاجر إلى ObjectId
          if (num === "001") merchantId = "507f1f77bcf86cd799439011";
          else if (num === "002") merchantId = "507f1f77bcf86cd799439022";
          else merchantId = `507f1f77bcf86cd7994390${num.padStart(2, "0")}`;
        } else {
          // محاولة استخراج من token مباشرة
          const token = authHeader.replace("Bearer ", "");
          if (token.includes("merchant-001") || token.includes("507f1f77bcf86cd799439011")) {
            merchantId = "507f1f77bcf86cd799439011";
          } else if (token.includes("merchant-002") || token.includes("507f1f77bcf86cd799439022")) {
            merchantId = "507f1f77bcf86cd799439022";
          }
        }
      }
    } catch (error) {
      console.warn("[DEMO SERVER] Failed to extract merchantId from token, using default");
    }
    
    console.log("[DEMO SERVER] GET /api/integrations/status for merchantId:", merchantId);
    
    const status = (mockIntegrations as any)[merchantId] || {
      productSource: "internal",
      skipped: true,
      salla: { active: false, connected: false, lastSync: null },
      zid: { active: false, connected: false, lastSync: null },
    };

    console.log("[DEMO SERVER] Integration status:", status.productSource, "- Store services:", status.productSource === "internal" ? "VISIBLE" : "HIDDEN");
    return createResponse(status);
  }),

  http.post("*/api/catalog/:merchantId/sync", async ({ params }) => {
    await delay(2000); // محاكاة عملية مزامنة طويلة
    const { merchantId: _merchantId } = params;

    return createResponse({
      imported: 15,
      updated: 8,
      message: "تمت المزامنة بنجاح",
    });
  }),

  // ===== KALEEM CHAT =====
  http.get("*/api/kleem/chat/:sessionId", async ({ params }) => {
    await delay(300);
    const { sessionId } = params;

    const session = (mockKaleemChat as any).sessions[sessionId as string] || {
      sessionId: sessionId as string,
      messages: [],
    };

    return createResponse(session);
  }),

  http.post("*/api/kleem/chat/:sessionId/message", async ({ params, request }) => {
    await delay(800); // محاكاة وقت معالجة AI
    const { sessionId: _sessionId } = params;
    const body = (await request.json()) as { text: string; metadata?: Record<string, unknown> };

    // محاكاة رد ذكي بناءً على الرسالة
    let reply = "شكراً لرسالتك! كيف يمكنني مساعدتك؟";
    const text = body.text.toLowerCase();

    if (text.includes("سعر") || text.includes("تكلفة")) {
      reply = "يمكنك الاطلاع على الأسعار في صفحة المنتجات. هل تريد معرفة سعر منتج محدد؟";
    } else if (text.includes("شحن") || text.includes("توصيل")) {
      reply = "نقدم خدمة الشحن في جميع أنحاء اليمن خلال 1-3 أيام عمل. الشحن مجاني للطلبات التي تزيد عن 150,000 ريال يمني.";
    } else if (text.includes("ضمان") || text.includes("كفالة")) {
      reply = "جميع المنتجات الإلكترونية تأتي بضمان من الشركة المصنعة لمدة سنة واحدة.";
    } else if (text.includes("مرحب") || text.includes("أهلاً")) {
      reply = "أهلاً وسهلاً! أنا كليم، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟";
    }

    return createResponse({
      reply,
      msgIdx: Date.now(),
      sources: [
        {
          id: "source-001",
          question: body.text,
          answer: reply,
          score: 0.92,
        },
      ],
    });
  }),

  http.post("*/api/kleem/chat/:sessionId/rate", async ({ params, request }) => {
    await delay(200);
    const { sessionId: _sessionId } = params;
    await request.json(); // Parse but don't store

    return createResponse({
      status: "ok",
      message: "شكراً لتقييمك!",
    });
  }),

  // ===== CONTACT =====
  http.get("*/api/support/contact/config", async () => {
    await delay(200);
    return createResponse(mockContactConfig);
  }),

  http.post("*/api/support/contact", async ({ request }) => {
    await delay(500);
    const formData = await request.formData();
    const payloadStr = formData.get("payload") as string;
    JSON.parse(payloadStr); // Parse but don't store

    return createResponse({
      id: `contact-${Date.now()}`,
      ticketNumber: `TKT-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }),

  // ===== STORE (PUBLIC STOREFRONT) =====
  http.get("*/api/storefront/info/:merchantId", async ({ params }) => {
    await delay(300);
    const { merchantId } = params;
    const storefront = (mockStorefrontTheme as any)[merchantId as string];

    if (!storefront) {
      return createResponse({ message: "المتجر غير موجود" }, 404);
    }

    return createResponse(storefront);
  }),

  // ===== PUBLIC CHAT WIDGET =====
  http.get("*/api/public/chat-widget/:slug", async ({ params }) => {
    await delay(300);
    const { slug } = params;

    console.log("[DEMO SERVER] GET /api/public/chat-widget/:slug", slug);

    // البحث عن التاجر حسب publicSlug أو widgetSlug
    let merchantId: string | null = null;
    for (const mid in mockMerchantSettings) {
      const merchant = (mockMerchantSettings as any)[mid];
      if (merchant.publicSlug === slug) {
        merchantId = mid;
        break;
      }
    }

    // إذا لم يتم العثور على التاجر بـ publicSlug، ابحث في widgetConfig بـ widgetSlug
    if (!merchantId) {
      for (const mid in mockWidgetConfig) {
        const widget = (mockWidgetConfig as any)[mid];
        if (widget.widgetSlug === slug) {
          merchantId = mid;
          break;
        }
      }
    }

    if (!merchantId) {
      return createResponse({ message: "التاجر غير موجود" }, 404);
    }

    // جلب إعدادات الويدجت
    const widgetConfig = (mockWidgetConfig as any)[merchantId] || {
      botName: "مساعد ذكي",
      brandColor: "#1976d2",
      welcomeMessage: "مرحباً! كيف يمكنني مساعدتك؟",
      fontFamily: "Tajawal",
      embedMode: "bubble",
      widgetSlug: slug,
      merchantId,
      useStorefrontBrand: false,
    };

    // جلب معلومات التاجر
    const merchant = (mockMerchantSettings as any)[merchantId] || {};

    // تحديد brandColor: إذا كان useStorefrontBrand = true، استخدم brandDark من storefront
    let brandColor = widgetConfig.brandColor || "#1976d2";
    if (widgetConfig.useStorefrontBrand === true) {
      const storefront = getStorefrontTheme(merchantId);
      if (storefront && storefront.brandDark) {
        brandColor = storefront.brandDark;
        console.log("[DEMO SERVER] Using storefront brandDark:", brandColor);
      }
    }

    console.log("[DEMO SERVER] Widget config for slug:", slug, "merchantId:", merchantId, "brandColor:", brandColor);

    // إرجاع البيانات مع merchantId و brandColor الصحيح
    return createResponse({
      ...widgetConfig,
      merchantId,
      publicSlug: merchant.publicSlug || slug,
      brandColor, // استخدام brandColor المحسوب (من storefront أو widgetConfig)
      merchant: {
        _id: merchantId,
        id: merchantId,
        name: merchant.name || "متجر",
        slug: merchant.publicSlug || slug,
      },
    });
  }),

  http.get("*/api/storefront/merchant/:merchantId/my-orders", async ({ params, request }) => {
    await delay(300);
    const { merchantId } = params;
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");
    const sessionId = url.searchParams.get("sessionId");

    console.log("[DEMO SERVER] GET /api/storefront/merchant/:merchantId/my-orders", merchantId, phone, sessionId);

    // فلترة الطلبات حسب merchantId و phone (إذا كان موجوداً)
    let orders = filterByMerchantId(mockOrders, merchantId as string);

    // إذا كان phone موجوداً، فلتر حسب phone
    if (phone) {
      orders = orders.filter((o: any) => {
        const customerPhone = o.customer?.phone || o.phone;
        return customerPhone === phone || customerPhone?.includes(phone);
      });
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    orders = orders.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return createResponse({
      orders,
      total: orders.length,
    });
  }),

  http.get("*/api/products/public/:storeSlug/product/:productSlug", async ({ params }) => {
    await delay(300);
    const { storeSlug: _storeSlug, productSlug } = params;

    // البحث عن المنتج حسب slug
    const product = mockProducts.find(
      (p) => p.storefrontSlug === productSlug || p.slug === productSlug
    );

    if (!product) {
      return createResponse({ message: "المنتج غير موجود" }, 404);
    }

    return createResponse(product);
  }),

  http.get("*/api/offers", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    // إنشاء عروض من المنتجات التي لديها offers
    const offers = mockProducts
      .filter((p) => {
        if (merchantId && p.merchantId !== merchantId) return false;
        return p.hasActiveOffer && p.offer?.enabled;
      })
      .slice(0, limit)
      .map((p) => ({
        id: p._id, // product id (مطلوب من OfferItem)
        name: p.name,
        slug: p.slug,
        priceOld: p.offer?.oldPrice || p.price, // priceOld بدلاً من oldPrice
        priceNew: p.offer?.newPrice || p.priceEffective || p.price, // priceNew بدلاً من newPrice
        priceEffective: p.priceEffective || p.offer?.newPrice || p.price, // priceEffective (الأولوية)
        currency: p.currency || "YER",
        discountPct: p.offer
          ? Math.round(((p.offer.oldPrice - p.offer.newPrice) / p.offer.oldPrice) * 100)
          : null,
        isActive: p.hasActiveOffer && p.offer?.enabled === true,
        period: {
          startAt: p.offer?.startAt || null,
          endAt: p.offer?.endAt || null,
        },
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined,
      }));

    console.log("[DEMO SERVER] GET /api/offers", "merchantId:", merchantId, "offers count:", offers.length);
    if (offers.length > 0) {
      console.log("[DEMO SERVER] First offer:", offers[0]);
    }

    return createResponse(offers);
  }),

  http.get("*/api/public/:target", async ({ params }) => {
    await delay(300);
    const { target } = params;

    // معالجة خاصة للديمو
    if (target === "demo") {
      const demoMerchantId = "507f1f77bcf86cd799439011";
      return createResponse({
        merchantId: demoMerchantId,
        merchant: demoMerchantId,
        type: "storefront",
        redirect: `/storefront/demo`,
      });
    }

    // محاكاة resolver عام
    // يمكن أن يكون slug متجر أو معرف منتج
    const storefront = Object.values(mockStorefrontTheme as any).find(
      (s: any) => s.slug === target
    );

    if (storefront && typeof storefront === "object") {
      const sf = storefront as any;
      return createResponse({
        type: "storefront",
        redirect: `/storefront/${target}`,
        data: storefront,
        merchantId: sf.merchant,
        merchant: sf.merchant,
      });
    }

    // البحث عن منتج
    const product = mockProducts.find(
      (p) => p.storefrontSlug === target || p.slug === target
    );

    if (product) {
      const merchantStorefront = Object.values(mockStorefrontTheme as any).find(
        (s: any) => s.merchant === product.merchantId
      ) as any;

      return createResponse({
        type: "product",
        redirect: `/storefront/${merchantStorefront?.slug || product.merchantId}/product/${target}`,
        data: product,
      });
    }

    return createResponse({ message: "غير موجود" }, 404);
  }),

  // ===== GENERIC ERROR HANDLER =====
  // ملاحظة: لا نستخدم catch-all handler هنا لأن onUnhandledRequest يتعامل مع الطلبات غير المعالجة
  // هذا يمنع MSW من اعتراض طلبات Vite و dynamic imports
);

// دوال مساعدة للتحكم في الخادم
export const startDemoServer = async () => {
  try {
    // في MSW v2، يجب تحديد serviceWorker option
    await demoServer.start({
      // استخدام دالة مخصصة للتعامل مع الطلبات غير المعالجة
      // هذا يمنع Service Worker من محاولة fetch للطلبات الخارجية والثابتة و Vite
      onUnhandledRequest: (request, print) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
        
        // إذا كان الطلب خارجي (من origin مختلف)، تجاهله تماماً
        if (origin !== currentOrigin && origin !== "null") {
          // لا نطبع تحذير للطلبات الخارجية
          return;
        }
        
        // للطلبات المحلية غير المعالجة، استخدم bypass
        // هذا يسمح للطلبات الثابتة و Vite بالمرور
        print.warning();
      },
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    });
    console.log("🚀 Demo server started - Mock data is active");
    console.log("📡 MSW Worker is intercepting API requests only");
  } catch (error) {
    console.error("❌ Failed to start demo server:", error);
    console.error("Make sure mockServiceWorker.js exists in public/ folder");
    throw error;
  }
};

export const stopDemoServer = () => {
  demoServer.stop();
  console.log("🛑 Demo server stopped");
};

export const resetDemoServer = () => {
  demoServer.resetHandlers();
  console.log("🔄 Demo server handlers reset");
};

