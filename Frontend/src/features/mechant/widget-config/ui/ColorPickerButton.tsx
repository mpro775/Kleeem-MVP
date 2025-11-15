// src/features/widget-config/ui/ColorPickerButton.tsx
import { Button, styled } from "@mui/material";

const Root = styled(Button)(() => ({
  minWidth: 40,
  height: 40,
  borderRadius: "50%",
  padding: 0,
  position: "relative",
  overflow: "hidden",
  "& input[type='color']": {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
  },
}));

export default function ColorPickerButton({
  colorHex,
  onChange,
}: { colorHex: string; onChange: (hex: string) => void }) {
  return (
    <Root sx={{ bgcolor: colorHex }}>
      <input type="color" value={colorHex} onChange={(e) => onChange(e.target.value)} />
    </Root>
  );
}
