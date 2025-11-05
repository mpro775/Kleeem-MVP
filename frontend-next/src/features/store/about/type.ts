// امتداد لأنواع المتجر لاستخدامها في صفحة من نحن

export type WorkingHour = {
    day: string;        // "السبت" .. الخ
    openTime: string;   // "09:00"
    closeTime: string;  // "22:00"
  };
  
  export type Address = {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  
  export type MerchantInfo = {
    _id: string;
    name: string;
    slug?: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    storefrontUrl?: string;
    businessDescription?: string;
    addresses?: Address[];
    workingHours?: WorkingHour[];
    exchangePolicy?: string;
    shippingPolicy?: string;
    returnPolicy?: string;
  };
  