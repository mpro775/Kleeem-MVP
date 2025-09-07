// src/monitor/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP } from "web-vitals";
import { onTTFB } from "web-vitals/attribution";

function sendToAnalytics(metric: any) {
  console.log(metric); // أو أرسلها للباك
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
