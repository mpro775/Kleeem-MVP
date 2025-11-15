// src/monitor/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP, type CLSMetric, type INPMetric, type LCPMetric, type FCPMetric, type TTFBMetricWithAttribution } from "web-vitals";
import { onTTFB } from "web-vitals/attribution";

function sendToAnalytics(metric: CLSMetric | INPMetric | LCPMetric | FCPMetric | TTFBMetricWithAttribution) {
  console.log(metric); // أو أرسلها للباك
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
