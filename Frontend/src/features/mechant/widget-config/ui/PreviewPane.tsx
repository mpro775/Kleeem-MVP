// src/features/widget-config/ui/PreviewPane.tsx
import { useMemo } from "react";

export default function PreviewPane({ embedTag }: { embedTag: string }) {
  // استخدام srcdoc بدلاً من doc.write() لضمان التحديث الصحيح
  const htmlContent = useMemo(() => {
    return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
  </style>
</head>
<body>
  ${embedTag}
</body>
</html>`;
  }, [embedTag]);

  return (
    <iframe
      key={embedTag}
      title="Chat Preview"
      srcDoc={htmlContent}
      style={{ 
        width: "100%", 
        height: "100%", 
        border: "none", 
        borderRadius: 8,
        display: "block"
      }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
