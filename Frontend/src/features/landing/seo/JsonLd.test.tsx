import { render } from "@testing-library/react";
import JsonLd from "./JsonLd";

test("renders JSON-LD script", () => {
  render(<JsonLd />);
  const script = document.querySelector(
    'script[type="application/ld+json"]'
  ) as HTMLScriptElement | null;
  expect(script).not.toBeNull();
  const data = JSON.parse(script?.textContent || "null");
  expect(data["@type"]).toBe("SoftwareApplication");
});
