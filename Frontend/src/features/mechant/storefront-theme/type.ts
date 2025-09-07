
export type Storefront = {
  _id: string;
  merchant: string; // الـ merchantId
  slug: string; // لو عندك رابط ثابت للـ store
  domain?: string; // لو استخدمه التاجر بدومين خاص
  banners: Banner[]; // ما جبتها من الـ API
  primaryColor: string; // من themeOptions.primaryColor
  secondaryColor: string; // من themeOptions.secondaryColor
  brandDark: string; // من themeOptions.brandDark
  buttonStyle: "rounded" | "square"; // من themeOptions.buttonStyle
  // أي حقول إضافية للعرض (مثلاً featuredProducts، شعار المتجر، إلخ)
};
export interface Banner {
  image?: string;
  text: string;
  url?: string;
  color?: string;
  active?: boolean;
  order?: number;
  _id?: string; // إضافة معرف فريد للبانر إذا كان موجوداً
}
  export type ButtonStyle = "rounded" | "square";
