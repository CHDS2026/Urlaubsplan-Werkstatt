import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Urlaubsplaner",
        short_name: "Urlaub",
        description: "Reisen Tag für Tag planen – Spots, Budget, Packliste, Anreise. Offline nutzbar.",
        theme_color: "#047857",
        background_color: "#0c0a09",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        // SPA offline öffnen/neu laden: für Navigationen die App-Shell ausliefern.
        navigateFallback: "index.html",
        // Routen-Geometrie u. Ä. können groß sein – Cache-Limit großzügig.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          // ── Karten-Kacheln + Style + Sprites + Schriften (OpenFreeMap) ──
          // GLEICHER Cache-Name wie in Offlinekarte.jsx ("karten-offline"), damit sowohl
          // VORGELADENE als auch normal betrachtete Kacheln offline ausgeliefert werden.
          // Das ist die eigentlich fehlende Regel – ohne sie bleibt die Karte offline grau.
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "karten-offline",
              expiration: { maxEntries: 8000, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Satelliten-Kacheln (EOX Sentinel-2) ──
          {
            urlPattern: /^https:\/\/tiles\.maps\.eox\.at\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "karten-satellit",
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Wanderwege-Overlay (Waymarked Trails) ──
          {
            urlPattern: /^https:\/\/tile\.waymarkedtrails\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "karten-wege",
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Ortssuche (Photon) – zuletzt gesuchte Orte offline verfügbar ──
          {
            urlPattern: /^https:\/\/photon\.komoot\.io\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-geo",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Routing: OSRM (Auto) + BRouter (Fuß/Rad) – zuletzt berechnete Routen offline ──
          {
            urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-route",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/brouter\.de\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-route",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Höhen/Wetter (Open-Meteo) ──
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-meteo",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // ── Karten-Metadaten (Eurostat via jsDelivr) – wie bisher ──
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapdata",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
