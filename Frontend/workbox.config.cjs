module.exports = {
  globDirectory: "dist",
  globPatterns: ["**/*.{js,css,html,png,svg,webp,jpg,jpeg,json,woff2}"],
  swDest: "dist/sw.js",
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.origin === self.location.origin,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static" },
    },
    {
      urlPattern: /https:\/\/api\.kaleem-ai\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api",
        networkTimeoutSeconds: 4,
      },
    },
  ],
};
