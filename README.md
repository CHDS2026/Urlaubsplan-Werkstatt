# Urlaubsplaner

Eine installierbare Reise-Planungs-App (PWA) – Tag für Tag planen mit Spots, Budget, Packliste und Anreise. Läuft offline, komplett ohne KI und ohne laufende Kosten. Aufgebaut wie die Trainingsplan-Werkstatt: Vite + React + vite-plugin-pwa, Daten lokal im Browser (IndexedDB via Dexie).

## Was die App kann

- **Tage** – automatisch aus dem Reisezeitraum erzeugt; pro Tag Motto, Wetter-Eignung, Programmpunkte mit Uhrzeit, Fahrzeit, Priorität, Kosten und Notizen. Umsortieren per Pfeilen oder Drag & Drop.
- **Übersicht** – kompakte Timeline über alle Tage auf einen Blick.
- **Ideen** – Ideen-Pool pro Kategorie. Für viele Regionen (Tirol, Südtirol, Gardasee, Teneriffa, Schwarzwald, Harz, Mallorca, Amsterdam …) sind **fertige Vorschläge** hinterlegt, die du per Tipp übernehmen und einem Tag zuweisen kannst.
- **Budget** – geplante Kosten **und** tatsächliche Kosten (Soll/Ist) mit Differenz, Aufschlüsselung nach Kategorien.
- **Packen** – Checkliste mit automatischem Vorschlag je nach Reisezeit, Anreiseart und Aktivitäten.
- **Anreise** – Zug (Deeplink zur Bahn-Auskunft), Auto (Spritrechner + Route auf Google Maps) oder Flug (Direktlinks zu Lufthansa, Eurowings, TUI fly).
- **Unterkunft** – Name, Adresse, Check-in/out, Link zu Google Maps.
- **Sicheres Datum-Verschieben** – änderst du „Von", wandert die ganze Reise mit; verkürzt du hinten, landen betroffene Punkte in den „Ideen" statt gelöscht zu werden.
- **Dark Mode**, **Backup** (Export/Import als JSON) und **Text-Export** der ganzen Reise.

## Lokal starten

Voraussetzung: Node.js 18+ (empfohlen 20+).

```bash
npm install
npm run dev
```

Vite zeigt dir eine lokale Adresse (meist `http://localhost:5173`). Dort läuft die App im Browser.

## Produktions-Build (lokal prüfen)

```bash
npm run build      # erzeugt den Ordner dist/
npm run preview    # dient dist/ lokal aus, zum Gegenchecken
```

> Hinweis: Ich konnte den Build in meiner Umgebung nicht selbst ausführen (kein Netzwerkzugriff für `npm install`). Die Syntax aller Dateien ist mit dem Node-Parser geprüft. Der erste echte Build passiert also bei dir – falls etwas hakt, schick mir die Fehlermeldung.

## Auf Cloudflare Pages veröffentlichen (wie Trainingsplan)

1. **Zu GitHub pushen** – in dein Repo `captainhero-ds/CHDS2026` (oder ein neues Repo):
   ```bash
   git init
   git add .
   git commit -m "Urlaubsplaner PWA"
   git branch -M main
   git remote add origin https://github.com/captainhero-ds/<REPO>.git
   git push -u origin main
   ```
2. **Cloudflare Dashboard** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Dein Repository auswählen.
4. **Build-Einstellungen:**
   - Framework preset: **Vite** (oder „None")
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. **Save and Deploy.** Cloudflare installiert die Abhängigkeiten, baut das Projekt und veröffentlicht es unter `<projektname>.pages.dev`.

Ab dann wird bei **jedem Push** automatisch neu gebaut und deployt.

### Falls der Build auf Cloudflare wegen der Node-Version scheitert
In den Pages-Projekt-Einstellungen unter **Settings → Environment variables** eine Variable setzen:
`NODE_VERSION = 20`

## Als App aufs Handy (ohne App-Store)

Seite in Safari (iPhone) bzw. Chrome (Android) öffnen → Teilen/Menü → **„Zum Startbildschirm hinzufügen"**. Danach liegt das Icon wie eine echte App auf dem Homescreen, startet im Vollbild und funktioniert offline.

## Technik

- **Vite 6**, **React 18**
- **vite-plugin-pwa** (Service Worker, Auto-Update, Web-App-Manifest)
- **Dexie** (IndexedDB) für lokale Speicherung – alle Daten bleiben auf dem Gerät
- **Tailwind CSS** (Dark Mode über `class`)
- **lucide-react** für Icons

## Projektstruktur

```
urlaubsplaner/
├─ index.html
├─ package.json
├─ vite.config.js         # PWA-Manifest & Icons
├─ tailwind.config.js
├─ postcss.config.js
├─ public/                # App-Icons (192/512/maskable/apple-touch)
└─ src/
   ├─ main.jsx            # Einstieg, Theme laden
   ├─ App.jsx             # gesamte App-Logik & UI
   ├─ index.css           # Tailwind + Dark-Mode-Overrides
   ├─ db.js               # Dexie-Speicher
   └─ data/suggestions.js # kuratierte Spot-Vorschläge & Packlisten
```

## Eigene Vorschläge ergänzen

In `src/data/suggestions.js` unter `SUGGESTIONS` eine neue Region nach dem gleichen Muster hinzufügen und – falls nötig – in `ALIASES` einen Suchbegriff darauf zeigen lassen. Kategorien: `sehenswuerdigkeit`, `fotospot`, `aussicht`, `wanderung`, `restaurant`, `hotel`.

## Ehrliche Grenzen

- Keine Live-Daten: Wetter, echte Fahrzeiten, Öffnungszeiten und Wander-Tracks sind **nicht** enthalten (das würde laufende Kosten/KI bedeuten). Fahrzeiten trägst du selbst ein bzw. liest sie über den Maps-Link ab.
- Der Bahn-Deeplink kann je nach bahn.de-Änderungen mal auf die Startseite führen – dann Strecke/Datum kurz manuell eingeben.
- Airline-Seiten lassen sich nicht vorbefüllen; Strecke und Datum dort eingeben.
- Drag & Drop über weit entfernte, nicht sichtbare Tage ist fummelig – dafür gibt es die Zuweisung per Dropdown in den „Ideen".
