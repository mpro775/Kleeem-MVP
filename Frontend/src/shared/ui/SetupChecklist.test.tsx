import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SetupChecklist } from "./SetupChecklist";

describe("SetupChecklist", () => {
  it("يعرض رسالة البداية عند عدم إكمال أي خطوة", () => {
    const status = {
      merchantInfo: false,
      productsSetup: false,
      channelsConnected: [],
      webchatConfigured: false,
      promptConfigured: false,
    };
    render(<SetupChecklist status={status} onGoToStep={() => {}} />);
    expect(screen.getByText("لنبدأ الرحلة!")).toBeInTheDocument();
  });

  it("يعرض رسالة الإكمال عند إنجاز جميع الخطوات", () => {
    const status = {
      merchantInfo: true,
      productsSetup: true,
      channelsConnected: ["whatsapp"],
      webchatConfigured: true,
      promptConfigured: true,
    };
    render(<SetupChecklist status={status} onGoToStep={() => {}} />);
    expect(
      screen.getByText("تهانينا! لقد أكملت كل شيء بنجاح!")
    ).toBeInTheDocument();
    expect(
      screen.getByText("لقد أكملت جميع خطوات التهيئة بنجاح!")
    ).toBeInTheDocument();
  });
});

