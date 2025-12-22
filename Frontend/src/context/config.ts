// export const API_BASE = import.meta.env.VITE_API_URL || 'https://musaidbot-backend.onrender.com/api';
// export const API_BASE = "https://api.kaleem-ai.com/api";
export const API_BASE = "http://localhost:3000/api";

// // في وضع الديمو، استخدم relative URL حتى يعمل MSW بشكل صحيح
// // في الإنتاج، استخدم متغير البيئة أو القيمة الافتراضية
// const getApiBase = (): string => {
//   // التحقق من وضع الديمو أولاً
//   const mockDataEnabled = 
//     import.meta.env.VITE_USE_MOCK_DATA === "true" ||
//     (typeof window !== "undefined" && localStorage.getItem("kaleem_use_mock_data") === "true");
  
//   if (mockDataEnabled) {
//     // في وضع الديمو، استخدم relative URL
//     return "/api";
//   }
  
//   // في الإنتاج، استخدم متغير البيئة أو القيمة الافتراضية
//   return import.meta.env.VITE_API_URL || "https://api.kaleem-ai.com/api";
// };

// export const API_BASE = getApiBase();
