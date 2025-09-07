import "../monitor/web-vitals";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "@/theme/theme";
import App from "./App";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import createCache from "@emotion/cache";
import stylisRTLPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import * as Sentry from "@sentry/browser";
import AppProviders from "@/app/providers/QueryClientProvider";
import { AppErrorIntegration } from "@/shared/errors";

const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [stylisRTLPlugin],
  prepend: true,
});

Sentry.init({
  dsn: "https://521e7203fa6643f898092a8ffe74e79a@errors.kaleem-ai.com/2",
});

document.documentElement.setAttribute("dir", "rtl");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppProviders>
            <AuthProvider>
              <CartProvider>
                <AppErrorIntegration>
                  <App />
                </AppErrorIntegration>
              </CartProvider>
            </AuthProvider>
          </AppProviders>
          <ToastContainer position="top-center" rtl autoClose={3500} />
        </ThemeProvider>
      </CacheProvider>
    </BrowserRouter>
  </React.StrictMode>
);
