// src/components/dashboard/MobileBottomNav.tsx
import { Paper, BottomNavigation, BottomNavigationAction } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InsightsIcon from "@mui/icons-material/Insights";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate, useLocation } from "react-router-dom";

export default function MobileBottomNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const value = pathname.startsWith("/dashboard/conversations")
    ? 0
    : pathname.startsWith("/dashboard/products")
    ? 1
    : pathname.startsWith("/dashboard/analytics")
    ? 2
    : 3;

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        pb: "env(safe-area-inset-bottom)",
      }}
      elevation={8}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, v) => {
          const routes = [
            "/dashboard/conversations",
            "/dashboard/products",
            "/dashboard/analytics",
            "/dashboard/setting",
          ];
          nav(routes[v]);
        }}
      >
        <BottomNavigationAction
          label="المحادثات"
          icon={<ChatBubbleOutlineIcon />}
        />
        <BottomNavigationAction label="المنتجات" icon={<StorefrontIcon />} />
        <BottomNavigationAction label="الإحصائيات" icon={<InsightsIcon />} />
        <BottomNavigationAction label="الإعدادات" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  );
}
