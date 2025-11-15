// src/app/routes/ProtectedRoute.test.tsx
import { renderWithProviders } from "@/test/test-utils";
import { screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

// ✅ نعمل Mock لـ AuthContext مع كل التصديرات المطلوبة
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// استيراد الـ Route الفعلي
import { PrivateRoute } from "./PrivateRoute";

function Secret() {
  return <div>لوحة التاجر</div>;
}

describe("PrivateRoute", () => {
  test("يسمح بالدخول مع مستخدم", () => {
    renderWithProviders(
      <PrivateRoute>
        <Secret />
      </PrivateRoute>
    );
    expect(screen.getByText("لوحة التاجر")).toBeInTheDocument();
  });
});
