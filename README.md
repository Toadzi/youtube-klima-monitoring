# Youtube-Klima-Monitoring

Ein datenjournalistisches Projekt zur Analyse der Aufmerksamkeit für Klimathemen auf YouTube.

---

## Projektübersicht

YouTube Klima Monitoring ist ein datenjournalistisches Webprojekt, das die Entwicklung von YouTube-Suchbegriffen mit Klimabezug analysiert.  
Das System sammelt täglich Video-Daten über die YouTube Data API, speichert sie in einer MySQL-Datenbank und stellt sie über interaktive Diagramme und Tabellen dar.

Sowohl Duell-Vergleiche zweier Begriffe als auch Deep-Dive-Analysen sowie Top-Videos zu einem einzelnen Suchbegriff sind möglich.

**Ziel:**  
Die öffentliche Aufmerksamkeit gegenüber Klimathemen über die Zeit sichtbar machen.

**Projekt-URL:**  
https://web-app-server.de/youtube-klima-monitoring/

---

## Learnings

In früheren Projekten habe ich häufig JavaScript-Frameworks wie jQuery eingesetzt.  
In diesem Projekt habe ich bewusst darauf verzichtet, um:

- die Grundlagen von Vanilla JavaScript zu vertiefen
- DOM-Manipulation, Events und State-Handling selbst umzusetzen
- ein besseres Verständnis für moderne Browser-APIs zu gewinnen

Das Projekt soll auch zeigen, dass auch ohne große Frameworks komplexe, interaktive Webanwendungen realisierbar sind.

---

## Schwierigkeiten

### ETL-Prozess & Cronjob-Betrieb

- Der automatisierte ETL-Prozess (`etl.php`) war stark vom Serverumfeld abhängig.
- Nach einem Server-Neuaufsetzen durch den Hosting-Provider funktionierte der bestehende Cronjob nicht mehr.
- Ursache waren u. a.:
  - geänderte PHP-Pfade
  - fehlender Shebang (`#!/usr/bin/php`)
  - veränderte Ausführungsrechte
  - abweichende PHP-Versionen
- Lösung:
  - Anpassung des Skripts für CLI-Ausführung
  - explizite Pfaddefinitionen
  - Test des Skripts per SSH
- Diese Erfahrung zeigte mir deutlich den Unterschied zwischen lokaler Entwicklung, Web-Ausführung und CLI/Cron-Kontext.

### Zeitreihen-Logik

- korrekte Aggregation täglicher Statistiken
- Umgang mit fehlenden oder verspätet erfassten Tagen
- Synchronisierung von Zeitachsen bei Vergleichsdiagrammen

### Chart.js & Responsivität

- Performance-Probleme bei hoher Auflösung
- Umgang mit Canvas-Größe, Device Pixel Ratio und Resize-Events

### UX-Logik

- sinnvolle Kombination von Modus, Ansicht und Filteroptionen
- konsistente Darstellung von Diagrammen und Tabellen

---

## Verwendung von KI

### Unterstützung beim ETL-Prozess

- Strukturierung des ETL-Workflow
- SQL-Abfragen und PHP-Skripte zu überprüfen und zu optimieren
- typische Fehlerquellen zu beheben, insbesondere bei dem Cronjob und der Ausführung über CLI
- bei der Anpassung an die Serverumgebung habe ich ein paar sehr wichtige Debugging-Hinweise bekommen

### Unterstützung bei JavaScript

Da ich bewusst auf JavaScript-Frameworks wie jQuery verzichtet habe, diente mir die KI als Sparringspartner bei der Umsetzung komplexer UI-Logiken wie:

- Event-Handling
- State-Management
- DOM-Manipulationen ohne Frameworks

Und unterstützte mich beim Debugging von:

- Chart.js Interaktionen
- Responsivität
- bla blub

Die KI lieferte mir dabei Vorschläge, Erklärungen und alternative Ansätze.  
Insbesondere half die KI mir dabei:

- komplexe Probleme besser zu analysieren
- verschiedene Lösungswege abzuwägen

---

## Verwendete Technologien

- PHP 8+ (Backend, ETL, API-Endpoints)
- MySQL (Datenbank)
- Bootstrap 5.3
- Chart.js 4.4
- Vanilla JavaScript
- Cronjobs zur Automatisierung

---

## Features

### Daten-Erfassung (ETL)

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

### Web-Frontend

#### Modi

**Trendmodus („Zeitverlauf“)**

- 2 Begriffe im Duel → 1 Metrik (Views / Likes / Kommentare)
- 1 Begriff im Deep-Dive → 3 Metriken gleichzeitig (Views, Likes, Comments)
- Dynamische Chart-Titel + Untertitel
- Zeitfilter: 7 / 14 / 30 Tage  
- Die Tabelle zeigt im Trendmodus alle Videos zum Begriff A im gewählten Zeitraum.

**Top-Videos-Modus**

- Zeigt die Top 10 Videos des Begriffs nach Views
- Horizontaler Bar-Chart
- Tabelle zeigt ebenfalls nur Top 10

### Tabelle

- Sortierbar über alle Spalten (title, views, likes, comments, date, lang)
- Badges zeigen Top 1, Top 2, Top 3, … entsprechend der aktuellen Sortierung
- Klick auf eine Zeile öffnet die Video-Detailansicht im Modal

### Video-Modal

Zeigt:

- Titel
- Embedded YouTube-Player
- Views, Likes, Comments
- Veröffentlichungsdatum
- Sprache
- Link direkt zum YouTube-Video

### Dark Mode

- Persistenter Zustand via LocalStorage
- Umschaltbar im Header
