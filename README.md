# Youtube-Klima-Monitoring
Ein datenjournalistisches Projekt zur Analyse der Aufmerksamkeit für Klimathemen auf YouTube.

<h2>Projektübersicht</h2>
YouTube Klima Monitoring ist ein datenjournalistisches Webprojekt, das die Entwicklung von YouTube-Suchbegriffen mit Klimabezug analysiert.
Das System sammelt täglich Video-Daten über die YouTube Data API, speichert sie in einer MySQL-Datenbank und stellt sie über interaktive Diagramme und Tabellen dar.

Sowohl **Duell‑Vergleiche** zweier Begriffe als auch **Deep‑Dive‑Analysen** sowie **Top-Videos** zu einem einzelnen Suchbegriff sind möglich.

<strong>Ziel:</strong> Die öffentliche Aufmerksamkeit gegenüber Klimathemen über die Zeit sichtbar machen.

<strong>Projekt-Url:</strong> https://web-app-server.de/youtube-klima-monitoring/

<h2>Features</h2>

<h3>Daten-Erfassung (ETL)</h3>

- Läuft per Cronjob automatisch (PHP-CLI oder per URL)
- Für jeden Suchbegriff werden die aktuell Top 25 Videos geladen
- Speicherung von:
- Titel
- Views
- Likes
- Kommentare
- Sprache
- Veröffentlichungsdatum
- Video-ID

<h3>Web-Frontend</h3>

<strong>Modi:</strong>

<h4>Trendmodus („Zeitverlauf“)</h4>

- 2 Begriffe im Duel → 1 Metrik (Views/Likes/Kommentare)
- 1 Begriff im Deep-Dive → 3 Metriken gleichzeitig (Views, Likes, Comments)
- Dynamische Chart-Titel + Untertitel
- Zeitfilter: 7 / 14 / 30 Tage
Die Tabelle zeigt im Trendmodus alle Videos zum Begriff A im gewählten Zeitraum.

<h4>Top-Videos-Modus</h4>

- Zeigt die Top 10 Videos des Begriffs nach Views
- Horizontaler Bar-Chart
- Tabelle zeigt ebenfalls nur Top 10

<h4>Tabelle</h4>

- Sortierbar über alle Spalten (title, views, likes, comments, date, lang)
- Badges zeigen Top 1, Top 2, Top 3, … entsprechend der aktuellen Sortierung
- Klick auf eine Zeile öffnet die Video-Detailansicht im Modal

<h4>Video-Modal</h4>

<strong>Zeigt:</strong>

- Titel
- Embedded YouTube-Player
- Views, Likes, Comments
- Veröffentlichungsdatum
- Sprache
- Link direkt zum YouTube-Video

<h4>Dark Mode</h4>

- Persistenter Zustand via LocalStorage
- Umschaltbar im Header

<h4>Verwendete Technologien</h4>

- PHP 8+ (Backend, ETL, API-Endpoints)
- MySQL (Datenbank)
- Bootstrap 5.3
- Chart.js 4.4
- Vanilla JavaScript
- Cronjobs zur Automatisierung
