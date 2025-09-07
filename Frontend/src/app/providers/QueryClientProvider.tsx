// مثال مختصر داخل providers:
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const qc = new QueryClient();
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
