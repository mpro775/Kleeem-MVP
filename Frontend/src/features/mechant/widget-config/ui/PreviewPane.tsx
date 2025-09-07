// src/features/widget-config/ui/PreviewPane.tsx
import { useEffect, useRef } from "react";

export default function PreviewPane({ embedTag }: { embedTag: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"/></head><body style="margin:0">${embedTag}</body></html>`);
    doc.close();
  }, [embedTag]);

  return (
    <iframe
      ref={iframeRef}
      title="Chat Preview"
      style={{ width: "100%", height: 500, border: "1px solid #e0e0e0", borderRadius: 8 }}
      sandbox="allow-scripts allow-same-origin" 
      />
  );
}
