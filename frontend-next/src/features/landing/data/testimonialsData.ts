// src/components/landing/testimonialsData.ts

export interface Testimonial {
    name: string;
    role: string;
    comment: string;
    rating: number;
    date: string;
  }
  
  export const testimonials: Testimonial[] = [
    {
      name: "متجر عطور الوسام",
      role: "صاحب متجر",
      comment: "من أول يوم ارتفعت نسبة الردود والطلبات! MusaidBot فعلاً وفّر علي وقت وجهد كبير.",
      rating: 5,
      date: "15 يناير 2023",
    },
    {
      name: "متجر نون للجمال",
      role: "مالكة متجر",
      comment: "كنت أرد بنفسي على كل رسالة، الآن كل شيء تلقائي وباحترافية. تجربة ممتازة.",
      rating: 4,
      date: "2 مارس 2023",
    },
    {
      name: "متجر التقنية أولاً",
      role: "مدير العمليات",
      comment: "تكامل البوت مع WhatsApp سلس جدًا، وفريق الدعم رائع. أنصح فيه.",
      rating: 5,
      date: "28 مايو 2023",
    },
    {
      name: "مكتبة المعرفة",
      role: "مدير التسويق",
      comment: "أداة لا غنى عنها لأي بزنس يريد تحسين خدمة العملاء وزيادة المبيعات.",
      rating: 5,
      date: "10 يونيو 2023",
    },
  ];