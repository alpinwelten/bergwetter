# Bergwetter Alpen

Schlichte, schnelle **PWA** fürs alpine Bergwetter – mit **Modell-Konsens** statt nur einer
Vorhersage: **Null-Grad-Grenze**, **Wind & Windchill**, **Gipfelwind nach Höhe** und ein
48‑h‑Verlauf. Optimiert für iPhone/iPad (installierbar, offline lauffähige Hülle).

**Live:** https://alpinwelten.github.io/bergwetter/

## Funktionen

- **Null-Grad-Grenze** (0 °C-Isotherme) als Konsens mehrerer Modelle – mit Streuungs-Ampel
  (enge Übereinstimmung → verlässlich, große Spanne → konservativ planen)
- **Wind & Windchill** mit Kompass, Beaufort und gefühlter Temperatur (JAG/TI-Formel)
- **Gipfelwind nach Höhe** auf den Druckflächen 850/700/500 hPa (≈ 1500/3000/5500 m, ICON-D2)
- **Modellvergleich** „jetzt" über alle Modelle (Temp, Wind, Böen, Null-Grad, Wetter)
- **Verlauf 48 h** (Null-Grad-Grenze + Temperatur) und **6-Tage-Trend**
- Ortssuche (Geocoding), GPS-Standort und **Favoriten** (lokal gespeichert)
- Installierbar & offline-fähige App-Hülle (Service Worker)

## Datenquellen / Modelle

Alles über [Open-Meteo](https://open-meteo.com) (kostenlos, kein API-Key, CORS-fähig):

| Modell | Anbieter | Auflösung |
|---|---|---|
| Best-Match | Open-Meteo (autom. bestes) | auto |
| ICON-D2 | DWD Deutschland | 2,2 km |
| AROME-HD | Météo-France | 1,3 km |
| ICON-CH1 | MeteoSwiss | 1 km |
| AROME-AT | GeoSphere Austria (ehem. ZAMG) | 2,5 km |

> Windchill nach JAG/TI-Formel (Environment Canada/NWS). Null-Grad-Grenze =
> Höhe der 0 °C-Isotherme. **Keine amtliche Warnung** – Eigenverantwortung am Berg.

## Struktur

```
index.html                       komplette App (Vanilla, build-free, Single-File)
manifest.webmanifest · sw.js     PWA (installierbar, offline-Hülle)
icons/icon.svg                   Icon-Quelle  →  tools/generate-icons.mjs (Headless-Chrome)
tools/make-qr.py                 QR-Code (qrcode + PIL)
qr-bergwetter*.png               QR-Code für iPhone/iPad
```

## Entwicklung

```bash
npm run icons            # PNG-Icons aus icons/icon.svg erzeugen
npm run qr               # QR-Codes erzeugen
python3 -m http.server   # lokal testen -> http://localhost:8000
```

## Deploy

GitHub Pages (Branch `main`, Root). Push genügt – die Seite aktualisiert sich automatisch.
