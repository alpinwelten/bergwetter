# Bergwetter Alpen

Schlichte, schnelle **PWA** fürs alpine Bergwetter mit **Modellvergleich**, **Null-Grad-Grenze**,
**Wind & Windchill** sowie einem 48-h-Verlauf. Optimiert für iPhone/iPad.

**Live:** https://alpinwelten.github.io/bergwetter/

## Funktionen und Grenzen

- **Null-Grad-Grenze:** Mittelwert verfügbarer konkreter Modelle mit Streuungsanzeige.
  Best-Match dient nur als Ersatz, wenn kein konkretes Modell einen Wert liefert.
  Bei einem Einzelwert ist kein Vergleich möglich.
- **Modellübereinstimmung:** aktuelle Temperaturspanne und Niederschlag in den nächsten
  zwölf Stunden. Fehlende Daten gelten nicht als trocken. Niederschlagsschwelle:
  0,2 mm/h oder Niederschlags-Wettercode. Wind und Böen fließen nicht in die Bewertung ein.
  Übereinstimmung ist keine Garantie für Vorhersagequalität; Modelle sind nicht zwingend unabhängig.
- **Schneefallgrenze:** grobe Schätzung aus Null-Grad-Grenze minus 250 m.
  Nur bei Niederschlag relevant; keine sichere Aussage zur Niederschlagsart am Standort.
- **Wind & Windchill:** 10-m-Wind, Böen, Kompass, Beaufort und gefühlte Temperatur.
- **48-h-Verlauf** mit antippbaren Stundendetails und **6-Tage-Trend** (Best-Match).
- **Ortssuche und Favoriten**, lokal gespeichert.
- **Installierbare App-Hülle:** offline ladbar, Wetterdaten benötigen eine Internetverbindung.
  Vorhersagen werden nicht offline gespeichert.

GPS-Ortung und Höhenwind auf Druckflächen sind derzeit nicht implementiert.

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
npm test                # Regressionstests für Modellvergleich und Schätzungen
python3 -m http.server   # lokal testen -> http://localhost:8000
```

## Deploy

GitHub Pages (Branch `main`, Root). Push genügt – die Seite aktualisiert sich automatisch.
