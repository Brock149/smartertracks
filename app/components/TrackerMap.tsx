import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface TrackerMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  /** Optional tool/tracker thumbnail rendered inside the pin (Life360 style). */
  thumbUrl?: string | null;
  height?: number;
  zoom?: number;
}

// A small, self-contained Leaflet map rendered inside a WebView. Uses free
// OpenStreetMap tiles and Leaflet from a CDN — no API key, no native modules,
// and the exact same look as the admin portal's react-leaflet map.
function buildHtml(lat: number, lng: number, zoom: number, thumbUrl?: string | null): string {
  const inner = thumbUrl
    ? `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; }
    .pin-wrap { position:relative; width:30px; height:30px; }
    .pin { width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid #2563eb;
           box-shadow:0 1px 4px rgba(0,0,0,.4);overflow:hidden; }
    .pin-tail { position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);
                width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
                border-top:8px solid #2563eb; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    var icon = L.divIcon({
      html: '<div class="pin-wrap"><div class="pin">${inner.replace(/'/g, "\\'")}</div><div class="pin-tail"></div></div>',
      className: 'tracker-pin', iconSize: [30,38], iconAnchor: [15,38]
    });
    L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
  </script>
</body>
</html>`;
}

export default function TrackerMap({
  latitude,
  longitude,
  thumbUrl,
  height = 180,
  zoom = 15,
}: TrackerMapProps) {
  if (latitude == null || longitude == null) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>No GPS location yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: buildHtml(latitude, longitude, zoom, thumbUrl) }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  placeholder: {
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
