// Histogram bucket constants (in seconds)
const HISTOGRAM_BUCKET_0_5_SEC = 0.5;
const HISTOGRAM_BUCKET_1_SEC = 1;
const HISTOGRAM_BUCKET_2_SEC = 2;
const HISTOGRAM_BUCKET_5_SEC = 5;

const HISTOGRAM_BUCKET_0_001_SEC = 0.001;
const HISTOGRAM_BUCKET_0_005_SEC = 0.005;
const HISTOGRAM_BUCKET_0_01_SEC = 0.01;
const HISTOGRAM_BUCKET_0_1_SEC = 0.1;

export const HISTOGRAM_BUCKETS = [
  HISTOGRAM_BUCKET_0_001_SEC,
  HISTOGRAM_BUCKET_0_005_SEC,
  HISTOGRAM_BUCKET_0_01_SEC,
  HISTOGRAM_BUCKET_0_1_SEC,
  HISTOGRAM_BUCKET_0_5_SEC,
  HISTOGRAM_BUCKET_1_SEC,
  HISTOGRAM_BUCKET_2_SEC,
  HISTOGRAM_BUCKET_5_SEC,
];
export const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes
export const HITRATE_INTERVAL_MS = 60_000; // 1 minute
export const LOCK_TTL_SEC = 5;
export const LOCK_BACKOFF_MS = 150;
export const SCAN_COUNT = 500;
export const PIPELINE_BATCH = 1000;
export const MS_PER_SECOND = 1000;
// Cache TTL constants (in seconds)
export const CACHE_TTL_30_MINUTES = 30 * 60; // 1800 seconds
export const CACHE_TTL_5_MINUTES = 5 * 60; // 300 seconds
export const CACHE_TTL_10_MINUTES = 10 * 60; // 600 seconds
export const CACHE_TTL_15_MINUTES = 15 * 60; // 900 seconds
export const CACHE_TTL_1_HOUR = 60 * 60; // 3600 seconds

export const CACHE_MAX_ITEMS = 1000;
export const REDIS_DEFAULT_DB = 0;
export const REDIS_RETRY_DELAY_ON_FAILOVER = 100;
export const REDIS_DEFAULT_PORT = 6379;
export const MILLISECONDS_PER_MINUTE = 60_000;
