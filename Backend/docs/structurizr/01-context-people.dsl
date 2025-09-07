model {
  // People
  person merchant "التاجر" "يدير متجره وإعداداته وصندوق وارد متجره."
  person shopper  "العميل" "يتحدث مع كليم ويشتري عبر القنوات."
  person platform_admin "الأدمن العام" "يشرف على المنصة ويُدرّب كليم عالميًا."

  // External systems
  softwareSystem whatsapp      "WhatsApp Business API" "قناة خارجية"
  softwareSystem telegram      "Telegram Bot API"       "قناة خارجية"
  softwareSystem salla         "Salla"                  "منصة تجارة"
  softwareSystem zid           "Zid"                    "منصة تجارة"
  softwareSystem shopify       "Shopify"                "منصة تجارة"
  softwareSystem payment       "Payment Gateway"        "بوابة دفع"
  softwareSystem llm           "LLM Provider"           "خدمة نماذج"
  softwareSystem merchant_site "Merchant Website"       "موقع التاجر يستضيف ودجت الويب شات"
}
