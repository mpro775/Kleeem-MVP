import { type ReactNode } from "react";
import { render } from "@testing-library/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "@/theme/theme";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider } from "notistack";

type Options = {
  route?: string;
  auth?: { user?: any; token?: string | null };
};

// إنشاء QueryClient جديد لكل اختبار
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(ui: ReactNode, options: Options = {}) {
  const { route = "/" } = options;
  const queryClient = createTestQueryClient();

  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider maxSnack={3}>
            <AuthProvider>{ui}</AuthProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

// دالة مساعدة لانتظار انتهاء العمليات غير المتزامنة
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// دالة مساعدة لانتظار انتهاء العمليات
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
