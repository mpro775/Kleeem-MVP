import { render } from "@testing-library/react";
import SEOHead from "./SEOHead";

test("sets html attrs and meta", () => {
  document.documentElement.lang = "";
  document.documentElement.dir = "";
  render(<SEOHead />);
  expect(document.documentElement.lang).toBe("ar");
  expect(document.documentElement.dir).toBe("rtl");
  expect(document.title).toBe("كليم — مساعد متاجر ذكي بالعربية");
  const meta = document.head.querySelector('meta[name="description"]');
  expect(meta?.getAttribute("content")).toContain("بوت عربي");
});
