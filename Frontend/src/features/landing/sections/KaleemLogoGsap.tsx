// src/components/landing/KaleemLogoGsap.tsx
import { useRef } from "react";
import { Box } from "@mui/material";
import { ReactSVG } from "react-svg";
import { useKaleemLogoAnimation } from "@/features/landing/hooks/useKaleemLogoAnimation"; // تأكد من المسار

type Props = {
  src?: string;
  size?: number;
  speed?: number;
  float?: boolean;
  hoverBoost?: boolean;
};

export default function KaleemLogoGsap({
  src = "/kaleem2.svg",
  size = 180,
  speed = 1,
  float = true,
  hoverBoost = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // استدعاء الخطاف الجديد الذي يحتوي على كل منطق الأنميشن
  useKaleemLogoAnimation(
    svgRef, // نمرر SVG كـ ref
    rootRef,
    { speed, float, hoverBoost }
  );

  return (
    <Box
      ref={rootRef}
      sx={{ width: size, height: size, display: "inline-block" }}
    >
      <ReactSVG
        src={src}
        loading={() => null}
        // afterInjection هو المكان المثالي لحفظ مرجع SVG
        afterInjection={(svg) => {
          svg.style.width = "100%";
          svg.style.height = "100%";
          // تطبيق الستايل الضروري مباشرة على SVG
          const elements = svg.querySelectorAll(".hand,.eye,.antenna,.outline,.shadow");
          elements.forEach((el) => {
            (el as SVGElement).style.transformBox = "fill-box";
          });
          // حفظ المرجع بدون إعادة التصيير
          svgRef.current = svg;
        }}
      />
    </Box>
  );
}
