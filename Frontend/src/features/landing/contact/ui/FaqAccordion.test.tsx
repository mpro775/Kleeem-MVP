import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FaqAccordion from "./FaqAccordion";

describe("FaqAccordion", () => {
  it("يجب أن يعرض جميع الأسئلة الشائعة", () => {
    render(<FaqAccordion />);

    expect(screen.getByText("كيف أفعّل دردشة كليم في موقعي؟")).toBeInTheDocument();
    expect(screen.getByText("كم يستغرق الرد على التذاكر؟")).toBeInTheDocument();
    expect(screen.getByText("هل يوجد باقات للشركات؟")).toBeInTheDocument();
  });

  it("يجب أن يعرض الإجابات عند فتح الأسئلة", () => {
    render(<FaqAccordion />);

    // فتح السؤال الأول
    const firstQuestion = screen.getByText("كيف أفعّل دردشة كليم في موقعي؟");
    fireEvent.click(firstQuestion);

    expect(screen.getByText(/من لوحة التاجر → القنوات → الويب شات/)).toBeInTheDocument();
    expect(screen.getByText(/انسخ سكربت التثبيت والصقه قبل/)).toBeInTheDocument();
  });

  it("يجب أن يعرض إجابة السؤال الثاني عند فتحه", () => {
    render(<FaqAccordion />);

    const secondQuestion = screen.getByText("كم يستغرق الرد على التذاكر؟");
    fireEvent.click(secondQuestion);

    expect(screen.getByText(/عادةً خلال 4–8 ساعات في أوقات العمل/)).toBeInTheDocument();
    expect(screen.getByText(/24 ساعة كحد أقصى/)).toBeInTheDocument();
  });

  it("يجب أن يعرض إجابة السؤال الثالث عند فتحه", () => {
    render(<FaqAccordion />);

    const thirdQuestion = screen.getByText("هل يوجد باقات للشركات؟");
    fireEvent.click(thirdQuestion);

    expect(screen.getByText(/نعم، لدينا خطط مخصّصة/)).toBeInTheDocument();
    expect(screen.getByText(/راسلنا عبر النموذج وحدد "شركات\/شراكات"/)).toBeInTheDocument();
  });

  it("يجب أن يحتوي على عناصر details و summary", () => {
    render(<FaqAccordion />);

    const detailsElements = document.querySelectorAll("details");
    const summaryElements = document.querySelectorAll("summary");

    expect(detailsElements).toHaveLength(3);
    expect(summaryElements).toHaveLength(3);
  });

  it("يجب أن يحتوي على كود HTML في الإجابة الأولى", () => {
    render(<FaqAccordion />);

    const firstQuestion = screen.getByText("كيف أفعّل دردشة كليم في موقعي؟");
    fireEvent.click(firstQuestion);

    const codeElement = document.querySelector("code");
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent("</body>");
  });

  it("يجب أن يكون لديه تنسيق مناسب للأسئلة", () => {
    render(<FaqAccordion />);

    const summaryElements = document.querySelectorAll("summary");
    
    summaryElements.forEach((summary) => {
      expect(summary).toHaveStyle({ cursor: "pointer", fontWeight: "600" });
    });
  });

  it("يجب أن يعرض جميع الأسئلة مغلقة افتراضياً", () => {
    render(<FaqAccordion />);

    const detailsElements = document.querySelectorAll("details");
    
    detailsElements.forEach((details) => {
      expect(details).not.toHaveAttribute("open");
    });
  });

  it("يجب أن يفتح ويغلق الأسئلة عند النقر عليها", () => {
    render(<FaqAccordion />);

    const firstQuestion = screen.getByText("كيف أفعّل دردشة كليم في موقعي؟");
    const detailsElement = firstQuestion.closest("details");

    // فتح السؤال
    fireEvent.click(firstQuestion);
    expect(detailsElement).toHaveAttribute("open");

    // إغلاق السؤال
    fireEvent.click(firstQuestion);
    expect(detailsElement).not.toHaveAttribute("open");
  });
});
