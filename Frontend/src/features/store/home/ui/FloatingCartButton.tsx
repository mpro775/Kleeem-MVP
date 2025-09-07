// =========================
// File: src/features/store/ui/FloatingCartButton.tsx
// =========================
import { Badge, IconButton } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

export function FloatingCartButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <IconButton
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1300,
        width: 56,
        height: 56,
        backgroundColor: "var(--brand)",
        color: "var(--on-brand)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        "&:hover": {
          backgroundColor: "var(--brand-hover)",
          transform: "scale(1.05)",
        },
        transition: "all 0.25s ease",
      }}
      onClick={onClick}
      aria-label="فتح السلة"
    >
      <Badge badgeContent={count} color="error">
        <ShoppingCartIcon />
      </Badge>
    </IconButton>
  );
}
