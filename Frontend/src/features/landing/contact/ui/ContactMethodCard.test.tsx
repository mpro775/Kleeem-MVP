import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactMethodCard from "./ContactMethodCard";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

// Mock dependencies
vi.mock("@mui/material/styles", () => ({
  useTheme: () => ({
    palette: { divider: "#e0e0e0" },
  }),
}));

describe("ContactMethodCard", () => {
  const defaultProps = {
    icon: <SupportAgentIcon data-testid="support-icon" />,
    title: "الدعم الفني",
    subtitle: "احصل على مساعدة فورية",
    href: "https://support.kaleem.com",
  };

  it("يجب أن يعرض العنوان والعنوان الفرعي", () => {
    render(<ContactMethodCard {...defaultProps} />);

    expect(screen.getByText("الدعم الفني")).toBeInTheDocument();
    expect(screen.getByText("احصل على مساعدة فورية")).toBeInTheDocument();
  });

  it("يجب أن يعرض الأيقونة المطلوبة", () => {
    render(<ContactMethodCard {...defaultProps} />);

    expect(screen.getByTestId("support-icon")).toBeInTheDocument();
  });

  it("يجب أن يحتوي على رابط مع الخصائص الصحيحة", () => {
    render(<ContactMethodCard {...defaultProps} />);

    const link = screen.getByRole("link", { name: /تواصل/i });
    expect(link).toHaveAttribute("href", "https://support.kaleem.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });

  it("يجب أن يعرض زر التواصل مع الأيقونة", () => {
    render(<ContactMethodCard {...defaultProps} />);

    expect(screen.getByText("تواصل")).toBeInTheDocument();
    expect(screen.getByTestId("OpenInNewIcon")).toBeInTheDocument();
  });

  it("يجب أن يكون لديه تنسيق مناسب", () => {
    render(<ContactMethodCard {...defaultProps} />);

    const card = screen.getByText("الدعم الفني").closest("div");
    expect(card).toHaveStyle({
      display: "flex",
      alignItems: "center",
    });
  });

  it("يجب أن يعمل مع أيقونات مختلفة", () => {
    const customIcon = <div data-testid="custom-icon">📧</div>;
    
    render(
      <ContactMethodCard
        {...defaultProps}
        icon={customIcon}
      />
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("support-icon")).not.toBeInTheDocument();
  });

  it("يجب أن يعمل مع روابط مختلفة", () => {
    const customHref = "https://custom.kaleem.com";
    
    render(
      <ContactMethodCard
        {...defaultProps}
        href={customHref}
      />
    );

    const link = screen.getByRole("link", { name: /تواصل/i });
    expect(link).toHaveAttribute("href", customHref);
  });

  it("يجب أن يعمل مع عناوين مختلفة", () => {
    const customTitle = "المبيعات";
    const customSubtitle = "استفسر عن الأسعار";
    
    render(
      <ContactMethodCard
        {...defaultProps}
        title={customTitle}
        subtitle={customSubtitle}
      />
    );

    expect(screen.getByText(customTitle)).toBeInTheDocument();
    expect(screen.getByText(customSubtitle)).toBeInTheDocument();
  });

  it("يجب أن يكون الأيقونة مع aria-hidden", () => {
    render(<ContactMethodCard {...defaultProps} />);

    const iconContainer = screen.getByTestId("support-icon").parentElement;
    expect(iconContainer).toHaveAttribute("aria-hidden", "true");
  });

  it("يجب أن يحتوي على Paper component مع الخصائص الصحيحة", () => {
    render(<ContactMethodCard {...defaultProps} />);

    const paper = screen.getByText("الدعم الفني").closest('[class*="MuiPaper"]');
    expect(paper).toBeInTheDocument();
  });
});
