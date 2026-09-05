# Bergwetter Alpen

Schlichte, schnelle **PWA** fürs alpine Bergwetter mit **Modellvergleich**, **Null-Grad-Grenze**,
**Wind & Windchill** sowie einem 48-h-Verlauf. Optimiert für iPhone/iPad.

**Live:** https://alpinwelten.github.io/bergwetter/

## Funktionen und Grenzen

- **Null-Grad-Grenze:** Mittelwert verfügbarer konkreter Modelle mit Streuungsanzeige.
  Best-Match dient nur als Ersatz, wenn kein konkretes Modell einen Wert liefert.
  Bei einem Einzelwert ist kein Vergleich möglich.
- **Modellübereinstimmung:** aktuelle Temperaturspanne und Niederschlag in den nächsten
  zwölf Stunden ab der aktuellen vollen Stunde (Stundensummen an den folgenden
  zwölf Zeitstempeln). Fehlende Daten gelten nicht als trocken. Niederschlagsschwelle:
  0,2 mm/h oder Niederschlags-Wettercode. Wind und Böen fließen nicht in die Bewertung ein.
  Übereinstimmung ist keine Garantie für Vorhersagequalität; Modelle sind nicht zwingend unabhängig.
- **Schneefallgrenze:** grobe Schätzung aus Null-Grad-Grenze minus 250 m.
  Nur bei Niederschlag relevant; keine sichere Aussage zur Niederschlagsart am Standort.
- **Wind & Windchill:** 10-m-Wind, Böen, Kompass, Beaufort und gefühlte Temperatur.
- **48-h-Verlauf** mit antippbaren Stundendetails und **6-Tage-Trend** (Best-Match).
- **Zielpunkt und Zielhöhe:** WGS84-Koordinaten und Höhe manuell eingeben oder aus
  Ortssuche/Schnellauswahl übernehmen. Bekannte Höhe wird explizit als `elevation`
  angefragt; leere Höhe nutzt Open-Meteos Geländemodell. Zielhöhe, Herkunft und
  zurückgegebene API-Bezugshöhe werden getrennt angezeigt. Abweichungen ab 1 m
  werden genannt (technischer Vergleich, keine Genauigkeitstoleranz).
- **Datenstand:** Abrufzeit, Abrufalter, Gültigkeitszeit und zuletzt verfügbarer
  Modelllauf getrennt. Zeitrechnung intern in UTC-Unixsekunden; Darstellung mit
  Datum, Ortszeitzone und UTC-Offset, auch bei Sommerzeitwechsel. Anzeigealter und
  aktuelle Prognosestunde werden minütlich aktualisiert, ohne Wetter neu abzurufen.
- **Datenabdeckung:** endliche Werte je Variable in der aktuellen Stunde und
  vollständige zwölf Stunden ab dieser Stunde; Best-Match zählt separat. Details
  zeigen verfügbare Stunden und den letzten Wert pro Modell/Variable, auch bei Lücken.
- **Ortssuche und Favoriten**, lokal gespeichert einschließlich Höhe und Herkunft.
  Unterschiedliche Höhen am selben Punkt können getrennt favorisiert werden.
- **Installierbare App-Hülle:** offline ladbar, Wetterdaten benötigen eine Internetverbindung.
  Vorhersagen werden nicht offline gespeichert.

GPS-Ortung und Höhenwind auf Druckflächen sind derzeit nicht implementiert.

## Datenquellen / Modelle

Über [Open-Meteo](https://open-meteo.com): Die hier verwendete öffentliche API
benötigt keinen Schlüssel und ist nur für nichtkommerzielle Nutzung kostenlos.
Die Daten stehen unter CC BY 4.0; die Bedingungen des gehosteten Dienstes gelten
zusätzlich. Kommerzielle Nutzung benötigt einen geeigneten Tarif, Ensemblezugriff
laut aktueller Preisseite Professional oder höher. Ein kostenpflichtiger Schlüssel
gehört nicht in die öffentlich ausgelieferte PWA.
[Preise und Nutzungsumfang](https://open-meteo.com/en/pricing), geprüft 05.09.2026.

Verwendete Modelle:

| Modell | Anbieter | Auflösung |
|---|---|---|
| Best-Match | Open-Meteo (autom. bestes) | auto |
| ICON-D2 | DWD Deutschland | 2,2 km |
| AROME-HD | Météo-France | 1,3 km |
| ICON-CH1 | MeteoSwiss | 1 km |
| AROME-AT | GeoSphere Austria (ehem. ZAMG) | 2,5 km |

> Windchill nach JAG/TI-Formel (Environment Canada/NWS). Null-Grad-Grenze =
> Höhe der 0 °C-Isotherme. **Keine amtliche Warnung** – Eigenverantwortung am Berg.

## Höhen- und Zeitreferenz: Grenzen und Quellen

Die Zielhöhe verschiebt die Koordinaten nicht. Eine Höhenänderung am Talort ersetzt
keinen korrekten Gipfelpunkt. Statistisches Downscaling ist keine explizite Auflösung
von Gratbeschleunigung, Föhn oder Inversionen. Die API-Bezugshöhe ist keine Angabe
der ursprünglichen Modellorografie. Wind bleibt 10-m-Wind, kein Höhenwind auf Druckflächen.

- [Forecast-API](https://open-meteo.com/en/docs): `/v1/forecast`, `elevation`,
  `timeformat=unixtime`, `timezone=auto`. Eine vergangene Prognosestunde wird nicht
  als aktuell weitergeführt. Niederschlag ist die Summe der vorangegangenen Stunde;
  das zwölfstündige Niederschlagsfenster verwendet die folgenden zwölf Zeitstempel,
  sodass keine vollständig vorangegangene Stunde als Zukunft gewertet wird.
  Die Abdeckungstabelle zählt dagegen Werte ab dem aktuellen Zeitstempel, wie dort beschriftet.
- [Modell-Metadaten](https://open-meteo.com/en/docs/model-updates):
  `https://api.open-meteo.com/data/{domain}/static/meta.json` für `dwd_icon_d2`,
  `meteofrance_arome_france_hd`, `meteoswiss_icon_ch1`, `geosphere_arome_austria`.
  Metadaten werden unabhängig von der Prognose geladen (6 s Timeout), im Speicher
  zehn Minuten wiederverwendet und bei Abrufproblemen als unbekannt behandelt.
  `last_run_initialisation_time` bestimmt das angezeigte Laufalter, nicht die
  Abrufzeit und nicht `generationtime_ms`. Bereitstellungen innerhalb der letzten
  zehn Minuten werden als möglicherweise noch laufend gekennzeichnet. Liegt die
  letzte Bereitstellung länger als `update_interval_seconds` plus 20 Minuten zurück,
  wird eine mögliche Verzögerung genannt. Das ist ein Betriebshinweis, keine
  meteorologische Qualitätsbewertung.

Die Metadaten nennen den zuletzt verfügbaren Lauf des Anbieters. Sie belegen nicht,
dass jeder angezeigte Wert diesem Lauf entstammt; Best-Match kombiniert Modelle und
zeigt deshalb keinen einzelnen Lauf. Modellanzahl und Abdeckung sind keine Aussage
über Unabhängigkeit oder Prognosegenauigkeit. Keine automatische Stationskorrektur.

## Stationsmessungen und Ensembleprognosen

Beide Zusatzdienste laden unabhängig von der Kernprognose. Ausfälle oder fehlende
regionale Abdeckung erscheinen in der jeweiligen Karte, ohne die anderen Wetterdaten
zu blockieren. Neue Zielpunkte verwerfen verspätete Antworten früherer Abrufe.

### Stationsmessungen Österreich / Schweiz

- Bis zu zwölf Stationskandidaten innerhalb 100 km, sortiert nach
  `Entfernung_km / 20 + abs(Höhendifferenz_m) / 400`. Das ist eine offengelegte
  Auswahlheuristik, kein meteorologischer Repräsentativitätsnachweis. Ohne Zielhöhe
  wird nur nach Entfernung sortiert. Die API-Bezugshöhe ist die Zielhöhe für diese Auswahl.
- Station manuell auswählbar. Höhe, Entfernung, Höhendifferenz, Exposition soweit
  dokumentiert, Messzeit, Messalter und ursprünglicher Abrufzeitpunkt sind sichtbar.
- TAWES: Temperatur, Windmittel, Windspitze und Niederschlag im Zehnminutenraster;
  Wind wird von m/s in km/h umgerechnet. Daten sind ungeprüfte Rohdaten.
- SwissMetNet: aktuelle Sammeldatei mit Zehnminutenmessungen; Wind bereits km/h,
  Böe als 1-s-Spitze im Messintervall. Stationsmetadaten werden mit Windows-1252
  dekodiert. Exposition stammt aus den offiziellen Stationsmetadaten.
- Fehlende Messwerte bleiben fehlend. Älter als 30 Minuten wird als „veraltet“
  gekennzeichnet; zukünftige Zeitstempel als unplausibel. Keine automatische
  Übertragung von Stationswerten auf Zielhöhe und keine Prognosekorrektur.
- Stationsverzeichnisse bis 24 h, Messantworten bis zehn Minuten im Arbeitsspeicher
  wiederverwendet. Ursprüngliche Abrufzeit bleibt bei Cache-Nutzung erhalten.
  Zwölf Sekunden Anfrage-Timeout. Kein Offline-Messwertspeicher.

Quellen (geprüft 05.09.2026):
[TAWES-Dokumentation](https://dataset.api.hub.geosphere.at/v1/docs/getting-started.html),
[TAWES-Rohdaten / CC BY 4.0](https://data.hub.geosphere.at/en/dataset/tawes-v1-10min?lang=en),
[GeoSphere Nutzungsbedingungen](https://data.hub.geosphere.at/en/legal),
[GeoSphere API-Limits](https://data.hub.geosphere.at/en/showcase/api-grundlagen-?lang=en),
[SwissMetNet-Dokumentation](https://opendatadocs.meteoswiss.ch/de/a-data-groundbased/a1-automatic-weather-stations),
[MeteoSchweiz Nutzungsbedingungen](https://opendatadocs.meteoswiss.ch/de/general/terms-of-use).
GeoSphere: 5 Requests/s und 240/h laut Dokumentation. Beide Datensätze CC BY 4.0;
Quellennennung in den Messkarten. Keine zugesicherte Verfügbarkeit.

### ICON-D2-EPS

- Ein regionales Ensemble mit 20 Mitgliedern einschließlich Kontrollmitglied,
  keine Vermischung mit den deterministischen Modellen der Übereinstimmungskarte.
- Temperatur: empirische P10/Median/P90 je Stunde, linear zwischen Rangwerten
  interpoliert. Bei weniger als zwei Mitgliedern keine Bandbreite; Anzahl sichtbar.
- Niederschlag: Mitgliederanteil ab 0,2 mm/h. Böen: Anteil über einer wählbaren
  Schwelle 30–100 km/h, initial 60 km/h. Schwelle ist keine Sicherheitsgrenze.
- Zusätzlich Anteil der Mitglieder mit mindestens einer Überschreitung innerhalb
  des explizit beschrifteten Zwölfstundenfensters. Ein Mitglied benötigt dafür alle
  zwölf fortlaufenden Stunden. Prozente nur bei 20 gültigen Mitgliedern, sonst Lücke.
- Bis 48 kommende Stunden anzeigen, soweit geliefert; kürzere Datenhorizonte bleiben
  sichtbar. Angefragt werden drei Kalendertage, damit Mitternacht den abrufbaren
  Zeitraum nicht künstlich verkürzt. Das verlängert den Modellhorizont nicht.
- P10–P90 ist kein garantierter Wetterbereich; Anteile sind unkalibrierte
  Ensemblehäufigkeiten. Gemeinsame Modellfehler und lokale Exposition bleiben Grenzen.
- API-Bezugshöhe, ursprüngliche Abrufzeit und Abrufalter werden gezeigt. Der konkrete
  Lauf der gelieferten Mitglieder bleibt unbekannt. Zehn Minuten In-Memory-Cache.

[Ensemble-API und Modellumfang](https://open-meteo.com/en/docs/ensemble-api).
Kein neues Backend, kein zusätzlicher API-Schlüssel. Der Open-Meteo-Nutzungsumfang
oben gilt auch für Ensembles. Berufliche Nutzung erfordert eine passende Lizenz.

## Validierung der Erweiterungen

`npm test`: 32 Tests, darunter fehlende/verkürzte Daten, Wind-Einheiten, CSV,
Cache-Abrufalter, Zeitumstellung, verspätete Antworten und Niederschlagsfenster.
Live-Browsertest mit Patscherkofel/TAWES und Jungfraujoch/SwissMetNet, jeweils
ICON-D2-EPS (61 Felder: Zeit plus drei Variablen × 20 Mitglieder). Simulierte Ausfälle
der Zusatzdienste blockieren die Kernprognose nicht. Mobile Ansicht und Dark Mode
geprüft. Kein physischer iOS-Installationstest und kein meteorologischer Gütevergleich.

## Struktur

```
index.html                       Kernprognose, Zielpunkte und Datenstand (Vanilla, build-free)
alpine-data.js                   Stationsadapter, Caches, Ensembleauswertung
alpine-ui.js                     Mess- und Ensemblekarten
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
