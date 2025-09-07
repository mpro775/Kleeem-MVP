import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactInfo from "./ContactInfo";
import type { ContactConfig } from "../types";

// Mock dependencies
vi.mock("@mui/material/styles", () => ({
  useTheme: () => ({
    palette: { divider: "#e0e0e0" },
  }),
}));

// Mock dayjs
vi.mock("dayjs", () => {
  const originalDayjs = vi.importActual("dayjs");
  const mockDayjs = vi.fn((date?: any) => {
    if (date) return originalDayjs(date);
    // Return a fixed date for testing
    return originalDayjs("2024-01-15T10:30:00Z");
  });
  
  mockDayjs.extend = vi.fn();
  mockDayjs.tz = vi.fn((date: any, timezone: string) => {
    const d = originalDayjs(date);
    d.day = vi.fn(() => 1); // Monday
    d.format = vi.fn((format: string) => {
      if (format === "YYYY-MM-DD") return "2024-01-15";
      if (format === "hh:mm A") return "10:30 AM";
      return d.format(format);
    });
    d.isAfter = vi.fn(() => true);
    d.isBefore = vi.fn(() => false);
    return d;
  });
  
  return mockDayjs;
});

describe("ContactInfo", () => {
  const mockConfig: ContactConfig = {
    enabled: true,
    topics: [],
    maxFiles: 5,
    allowedFileTypes: [],
    address: "شارع الملك فهد، الرياض، المملكة العربية السعودية",
    phone: "+966 50 123 4567",
    email: "info@kaleem.com",
    workHours: {
      0: { from: "09:00", to: "17:00", off: false }, // Sunday
      1: { from: "09:00", to: "17:00", off: false }, // Monday
      2: { from: "09:00", to: "17:00", off: false }, // Tuesday
      3: { from: "09:00", to: "17:00", off: false }, // Wednesday
      4: { from: "09:00", to: "17:00", off: false }, // Thursday
      5: { from: "09:00", to: "17:00", off: false }, // Friday
      6: { from: "09:00", to: "17:00", off: true },  // Saturday
    },
    mapEmbedUrl: "https://maps.google.com/embed?pb=test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يعرض العنوان والعنوان الفرعي", () => {
    render(<ContactInfo config={mockConfig} />);

    expect(screen.getByText("معلومات التواصل")).toBeInTheDocument();
    expect(screen.getByText("أوقات العمل")).toBeInTheDocument();
  });

  it("يجب أن يعرض معلومات التواصل عند توفرها", () => {
    render(<ContactInfo config={mockConfig} />);

    expect(screen.getByText("شارع الملك فهد، الرياض، المملكة العربية السعودية")).toBeInTheDocument();
    expect(screen.getByText("+966 50 123 4567")).toBeInTheDocument();
    expect(screen.getByText("info@kaleem.com")).toBeInTheDocument();
  });

  it("يجب ألا يعرض معلومات التواصل غير المتوفرة", () => {
    const configWithoutContact = {
      ...mockConfig,
      address: undefined,
      phone: undefined,
      email: undefined,
    };

    render(<ContactInfo config={configWithoutContact} />);

    expect(screen.queryByText("شارع الملك فهد، الرياض، المملكة العربية السعودية")).not.toBeInTheDocument();
    expect(screen.queryByText("+966 50 123 4567")).not.toBeInTheDocument();
    expect(screen.queryByText("info@kaleem.com")).not.toBeInTheDocument();
  });

  it("يجب أن يعرض حالة الفتح والإغلاق", () => {
    render(<ContactInfo config={mockConfig} />);

    // Since we mocked dayjs to return a specific time, we can test the status display
    expect(screen.getByText(/مفتوح الآن|مغلق الآن/)).toBeInTheDocument();
  });

  it("يجب أن يعرض الخريطة عند توفر رابط الخريطة", () => {
    render(<ContactInfo config={mockConfig} />);

    const iframe = screen.getByTitle("map");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "https://maps.google.com/embed?pb=test");
    expect(iframe).toHaveAttribute("width", "100%");
    expect(iframe).toHaveAttribute("height", "220");
  });

  it("يجب ألا يعرض الخريطة عند عدم توفر رابط الخريطة", () => {
    const configWithoutMap = {
      ...mockConfig,
      mapEmbedUrl: undefined,
    };

    render(<ContactInfo config={configWithoutMap} />);

    expect(screen.queryByTitle("map")).not.toBeInTheDocument();
  });

  it("يجب أن يعرض أيقونات مناسبة لكل نوع من معلومات التواصل", () => {
    render(<ContactInfo config={mockConfig} />);

    // Check for icons (they should be present as SVG elements)
    const addressIcon = screen.getByTestId("RoomIcon");
    const phoneIcon = screen.getByTestId("PhoneInTalkIcon");
    const emailIcon = screen.getByTestId("EmailIcon");

    expect(addressIcon).toBeInTheDocument();
    expect(phoneIcon).toBeInTheDocument();
    expect(emailIcon).toBeInTheDocument();
  });

  it("يجب أن يعرض أوقات العمل حتى لو لم تكن هناك معلومات تواصل", () => {
    const configOnlyWorkHours = {
      enabled: true,
      topics: [],
      maxFiles: 5,
      allowedFileTypes: [],
      workHours: mockConfig.workHours,
    };

    render(<ContactInfo config={configOnlyWorkHours} />);

    expect(screen.getByText("أوقات العمل")).toBeInTheDocument();
    expect(screen.getByText(/مفتوح الآن|مغلق الآن/)).toBeInTheDocument();
  });

  it("يجب أن يتعامل مع أوقات العمل غير المحددة", () => {
    const configWithoutWorkHours = {
      enabled: true,
      topics: [],
      maxFiles: 5,
      allowedFileTypes: [],
      address: "عنوان تجريبي",
    };

    render(<ContactInfo config={configWithoutWorkHours} />);

    expect(screen.getByText("أوقات العمل")).toBeInTheDocument();
    // Should show closed status when no work hours are defined
    expect(screen.getByText("مغلق الآن")).toBeInTheDocument();
  });

  it("يجب أن يعرض حالة الإغلاق عندما يكون اليوم مغلق", () => {
    const configWithClosedDay = {
      ...mockConfig,
      workHours: {
        1: { from: "09:00", to: "17:00", off: true }, // Monday closed
      },
    };

    render(<ContactInfo config={configWithClosedDay} />);

    expect(screen.getByText("مغلق الآن")).toBeInTheDocument();
  });
});
