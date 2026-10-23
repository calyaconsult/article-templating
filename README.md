# Blog Template Workflow

Dieses Repository enthält ein leichtgewichtiges, JavaScript-gestütztes Template-System zur dynamischen Erstellung und Anzeige von Blog-Beiträgen für **Calya Consult GmbH**.

---

## Übersicht

Das System ermöglicht das Schreiben von Blogposts in Markdown (`.md`) mit YAML-Front-Matter-Metadaten. Über das Template `src/article-template.html` und das Skript `js/fill-template.js` werden Artikelinhalte sowie Meta-Tags, Teaser und Archiv-Verlinkungen clientseitig im Browser gerendert.

### Projektstruktur

```
.
├── content/
│   └── article-template.md   # Vorlage für Blogbeiträge in Markdown
├── data/
│   └── all-teaser-content.json # Teaser Daten für bereits publizierte Beiträge
├── src/
│   └── article-template.html # HTML-Grundgerüst für Artikel
├── js/
│   └── fill-template.js      # Hauptskript zur Befüllung des Templates
└── images/
    └── dummy-image.jpg       # Platzhalterbilder für Artikel/Teaser
```

---

## Funktionsweise (`js/fill-template.js`)

Beim Laden einer HTML-Seite führt `fill-template.js` folgende Schritte aus:

1. **Artikel-Inhalt laden (`fillArticle`)**:
   - Bestimmt die Markdown-Quelle anhand des Dateinamens (z. B. `blogpost-YYYYMMDD-n.html` -> `blogpost-YYYYMMDD-n.md`) oder über das Meta-Tag `<meta name="article-source" content="...">`.
   - Lädt die `.md`-Datei ab und trennt Front-Matter-Metadaten vom Markdown-Fließtext.
   - Aktualisiert `<head>`-Metadaten (`title`, `description`, `author`, `robots`, `canonical`) sowie Header-Anzeigen.
   - Rendert das Markdown mittels `marked.js` und fügt den HTML-Code in das Element `#artikel-inhalt` (oder anstelle des Platzhalters `{{ARTIKEL_HAUPTINHALT}}`) ein.

2. **Teaser befüllen (`fillTeasers`)**:
   - Lädt optional Teaser-Daten aus `./data/all-teaser-content.json`.
   - Befüllt die Teaser-Karten (`#teaser-0`, `#teaser-1`) mit Überschriften, Texten, Daten und Links.

3. **Archivliste generieren (`fillArchive`)**:
   - Generiert automatisch eine chronologisch sortierte Liste vergangener Beiträge im Sidebar-Archiv (`#archiv-liste`).

---

## Front Matter Format

Blog-Dateien (`.md`) beginnen mit einem YAML-Front-Matter-Block:

```markdown
---
title: Titel des Artikels
kategorie: Beispiele
headline: Hauptüberschrift des Beitrags
description: Kurze Beschreibung für Suchmaschinen
author: Calya Consult GmbH
robots: index, follow
canonical: https://www.calyaconsult.ch/articles/blogpost-20261021-1.html
spitzmarke: Spitzmarke
untertitel: Untertitel für Teaser
teaserbild: images/dummy-image.jpg
teaserbild_alt: Alternative Beschreibung
---

Hier folgt der eigentliche Artikelinhalt im standardmäßigen Markdown-Format.
```

---

## Workflow: Neuen Blogpost erstellen

1. **Markdown-Datei erstellen**:
   - Neue Datei unter `content/` anlegen (z. B. `content/blogpost-20261021-1.md`).
   - Front Matter ausfüllen und den Artikeltext in Markdown verfassen.

2. **HTML-Seite erstellen**:
   - Kopie von `src/article-template.html` erstellen (z. B. `blogpost-20261021-1.html`).
   - Falls gewünscht, das Meta-Tag `<meta name="article-source" content="...">` anpassen oder sicherstellen, dass der HTML-Dateiname dem Schema `blogpost-YYYYMMDD-n.html` entspricht.

3. **Teaser & Archiv aktualisieren**:
   - Falls verwendet, neue Teasers in `./data/all-teaser-content.json` pflegen.

---

## Voraussetzungen

- Moderner Webbrowser mit JavaScript-Unterstützung.
- Ein lokaler Webserver (z. B. Live Server, `python -m http.server`), da `fetch()`-Anfragen für die Markdown- und JSON-Dateien über das HTTP(S)-Protokoll ausgeführt werden müssen.
