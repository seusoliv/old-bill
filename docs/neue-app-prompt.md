# Prompt-Paket: Neue Abrechnungs-App „EasyBill“ (Nachfolger von BillKiller)

> **So verwendest du dieses Dokument**
>
> 1. Lege ein **neues, leeres Repository** an (z. B. `easy-bill`). Das alte System wird weder kopiert noch referenziert. Alle Funktionen, Regeln und Datenformate stehen vollständig in diesem Dokument.
> 2. Starte für **jeden Meilenstein eine eigene Claude-Code-Session** (eigener Agent, frischer Kontext).
> 3. Gib jedem Agenten **immer zuerst Teil A (Gemeinsamer Kontext)** und danach **genau einen Meilenstein aus Teil B**.
> 4. Halte die Reihenfolge laut Abhängigkeitsgraph ein. Meilensteine in derselben Zeile können parallel laufen (dann jeweils in einem eigenen Branch/Worktree).
> 5. Jeder Agent beendet seine Arbeit mit grünen Tests, einem aktualisierten `docs/PROGRESS.md` und einem Commit. Der nächste Agent baut darauf auf.

```
M0 ─┬─► M1 ─► M2 ─► M3 ─┬─► M4 ─► M5 ─┬─► M6
    │                   │             ├─► M7
    └─► M0b ────────────┘             │
                        └─► M8 ───────┴─► M9 ─► M10a/b/c/d ─► M11 (optional) ─► M12
```
(M0b, also Design-System und UX, läuft nach M0 parallel zu M1–M3 und muss vor M4 fertig sein. M8 kann nach M3 parallel zu M4/M5 laufen. M6 und M7 können parallel laufen.)

---

## TEIL A – Gemeinsamer Kontext (jedem Agenten mitgeben)

### A.1 Ziel

Du baust **EasyBill**, eine deutschsprachige Rechnungs-PWA für Selbstständige und Kleinunternehmer, **in einem neuen Repository und komplett neu**. Sie ersetzt die bisherige App „BillKiller“. Auf das alte System hast du keinen Zugriff, und du brauchst ihn auch nicht.

**Vom Altsystem übernommen wird nur der Funktionsumfang, und der ist in A.2 vollständig beschrieben.** Code, Struktur und Look & Feel werden nicht übernommen. EasyBill bekommt ein neues, modernes UI/UX-Konzept (A.7). Die einzige Verbindung zum Altsystem ist der Import seiner JSON-Backups (Format in M7).

Die Architektur ändert sich wie folgt:

| Bisher (BillKiller) | Neu |
|---|---|
| Daten in IndexedDB (Browser) oder SQLite (lokales Backend) | Daten in einer **bereits vorhandenen MongoDB** (Verbindung per `MONGODB_URI`) |
| PDFs auf dem Server unter `FILE_SAVE_LOCATION/<nr>/…` | PDFs **nur auf dem PC des Users**, in einem Ordner, den er in den User-Settings wählt (File System Access API). Der Server **speichert keine PDFs**. |
| Kein Login | **Benutzerverwaltung**: Login, MFA, Admin legt User an. **Jeder User hat komplett eigene Daten.** |
| Firmendaten/Texte/SMTP in `.env` | Firmendaten, Textvorlagen und SMTP-Daten **pro User in den Settings** |
| MCP über stdio/HTTP ohne Auth | **Remote-MCP-Server (Streamable HTTP) mit OAuth 2.1**, nutzbar von Claude, ChatGPT, Cursor, VS Code usw. |
| – | **Import** alter JSON-Backups über die User-Settings |
| – | Zusätzliche Features: Angebote, Mahnwesen, Zahlungseingänge, Storno, wiederkehrende Rechnungen, USt-Modus, DATEV/CSV-Export, DSGVO-Export, optional E-Rechnung |

### A.2 Funktionsumfang (vollständige fachliche Spezifikation)

Dieser Abschnitt beschreibt **abschließend**, welche Funktionen EasyBill mindestens haben muss. Er ist die einzige fachliche Quelle; **es gibt keinen Zugriff auf das alte System und keinen Code daraus**. Wie die Funktionen aussehen und bedient werden, legen A.7 und M0b fest.

**Stammdaten**
- **Kunden:** Vorname, Nachname, E-Mail (optional), Straße, Hausnummer, PLZ, Ort. Funktionen: anlegen, bearbeiten, löschen (nur ohne Rechnungen, sonst archivieren), Suche über Name und Ort mit Pagination.
  - **Excel-Import (XLSX):** erstes Tabellenblatt, Kopfzeile mit den Spalten `Vorname`, `Nachname`, `Straße`, `HausNr`, `PLZ`, `Ort`, `Mail` (optional). Jede Zeile wird ein neuer Kunde. Fehlerhafte Zeilen werden übersprungen und im Ergebnis aufgelistet.
- **Artikel (Leistungen/Produkte):** Bezeichnung, Artikelnummer (eindeutig pro User), Einheit (`HOUR` = Stunde, `PIECE` = Stück), Preis, `isFlexPrice` (Preis wird pro Auftrag frei eingegeben), Zusatzinformation (optional). Funktionen: anlegen, bearbeiten, löschen, alle löschen (mit Bestätigung), Suche, Filter nach Einheit, Lookup per Artikelnummer.
  - In der alten App gab es Artikel mit `isNegativePosition`. **Fachlich waren das immer eingelöste Gutscheine.** In EasyBill gibt es keine Negativpositionen mehr. Sie werden durch die Gutscheinverwaltung ersetzt (siehe „Gutscheine“).
  - **Excel-Import (XLSX):** erstes Tabellenblatt mit den Spalten `Artikelbezeichnung`, `Artikelnummer`, `Preis`. Einheit ist Stück, `isFlexPrice` ist `false`. Gibt es die Artikelnummer schon, wird der Artikel aktualisiert, sonst neu angelegt.

**Aufträge und Rechnungen**
- **Auftrag:** Kunde (Name wird für Listen denormalisiert), Positionen, optionaler Gesamtrabatt in %, Erstellungsdatum, Notizen. Funktionen: anlegen, bearbeiten, löschen (nur solange keine Rechnung ausgestellt ist), Suche über Kundenname und Nummer. Filter (kombinierbar): Kunde, Status, Erstellungszeitraum (tagesgenau, inklusive), „nur überfällige“.
- **Position:** Bezeichnung, Menge (Dezimalzahl erlaubt, z. B. 1,5 Stunden; max. 3 Nachkommastellen), Einzelpreis, Einheit, optionaler Positionsrabatt in %, `isFlexPrice`. Positionen werden aus einem Artikel übernommen (Werte vorbelegt, Flex-Preis editierbar) oder frei erfasst.
- **Status:** Der Lebenszyklus `Neu → Rechnung erstellt → per Mail verschickt → bezahlt` bleibt fachlich erhalten. Im neuen Modell wird er auf Auftrag und Rechnung verteilt (M1): ausgestellt, versendet, teilweise oder vollständig bezahlt, storniert, überfällig.
- **Fälligkeit:** Rechnungsdatum + Zahlungsziel (bisher fest 14 Tage, künftig in den Settings einstellbar; Default 14). „Überfällig“ heißt: Fälligkeitsdatum ist überschritten und die Rechnung ist nicht vollständig bezahlt.
- **Bezahlt-Datum:** Wird gesetzt, wenn die Rechnung vollständig bezahlt ist. Es ist maßgeblich für Umsatz- und Steuerauswertungen.

**Preisberechnung** (neu implementieren in Integer-Cent, kaufmännisch runden, half-up)
- Positionsbetrag = `Einzelpreis × Menge × (100 − Positionsrabatt) / 100`. Ohne Rabatt entfällt der Faktor.
- Zwischensumme = Summe aller Positionsbeträge.
- Gesamtbetrag = `Zwischensumme × (100 − Gesamtrabatt) / 100`; ohne Gesamtrabatt gleich der Zwischensumme.
- Rundung auf Cent pro Positionsbetrag und einmal beim Gesamtbetrag. Steuern kommen im Modus `STANDARD` hinzu (M1).
- Pflicht-Testfälle:

  | Fall | Eingabe | Erwartung |
  |---|---|---|
  | einfach | 3 × 10,00 € | 30,00 € |
  | Positionsrabatt | 2 × 50,00 €, 10 % | 90,00 € |
  | Gesamtrabatt | Positionen 30,00 + 90,00, Gesamtrabatt 5 % | Zwischensumme 120,00 €, Gesamt 114,00 € |
  | Gutschein | wie oben, Gutschein 20,00 € eingelöst | Gesamt 114,00 €, abzgl. Gutschein 20,00 €, zu zahlen 94,00 € |
  | Gutschein > Betrag | Gesamt 15,00 €, Gutschein 20,00 € | zu zahlen 0,00 €, Restguthaben 5,00 € |

  Hinweis zur Abweichung vom Altsystem: Dort zog der Gesamtrabatt auch den Gutschein mit ab (Fall 4 ergab dort 95,00 € statt 94,00 €). Das war fachlich falsch. Ein Gutschein wird **nie** rabattiert.
  | Rundung | 3 × 33,33 €, 10 % Positionsrabatt | 89,99 € (aus 89,991) |
  | Stunden | 1,5 h × 80,00 € | 120,00 € |

**Rechnungs-PDF** (Inhalte; das Design ist neu, siehe M0b/M5)
- Logo, Firmenblock (Name, Straße, PLZ, Ort, Telefon), Anschrift des Kunden, Titel „Rechnung“, Einleitungstext aus der Vorlage mit Platzhaltern, Rechnungsnummer, Rechnungsdatum, Kundennummer, Fälligkeitsdatum.
- Positionstabelle (Pos., Artikel, Menge, Rabatt nur wenn mindestens eine Position einen Rabatt hat, Einzelpreis, Gesamtpreis), Summenblock (Zwischensumme und Rabatt nur bei Gesamtrabatt, dann Gesamtbetrag), Schlusstext aus der Vorlage mit Fälligkeitsdatum, Bankverbindung (IBAN, Bank) in der Fußzeile.
- Dazu kommen die neuen Pflichtangaben aus M1/M5.

**Textvorlagen und Platzhalter** (pro User in den Settings: Einleitungstext, Schlusstext, Mail-Betreff, Mail-Text)
- `%customerName%` (Vor- und Nachname), `%customerFirstName%`, `%customerLastName%`, `%genderedFormallyGreetings%` (z. B. „Sehr geehrter Herr …“ bzw. „Sehr geehrte Frau …“, neutral ohne Anrede), `%orderNumber%` bzw. `%invoiceNumber%`, `%payDay%` (Fälligkeitsdatum), `%tenantBusiness%` (eigener Firmenname).
- Jedes Vorkommen wird ersetzt. Ein unbekannter Platzhalter ist ein Validierungsfehler beim Speichern der Vorlage.

**E-Mail-Versand**
- Rechnung als PDF-Anhang an die E-Mail-Adresse des Kunden. Betreff und Text kommen aus der Vorlage. Danach gilt die Rechnung als versendet. Der Button ist deaktiviert, wenn der Kunde keine E-Mail-Adresse hat.

**Auswertungen**
- **Begriffe:** *Umsatz* ist der Rechnungsbetrag erbrachter Leistungen, auch wenn er per Gutschein bezahlt wurde. *Einnahme* (für die EÜR) ist der tatsächliche Geldzufluss: Überweisung, bar, online und Gutscheinverkäufe. Gutschein-Einlösungen sind **keine** Einnahme, weil das Geld schon beim Verkauf geflossen ist.
- **Dashboard:** Gesamtumsatz, Umsatz im laufenden Monat (nach Bezahlt-Datum), Anzahl neuer Aufträge, Anzahl offener (ausgestellter, aber unbezahlter) Rechnungen, Umsatz der letzten 6 Monate pro Monat als Diagramm, Top-5-Kunden nach Umsatz, Verteilung nach Status mit Anzahl und Anteil in %.
- **Steuerreport (EÜR-Einnahmen):** Jahr wählbar (Jahre mit Einnahmen sowie das aktuelle Jahr ±5, +10). Alle Einnahmen (siehe Begriffe) gruppiert nach Monat des Zahlungseingangs, mit Monatssummen und Jahressumme. Export als CSV und PDF. Mit der Ausgabenerfassung (M10d) wird daraus eine vollständige EÜR.

**Gutscheine (Wertgutscheine, steuerlich Mehrzweck-Gutscheine)**
- **Gutschein-Stammdaten:** Code, Ausgangswert, Restguthaben, Ausgabedatum, gültig bis (Default: Ende des dritten Jahres nach Ausgabe, entsprechend der regelmäßigen Verjährung; einstellbar), optional Käufer (Kunde oder Freitext), Herkunft `IN_APP` oder `EXTERNAL`, Status `ACTIVE | REDEEMED | EXPIRED | CANCELLED`, Historie aller Einlösungen.
- **Verkauf in der App:** eigener Beleg „Gutschein“ mit eigenem Nummernkreis. Er wird bezahlt wie eine Rechnung und zählt als Einnahme. Optional gibt es ein gestaltetes Gutschein-PDF zum Verschenken (Code, Wert, Gültigkeit, QR-Code mit dem Code), lokal abgelegt wie Rechnungen.
- **Externe Gutscheine:** werden vorab erfasst (einzeln oder per CSV) oder direkt bei der Einlösung mit Code und Wert angelegt. Einstellung pro User: Wurden die Verkaufserlöse externer Gutscheine schon anderswo als Einnahme erfasst? (Default: ja.)
- **Einlösen auf der Rechnung:** per Code (Suche, Prüfung von Gültigkeit und Restguthaben), auch mehrere Gutscheine und Teilbeträge. Der Gutschein erscheint **unter** dem Gesamtbetrag als „abzgl. Gutschein Nr. … −20,00 €“, danach folgt „Zu zahlen“. Intern ist er eine Zahlung vom Typ `VOUCHER`. Bei Storno der Rechnung wird das Guthaben zurückgebucht.
- **Umsatzsteuer** (Modus `STANDARD`): Beim Verkauf eines Mehrzweck-Gutscheins fällt keine USt an. Die Rechnung weist die USt auf den vollen Leistungsbetrag aus, und der Gutschein mindert nur den Zahlbetrag. Die Rechtslage (§3 Abs. 13–15 UStG) vor Umsetzung prüfen und im ADR festhalten.
- **Übersicht:** aktive Gutscheine, offene Gutscheinverbindlichkeit (Summe aller Restguthaben), demnächst ablaufende Gutscheine.

**Datensicherung und Agent-Zugriff**
- JSON-Export der eigenen Kunden, Artikel und Aufträge.
- Über den MCP-Server ist **nur die Auftragsbearbeitung** nutzbar: Kunden suchen bzw. anlegen, Artikel nachschlagen, Aufträge bearbeiten, Rechnung ausstellen und versenden, Zahlung erfassen, Gutschein einlösen (Liste in M9). Alles andere gibt es nur in der Web-App.

### A.3 Tech-Stack (vor Projektstart auf aktuelle stabile Versionen prüfen)

- **Monorepo** mit npm workspaces:
  - `apps/web`: Angular (aktuelle stabile Major-Version), standalone components, Signals, zoneless, Tailwind, `@angular/service-worker` (PWA). Die UI-Basis legt M0b fest (A.7).
  - `apps/api`: Node.js (aktuelle LTS, ≥ 24), TypeScript strict, Express 5, offizieller `mongodb`-Treiber, `zod` für Validierung.
  - `packages/ui`: eigene Komponentenbibliothek und Design-Tokens (A.7, M0b), mit Storybook.
  - `packages/shared`: Domänentypen, zod-Schemas, Preisberechnung, Platzhalter, **PDF-Dokumentdefinition (pdfmake)**, gemeinsam genutzt von Web und API.
- Tests: Vitest (shared/api), Angular-Test-Runner nach aktuellem Angular-Default, Playwright (E2E), `mongodb-memory-server` oder Testcontainers für Integrationstests.
- Lokale Entwicklung: `docker compose` mit lokaler MongoDB (Replica Set mit einem Knoten). **Produktion nutzt die vorhandene MongoDB.**
- Deployment: Docker-Image für die API. Die Angular-App wird von der API oder von einem Reverse Proxy (Caddy/nginx) unter **derselben Origin** ausgeliefert, mit TLS.
- Sprache: **Code, Bezeichner und Commits auf Englisch, UI-Texte auf Deutsch** (i18n-fähig vorbereiten).

### A.4 Architektur-Leitplanken

1. **Mandantentrennung pro User:** Jedes fachliche Dokument hat `ownerId`. Repositories bekommen den `ownerId` aus dem Auth-Kontext (nie aus dem Request-Body) und hängen ihn an **jede** Query. Es gibt einen automatischen Test, der für jeden Endpunkt und jedes MCP-Tool prüft, dass User B keine Daten von User A lesen oder ändern kann (IDOR-Test).
2. **Rechnungen sind unveränderlich, sobald sie ausgestellt sind (GoBD).** Ein Auftrag bleibt editierbar, bis daraus eine Rechnung wird. Beim Ausstellen entsteht ein `invoice`-Dokument mit **eingefrorenem Snapshot** (Firmendaten, Kundenadresse, Positionen, Steuerangaben, Texte, Layout-Version), einer **lückenlosen Rechnungsnummer** pro User (atomarer Zähler über `findOneAndUpdate`) und dem **SHA-256-Hash des PDFs**. Korrekturen laufen nur über Storno- bzw. Korrekturrechnung.
3. **PDFs werden nie serverseitig gespeichert.** Das PDF entsteht deterministisch aus dem Snapshot über `packages/shared/pdf`:
   - im Browser, um es im lokalen Ordner abzulegen,
   - auf dem Server **nur im Arbeitsspeicher**, für den Mailversand und für MCP-Tools.

   Wie die Bytes reproduzierbar werden (feste Metadaten/Datum, gleiche Fonts), ist im ADR festzuhalten.
4. **Geld als Integer-Cent**, Daten als UTC-`Date` in Mongo, Anzeige in `Europe/Berlin`.
5. **Die API ist die einzige Quelle der Wahrheit.** Web-App und MCP-Server nutzen dieselben Service-Klassen (kein doppelter Fachcode).
6. **Ein Hosting-Modell:** API, SPA, OAuth-Server und MCP-Endpunkt liegen unter einer Origin (z. B. `https://bill.example.de`), MCP unter `/mcp`.
7. Die App darf **keine MongoDB-Transaktionen voraussetzen**. Wenn ein Replica Set vorhanden ist, darf sie Transaktionen nutzen; sonst gelten idempotente Operationen und atomare Einzeldokument-Updates.

### A.4a Lebenszyklus einer Rechnung (Web-App und Agent)

**Grundsatz:** Gespeichert wird die Rechnung als **Datensatz**, nicht als Datei. Der eingefrorene Snapshot in MongoDB enthält alles, was auf dem PDF steht. Weil das PDF deterministisch aus dem Snapshot entsteht, kann es jederzeit **bitgenau neu erzeugt** werden, und der gespeicherte SHA-256-Hash beweist das. Ein PDF existiert auf dem Server nur für die Dauer eines Requests im Arbeitsspeicher. Dauerhaft liegt es nur beim User.

1. **Ausstellen** (Web-App oder MCP-Tool `issue_invoice`): Der Server vergibt die Nummer, friert den Snapshot ein, rendert das PDF im Speicher, berechnet den Hash, speichert Snapshot und Hash und verwirft das PDF. Die Rechnung ist ab jetzt rechtlich ausgestellt und unveränderlich, egal ob schon eine Datei beim User liegt.
2. **Versenden** (Web-App oder MCP-Tool `send_invoice_mail`): Der Server rendert das PDF erneut im Speicher aus dem Snapshot, prüft den Hash, hängt es an die Mail, sendet sie über den SMTP des Users und verwirft das PDF. Gespeichert werden nur das Versandprotokoll und der Status `SENT`.
3. **Kein PDF an den Agenten:** Ein Agent bekommt das PDF nie zu sehen. Er erhält nur die Rechnungsdaten aus `get_invoice` (Nummer, Kunde, Positionen, Beträge, Status), keine Firmen- oder Bankdaten.
4. **Lokal ablegen:**
   - **Ausgelöst in der Web-App:** Der Browser rendert das PDF aus dem Snapshot (gleicher Code wie der Server), prüft den Hash, schreibt die Datei sofort in den gewählten Ordner (Chrome/Edge) bzw. startet einen Download (andere Browser) und meldet `local-copy`.
   - **Ausgelöst durch einen Agenten:** Die Rechnung hat noch keine bestätigte lokale Kopie. Beim nächsten Öffnen der Web-App erscheint „X Rechnungen noch nicht lokal gespeichert“. Ein Klick erzeugt die PDFs im Browser, prüft die Hashes und legt sie im Ordner ab. Das Dashboard führt solche Rechnungen unter „Zu erledigen“; optional kommt nach X Tagen eine Erinnerungsmail.
   - Das MCP-Tool sagt dem Agenten in seiner Antwort, dass die Datei beim nächsten Öffnen der App lokal gespeichert wird, damit er es dem User mitteilen kann.
5. **Später erneut abrufen:** Jede Rechnung lässt sich aus dem Snapshot jederzeit neu erzeugen und herunterladen, z. B. auf einem neuen PC oder nach Datenverlust. Die Integritätsprüfung (M5) vergleicht lokale Dateien mit den Hashes.

### A.5 Security-Baseline (gilt für alle Meilensteine)

Maßstab: **OWASP ASVS 5.0 Level 2**, OWASP Top 10 (aktuelle Ausgabe), **NIST SP 800-63B-4**, **RFC 9700 (OAuth 2.0 Security BCP)**, **OAuth 2.1**, die **aktuelle MCP-Authorization-Spezifikation** (mind. Stand 2025-11-25, vor Umsetzung auf modelcontextprotocol.io prüfen) sowie die **DSGVO**.

- **Passwörter:** Argon2id (Parameter mindestens nach OWASP Password Storage Cheat Sheet, z. B. m=46 MiB, t=1, p=1; in der Config justierbar). Mindestlänge **15 Zeichen ohne MFA bzw. 8 mit MFA**, Maximum ≥ 64. Keine Kompositionsregeln, kein erzwungener Wechsel. Prüfung gegen bekannte geleakte Passwörter (HIBP k-Anonymity-API, abschaltbar) plus eine lokale Blockliste. Unicode-Normalisierung (NFKC).
- **MFA:** TOTP und **Passkeys/WebAuthn**, dazu Recovery-Codes (gehasht gespeichert). MFA für Admins Pflicht, für User per Admin-Policy erzwingbar.
- **Sessions der Web-App (BFF-Muster):** opake, serverseitig gespeicherte Session-ID im Cookie `__Host-session` (`Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`). **Keine Tokens in `localStorage`/`sessionStorage`.** Session-ID nach Login und Rechteänderung neu vergeben, Idle-Timeout (30 min) und absolutes Timeout (12 h) konfigurierbar, Logout invalidiert serverseitig, Liste aktiver Sessions mit „überall abmelden“.
- **CSRF:** Origin-/`Sec-Fetch-Site`-Prüfung bei allen zustandsändernden Requests, zusätzlich ein Synchronizer- bzw. Double-Submit-Token.
- **Brute-Force-Schutz:** Rate-Limits pro IP und pro Account (`rate-limiter-flexible` mit Mongo-Store) mit progressiver Verzögerung statt dauerhafter Sperre. Generische Fehlermeldungen ohne User-Enumeration (gleiche Antwort und vergleichbare Laufzeit).
- **Eingaben:** Alle Bodies, Queries und Params validiert per zod (`strict()`, unbekannte Felder ablehnen). Keine ungefilterten Objekte in Mongo-Queries (Schutz vor `$`-Operator-Injection). Größenlimits für Bodies und Uploads.
- **Header:** `helmet` mit strikter CSP (nonce-basiert, kein `unsafe-inline` für Skripte), HSTS, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. CORS nur für explizit erlaubte Origins (Standard: keine, weil alles unter einer Origin läuft).
- **Secrets:** nur per Env bzw. Secret-Store, mit zod beim Start validiert; die App startet nicht bei fehlender Config. **Feldverschlüsselung** (AES-256-GCM, Envelope-Verschlüsselung mit `DATA_ENCRYPTION_KEY`, Key-Rotation über eine Key-ID) für SMTP-Passwörter, TOTP-Secrets und OAuth-Client-Secrets.
- **MongoDB:** TLS mit Zertifikatsprüfung, eigener DB-User mit minimalen Rechten (readWrite nur auf die App-DB), Indizes und JSON-Schema-Validatoren werden per Migration angelegt.
- **Logging:** strukturiert (pino) mit Redaction von Passwörtern, Tokens, Cookies, IBAN und E-Mail. **Audit-Log** (eigene Collection, nur anfügen) für Login, MFA-Änderungen, User-Verwaltung, OAuth-Consent und -Widerruf, Rechnungsausstellung, Storno, Import und Löschungen.
- **DSGVO:** Datenminimierung, Export aller eigenen Daten (Art. 20), Kontolöschung (Art. 17) unter Beachtung der gesetzlichen Aufbewahrungsfristen (Rechnungsdaten sperren statt löschen, bis die Frist abläuft), eine Datenschutz-Seite und ein dokumentiertes Löschkonzept.
- **Supply Chain:** Lockfile, `npm audit` in der CI, Dependabot/Renovate, SBOM (CycloneDX), keine Pakete ohne Wartung. Für Kryptografie und OAuth **etablierte Bibliotheken statt Eigenbau**.

### A.6 Arbeitsweise und Definition of Done (für jeden Agenten)

1. Lies vor Beginn `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md` und die ADRs unter `docs/adr/`. Halte dich an bestehende Entscheidungen. Wenn du davon abweichen musst, schreibe ein neues ADR.
2. Arbeite **nur am zugewiesenen Meilenstein**. Was dir außerhalb auffällt, kommt unter „Offene Punkte“ in `docs/PROGRESS.md`.
3. Bei echten fachlichen Unklarheiten frage den User, statt zu raten.
4. Done heißt:
   - Lint, Typecheck und alle Tests sind grün.
   - Neue Logik ist getestet (Unit plus Integration; bei UI ein Playwright-Happy-Path).
   - Security-relevante Logik hat Negativtests.
   - `docs/PROGRESS.md` ist aktualisiert (Was wurde gebaut, wie startet/testet man es, offene Punkte, Hinweise für den nächsten Meilenstein).
   - `CLAUDE.md` ist aktualisiert, wenn sich Befehle oder die Struktur geändert haben.
   - Es gibt einen Commit pro sinnvollem Schritt mit aussagekräftigen Messages.
5. Keine echten personenbezogenen Daten in Tests oder Fixtures, nur generierte Testdaten.

---

### A.7 UI/UX-Leitlinien (neues Look & Feel)

Das alte UI (feste 250-px-Sidebar, Material-Buttons, Dialog-lastige Bedienung) dient **nicht** als Vorlage. Ziel ist eine moderne, ruhige und schnelle Business-App auf dem Niveau aktueller SaaS-Tools (z. B. Linear, Stripe Dashboard, lexoffice/sevDesk als fachliche Vergleichspunkte).

- **Design-System zuerst:** Design-Tokens für Farben, Typografie, Abstände, Radien, Schatten und Motion als CSS Custom Properties. Light- und Dark-Mode, ein eigenes Farbschema mit Akzentfarbe (vom User im Firmenprofil anpassbar), eine variable Schrift (z. B. Inter) selbst gehostet, also kein Google-Fonts-CDN (DSGVO).
- **Komponenten:** eine eigene Komponentenbibliothek `packages/ui` auf Basis von **headless, barrierefreien Primitives** (Angular CDK bzw. Angular Aria), gestylt mit Tailwind (aktuelle Major-Version) und den Tokens. Angular Material mit eigenem Theme ist nur zulässig, wenn M0b das per ADR begründet. Jede Komponente ist in Storybook dokumentiert, mit visuellen Regressionstests.
- **Layout und Navigation:** Auf dem Desktop eine einklappbare Seitenleiste mit Icons und Labels, eine Topbar mit globaler Suche und Benutzermenü. Auf Mobilgeräten eine Bottom-Navigation mit den 4–5 wichtigsten Bereichen und einem schwebenden Button „+ Neu“. Mobile-first, sinnvoll nutzbar ab 360 px.
- **Bedienung:**
  - Command Palette (`Strg/⌘ + K`) für Suche, Navigation und Aktionen wie „Neue Rechnung für …“.
  - Tastenkürzel für häufige Aktionen.
  - Eigene Seiten statt Modal-Dialogen für komplexe Formulare; Slide-over-Panels für Details.
  - Inline-Validierung mit verständlichen deutschen Fehlermeldungen.
  - Automatisches Speichern von Entwürfen.
  - Optimistic Updates mit „Rückgängig“-Toast statt Bestätigungsdialogen bei umkehrbaren Aktionen. Echte Bestätigung nur bei endgültigen Aktionen (Rechnung ausstellen, Storno, Löschen).
- **Listen:** Tabellen mit Spaltensortierung, gespeicherten Filtern, Status-Chips, Massenaktionen und Kartenansicht auf Mobilgeräten. Leere Zustände mit klarer nächster Aktion. Skeleton-Loader statt Spinner-Overlays.
- **Dashboard:** KPI-Karten mit Trend zum Vorperiodenwert, interaktive Diagramme (barrierefreie Chart-Library, mit Tabellenansicht als Alternative), ein Bereich „Zu erledigen“ (überfällige Rechnungen, Entwürfe, nicht lokal gespeicherte PDFs).
- **Onboarding:** Ein geführter Einstieg nach dem ersten Login: Firmenprofil, Steuermodus, Rechnungsordner wählen, optional Altdaten importieren. Dazu eine Fortschrittsanzeige „Bereit für die erste Rechnung“.
- **Barrierefreiheit:** WCAG 2.2 AA (Kontraste, Fokusreihenfolge, sichtbarer Fokus, Screenreader-Labels, `prefers-reduced-motion`), automatisiert geprüft mit axe in den E2E-Tests.
- **Formatierung:** deutsches Zahlen-, Währungs- und Datumsformat; Beträge in Tabellen rechtsbündig mit tabellarischen Ziffern.
- **Performance:** Initial-Bundle-Budget (z. B. < 250 kB gzip) in `angular.json`, Lighthouse-Score ≥ 90 in allen Kategorien als CI-Check.

### A.8 Konfiguration: Server-Config (.env) vs. User-Settings

**Regel:** In die `.env` gehört **nur, was den Betrieb des Servers betrifft und für alle User gleich ist**. Alles, was zu einem User bzw. seinem Unternehmen gehört, steht in den **User-Settings** in MongoDB. Der User pflegt es in der App, und jeder User hat seine eigenen Werte. Ein User-Wert darf nie als Env-Fallback existieren; fehlt er, führt die App durch das Onboarding (A.7), statt still auf einen globalen Wert auszuweichen.

**Zuordnung der bisherigen `.env`-Variablen** (verbindlich, keine darf verloren gehen):

| Bisherige Variable | Inhalt | Neu |
|---|---|---|
| `BUSINESS_NAME` | Firmenname | User-Settings → Firmenprofil |
| `STREET`, `ZIP_CODE`, `CITY` | Firmenadresse | User-Settings → Firmenprofil (zusätzlich Hausnummer, Land) |
| `PHONE` | Telefon | User-Settings → Firmenprofil (zusätzlich E-Mail, Website) |
| `BUSINESS_ICON` | Logo als SVG-String | User-Settings → Firmenprofil: Logo-Upload (SVG oder PNG, max. 512 KB, SVG serverseitig sanitisiert, z. B. mit DOMPurify im SVG-Profil; keine Skripte und keine externen Referenzen) |
| `IBAN`, `BANK` | Bankverbindung | User-Settings → Bankverbindung (zusätzlich BIC und Kontoinhaber; IBAN mit Prüfsumme validiert, feldverschlüsselt) |
| `INVOICE_INSTRUCTIONS` | Einleitungstext der Rechnung | User-Settings → Textvorlagen „Rechnung: Einleitung“ |
| `INVOICE_BODY` | Schlusstext mit `%payDay%` | User-Settings → Textvorlagen „Rechnung: Schlusstext“ |
| `MAIL_SUBJECT`, `MAIL_Text` | Mail-Betreff und Mail-Text | User-Settings → Textvorlagen „Rechnungsmail: Betreff/Text“ |
| `SMTP_SERVER`, `SMTP_PORT` | Mailserver (bisher immer implizites TLS) | User-Settings → E-Mail-Versand (Host, Port, TLS-Modus) |
| `SENDER_MAIL`, `SENDER_PASSWORD` | Absender und Login | User-Settings → E-Mail-Versand (Benutzer, Absenderadresse und -name, Passwort feldverschlüsselt, nie im Klartext an den Client) |
| `FILE_SAVE_LOCATION` | Ablageordner für PDFs und Backups | User-Settings bzw. Gerät → Rechnungsordner (M5, Handle im Browser des jeweiligen Geräts) |
| `SQLITE_FILE` | DB-Datei | entfällt; ersetzt durch Server-Config `MONGODB_URI` |
| `SERVER_PORT` | Port | bleibt Server-Config (`PORT`) |
| `NODE_ENV` | Umgebung | bleibt Server-Config |
| Frontend-Konstante `BACKEND_URL` | API-Adresse | entfällt (gleiche Origin, A.4.6) |

Bisher fest im Code verdrahtete Werte, die ebenfalls in die User-Settings wandern: Zahlungsziel (14 Tage), Dateiname des Mail-Anhangs (bisher `Rechnung <Nachname>.pdf`; jetzt ein Muster mit Platzhaltern), Rechnungsnummernformat, Rechnungsdesign bzw. Akzentfarbe.

**Vollständige Struktur der User-Settings** (zod-Schema in `packages/shared`, eine Seite pro Gruppe in der App):
1. **Firmenprofil:** Firmenname, Inhaber, Adresse, Telefon, E-Mail, Website, Logo, Steuernummer, USt-IdNr., zuständiges Finanzamt (optional), Handelsregister (optional).
2. **Bankverbindung & Zahlung:** Kontoinhaber, IBAN, BIC, Bank, Zahlungsziel in Tagen, GiroCode an/aus, Bezahllink-Anbieter (Stripe-Key verschlüsselt, PayPal.me-Name), Skonto-Standard (optional).
3. **Steuern:** Steuermodus (`SMALL_BUSINESS | STANDARD`) mit Stichtag, Standard-Steuersatz, Text des §19-Hinweises, Grenzwerte der Kleinunternehmerregelung (vorbelegt), GWG-Grenze.
4. **Nummernkreise:** Formate und nächste Nummer für Rechnung, Storno, Angebot, Gutschein und Kunde. Die nächste Nummer darf nur erhöht werden, nie gesenkt (lückenlos, GoBD).
5. **Dokumente & Design:** Rechnungsdesign-Variante, Akzentfarbe, Fußzeilentexte, Dateinamensmuster für lokale Ablage und Mail-Anhang, Sprache der Dokumente.
6. **Textvorlagen:** Einleitung und Schlusstext für Rechnung, Angebot, Mahnstufen, Gutschein; Betreff und Text für Rechnungs-, Angebots- und Mahnmails. Mit Platzhalter-Hilfe, Live-Vorschau und „auf Standard zurücksetzen“. Die App liefert sinnvolle deutsche Standardtexte.
7. **E-Mail-Versand:** SMTP (M6), Absender, Reply-To, BCC an mich, „Testmail senden“.
8. **Gutscheine:** Standard-Gültigkeit, Code-Format, Behandlung externer Gutscheine (A.2).
9. **Ablage & Backup:** Rechnungsordner auf diesem Gerät (M5), Backup-Erinnerung, Anzeige der Aufbewahrungsfrist.
10. **Sicherheit & Konto:** Passwort, MFA, Sessions, verbundene Apps (M8), Datenexport, Konto löschen (M2/M10c).

**Regeln für die Settings:**
- **Validierung** mit zod auf Client und Server (IBAN-Prüfsumme, USt-IdNr.-Format, E-Mail, Farben als Hex, Textlängen, nur bekannte Platzhalter).
- **Pflichtangaben vor der ersten Rechnung:** Firmenname, Adresse, Steuernummer bzw. USt-IdNr. (je nach Modus) und eine Bankverbindung. Fehlt etwas, verhindert `issue_invoice` das Ausstellen, und die Fehlermeldung nennt die fehlenden Felder. Über MCP bekommt der Agent nur die Bereiche genannt, die der User ergänzen muss, keine Werte (M9).
- **Snapshot:** Beim Ausstellen fließen die zu diesem Zeitpunkt gültigen Settings in den Invoice-Snapshot (A.4.2). Spätere Änderungen (z. B. neue Adresse oder Bank) verändern bereits ausgestellte Rechnungen **nie**.
- **Verlauf:** Änderungen am Firmenprofil, an der Bankverbindung, am Steuermodus und an den Nummernkreisen landen im Audit-Log (alter und neuer Wert; Secrets nur als „geändert“).
- **Secrets** (SMTP-Passwort, Stripe-Key, Webhook-Secrets) sind write-only: Die API gibt nur „gesetzt seit …“ zurück. Das Ändern erfordert eine erneute Anmeldung (Re-Auth).
- **Export/Import der Settings** als JSON (ohne Secrets), z. B. für einen Umzug.
- **MCP:** Einstellungen sind für Agents **weder lesbar noch änderbar** (siehe M9). Es gibt dafür keine Tools und keine Scopes.

**Server-Config (`.env`), abschließend:** `NODE_ENV`, `PORT`, `PUBLIC_BASE_URL`, `MONGODB_URI`, `MONGODB_DB`, `MONGODB_TLS_CA_FILE` (optional), `SESSION_SECRET`, `DATA_ENCRYPTION_KEY` (+ `DATA_ENCRYPTION_KEY_ID`), `OAUTH_JWKS_KEYS` bzw. ein Pfad dazu, `SETUP_TOKEN` (nur für die Ersteinrichtung), `SYSTEM_SMTP_*` (nur für Einladungs- und Reset-Mails des Betreibers), `TRUST_PROXY`, `LOG_LEVEL`, `RATE_LIMIT_*`, `HIBP_ENABLED`, `ALLOWED_SMTP_PRIVATE_HOSTS` (optional, M6). Die Liste wird beim Start per zod validiert und ist in `.env.example` dokumentiert. Neue Variablen kommen nur hinzu, wenn sie diese Regel erfüllen.

---

## TEIL B – Meilensteine

Jeder Meilenstein ist so geschrieben, dass er als eigener Prompt funktioniert:
**„Teil A (oben) gilt. Deine Aufgabe ist Meilenstein Mx:“** + der Abschnitt.

---

### M0 – Projektfundament

**Ziel:** Ein lauffähiges, leeres Monorepo mit Tooling, CI, Doku-Gerüst und Security-Grundgerüst.

**Aufgaben**
- Monorepo nach A.3 anlegen (`apps/web`, `apps/api`, `packages/shared`). Gemeinsame `tsconfig` (strict), ESLint, Prettier und EditorConfig einrichten.
- `apps/api`: Express-5-Grundgerüst mit:
  - zod-validierter Server-Config, ausschließlich mit den Variablen aus A.8; keine user- oder firmenbezogenen Werte in der `.env`,
  - helmet/CSP, pino-Logging mit Redaction,
  - zentraler Fehlerbehandlung (keine Stacktraces an Clients, RFC 9457 Problem Details),
  - `/healthz` (Liveness) und `/readyz` (Mongo-Ping).
- `apps/web`: leere Angular-PWA (zoneless, Tailwind, Service Worker) mit einer neutralen Platzhalter-Shell. Die UI-Bibliothek und das endgültige Layout legt M0b fest.
- `docker-compose.yml` für die Entwicklung: MongoDB als Replica Set mit einem Knoten (für lokale Transaktionstests), API und Web. `.env.example` ohne echte Secrets.
- CI (GitHub Actions): install, lint, typecheck, test, build, `npm audit --audit-level=high`, SBOM erzeugen.
- Doku: `CLAUDE.md` (Befehle, Struktur, Konventionen aus Teil A), `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, `docs/adr/0001-architektur.md` (Monorepo, Mongo, PDFs nur lokal, BFF-Sessions, eingebauter OAuth-Server).

**Akzeptanz:** `docker compose up` startet alles. `/readyz` ist grün mit Mongo. Die Web-App lädt mit leerer Shell. Die CI ist grün.

---

### M0b – Design-System & UX-Konzept

**Ziel:** Ein vollständiges, neues Look & Feel nach A.7, bevor die eigentlichen Views entstehen (M4). Es läuft parallel zu M1–M3.

**Aufgaben**
- **UX-Konzept** in `docs/design/`:
  - Informationsarchitektur und Navigationsstruktur.
  - Die wichtigsten User-Flows als Ablaufdiagramme (Mermaid): Onboarding, Rechnung erstellen bis Versand, Zahlung erfassen, Mahnung, Import, Agent verbinden.
  - Low-Fidelity-Wireframes (z. B. als HTML-Prototypen oder in Storybook) für Dashboard, Listen, Rechnungseditor, Einstellungen, Login/MFA und Consent-Screen (M8).
- **Design-Tokens** (Light/Dark, Akzentfarbe zur Laufzeit änderbar) und Typografie-Skala.
- **`packages/ui`** mit den Basiskomponenten: Button, Icon-Button, Input, Textarea, Select, Combobox (Kunden- und Artikelsuche), Datepicker (deutsches Format), Währungs-Input (Cent-intern), Checkbox, Switch, Tabs, Tabelle (sortierbar, mobile Kartenansicht), Status-Chip, Card, KPI-Card, Slide-over, Dialog, Toast mit Undo, Command Palette, leerer Zustand, Skeleton, App-Shell (Sidebar, Topbar, Bottom-Nav).
- Storybook mit allen Komponenten und Zuständen, axe-Prüfung und visuellen Snapshot-Tests.
- **Neues Rechnungsdesign** (PDF): 2–3 Entwürfe als statische Beispiele, DIN 5008 konform. Der User wählt später eine Variante in den Settings. Eine Variante ist Default und wird in M5 umgesetzt.
- Ein ADR mit den Entscheidungen zu Komponenten-Basis, Icon-Set (z. B. Lucide), Chart-Library und Font.

**Akzeptanz:** Storybook läuft und ist in der CI gebaut. Alle Komponenten bestehen die axe-Prüfung und sind per Tastatur bedienbar. Das UX-Konzept deckt alle Funktionen aus A.2 ab, mit einer Zuordnungstabelle „alte Funktion → neuer Ort im UI“, damit nichts verloren geht. Vor dem Start von M4 holt der Agent sich vom User ein Review der Wireframes und Rechnungsentwürfe.

---

### M1 – Domänenmodell & Persistenz

**Ziel:** Alle fachlichen Typen, Schemas und Repositories mit erzwungener `ownerId`-Trennung.

**Aufgaben**
- In `packages/shared` als zod-Schemas mit abgeleiteten Typen anlegen:
  - `Customer`: `customerNumber` (pro User fortlaufend), Anrede/`gender`, Vorname, Nachname, Firma optional, E-Mail optional, Straße, Hausnummer, PLZ, Ort, Land (Default DE), USt-IdNr. optional, Notizen, `legacyId?`.
  - `ArticleType`: wie in A.2, plus `taxRate` (Basispunkte).
  - `Position`: wie in A.2, plus `taxRate` und `unit`. Beträge in Cent.
  - `Order` (Auftrag/Entwurf): wie in A.2, plus `serviceDate` oder `servicePeriod` (Leistungsdatum ist Pflichtangabe nach §14 UStG), `notes`, `legacyOrderNumber?`.
  - `Invoice`: unveränderlicher Snapshot nach A.4.2, mit `invoiceNumber`, `type` (`INVOICE | CANCELLATION | CREDIT_NOTE`), `refInvoiceId?`, `issuedAt`, `dueDate`, `pdfSha256`, `layoutVersion`, `localCopy: {confirmedAt?}`, `status` (`ISSUED | SENT | PARTIALLY_PAID | PAID | CANCELLED | OVERDUE` (abgeleitet)).
  - `Payment` (Zahlungseingang, `method`: `BANK | CASH | ONLINE | VOUCHER | OTHER`, bei `VOUCHER` mit `voucherId`), `Voucher` und `VoucherSale` (siehe A.2 Gutscheine), `Counter` (Nummernkreise), `UserSettings` (vollständige Struktur und Regeln laut A.8, mit Standardwerten und Migrationen für neue Felder), `AuditEvent`.
  - Die `Invoice` speichert `totalCents` (Rechnungsbetrag), die Gutschein-Einlösungen und `amountDueCents` (zu zahlen). Ein Gutschein wird nie rabattiert und nie als Position geführt.
- **Gutschein-Codes:** kryptografisch zufällig (`crypto.randomInt`), mindestens 10 Zeichen aus einem eindeutig lesbaren Alphabet (Crockford Base32, ohne 0/O/1/I), gruppiert angezeigt (`XXXX-XXXX-XX`), eindeutig pro User. Restguthaben werden atomar verbucht (`findOneAndUpdate` mit Bedingung `remaining >= betrag`), damit kein Gutschein doppelt eingelöst werden kann.
- **Steuermodus** in den Settings:
  - `SMALL_BUSINESS` (Kleinunternehmer nach §19 UStG, Default): keine USt; der Hinweistext wird automatisch auf die Rechnung gedruckt.
  - `STANDARD`: USt pro Position (19 %, 7 %, 0 %), Ausweis nach Steuersätzen getrennt, Steuernummer bzw. USt-IdNr. Pflicht.
  - Berechnung in `packages/shared/calc` mit Rundung pro Steuersatz-Summe. Die Pflicht-Testfälle aus A.2 müssen im Modus `SMALL_BUSINESS` exakt erfüllt sein; ergänze eigene Randfälle.
- Nummernkreise: konfigurierbares Format (z. B. `RE-{YYYY}-{####}`), atomar und lückenlos. Getrennte Kreise für Rechnung, Angebot, Kunde und Storno.
- `apps/api`: Mongo-Verbindungsmodul, Migrationssystem (versionierte Skripte, beim Start oder per CLI) für Collections, JSON-Schema-Validatoren und Indizes (u. a. eindeutig `{ownerId, invoiceNumber}`, `{ownerId, customerNumber}`, Textindex für die Suche).
- Ein `BaseRepository<T>`, das `ownerId` **zwingend** im Konstruktor bzw. Kontext erwartet und an jede Operation hängt. Eine direkte Collection-Nutzung außerhalb der Repositories wird per Lint-Regel verboten.
- Feldverschlüsselungs-Helper (A.5) mit Tests.

**Akzeptanz:** Unit-Tests für Berechnung (inkl. Rabatt, Gutscheine, beide Steuermodi), parallele Gutschein-Einlösungen (kein Überziehen des Restguthabens), Nummernkreise (parallele Vergabe ohne Duplikate oder Lücken) und Owner-Trennung im Repository.

---

### M2 – Authentifizierung & Benutzerverwaltung

**Ziel:** Sicherer Login für die Web-App und Verwaltung der User-Konten.

**Aufgaben**
- **Erst-Einrichtung:** Solange kein User existiert, legt `/setup` einen Admin an. Der Zugang ist geschützt durch ein einmaliges Setup-Token aus dem Server-Log bzw. der Env.
- **Rollen:** `ADMIN` (verwaltet nur Konten und sieht **keine** Geschäftsdaten anderer User) und `USER`. Jeder User, auch der Admin, hat seinen eigenen Datenraum.
- **User anlegen:** Der Admin lädt per E-Mail ein (einmaliger, gehashter Token, 48 h gültig). Der Eingeladene setzt sein Passwort und optional MFA. Selbstregistrierung gibt es als Admin-Schalter (Default: aus). Der Admin kann außerdem deaktivieren, entsperren, die MFA-Pflicht erzwingen und ein Passwort-Reset-Mail auslösen. Er sieht nie Passwörter.
- **Login-Flow** nach A.5: Passwort, dann MFA (TOTP oder Passkey). Passwordless-Login per Passkey ist optional. Recovery-Codes. „Passwort vergessen“ mit einmaligem, kurzlebigem Token (15 min) ohne User-Enumeration.
- **Profil:** Passwort ändern (mit Re-Auth), MFA verwalten, aktive Sessions und Geräte einsehen und widerrufen, Konto löschen bzw. Datenexport anstoßen (Umsetzung in M10c).
- **Bibliotheken:** `@node-rs/argon2` (oder vergleichbar), `@simplewebauthn/server` und `/browser`, `otplib`, `rate-limiter-flexible`. Den Session-Store in Mongo mit TTL-Index selbst implementieren oder eine gepflegte Library nutzen.
- **Middleware:** `requireAuth` und `requireRole` setzen den Auth-Kontext (`userId`, `roles`), aus dem die Repositories den `ownerId` beziehen.
- Audit-Log für alle Auth-Ereignisse.
- E-Mail-Versand für System-Mails (Einladung, Reset) über `SYSTEM_SMTP_*` aus der Server-Config (A.8), getrennt von der User-SMTP in M6.

**Akzeptanz:** Negativtests für falsches Passwort, MFA-Bypass-Versuche, Session-Fixation, CSRF ohne Token, Rate-Limit, User-Enumeration (gleiche Antwort für existierende und nicht existierende Mail), abgelaufene und wiederverwendete Tokens sowie den Zugriff eines Admins auf fremde Geschäftsdaten (muss 404/403 liefern).

---

### M3 – REST-API Kerndomäne

**Ziel:** Alle fachlichen Endpunkte, auf denen später Web-App und MCP aufsetzen.

**Aufgaben**
- **Service-Layer** (`apps/api/src/domain/*`), den die REST-Router und später der MCP-Server gemeinsam nutzen.
- **Kunden:** CRUD, Suche (Name, Firma, Ort, Nummer), Pagination, XLSX-Import (Spalten laut A.2; `xlsx` durch eine gepflegte Library wie `exceljs` ersetzen).
- **Artikel:** CRUD, Suche, Filter (`unit`), Lookup nach Artikelnummer, „alle löschen“ (mit Bestätigung), XLSX-Import.
- **Aufträge:** CRUD, Suche, Filter laut A.2 (`customerNumber`, `state`, `createdFrom`/`createdTo`, `onlyOverdue`), dazu eine Statusmaschine mit erlaubten Übergängen.
- **Rechnung ausstellen:** `POST /api/orders/:id/issue` validiert die Pflichtangaben (§14 UStG: vollständige Adressen, Steuernummer bzw. USt-IdNr., Leistungsdatum, fortlaufende Nummer, Steuerausweis oder §19-Hinweis). Der Endpunkt erzeugt den Snapshot und die Nummer, rendert das PDF serverseitig **nur im Speicher**, um den SHA-256 zu bilden, speichert die Rechnung und liefert sie zurück.
- **Rechnungen:** lesen, filtern, `GET /api/invoices/:id/pdf` (PDF aus dem Snapshot im Speicher erzeugen und streamen; `Cache-Control: no-store`), Storno (erzeugt eine Stornorechnung mit eigener Nummer und Referenz, die Originalrechnung wird `CANCELLED`), `POST /api/invoices/:id/local-copy` (bestätigt, dass die lokale Ablage erfolgt ist, mit Hash-Abgleich).
- **Zahlungen:** Zahlung erfassen (Teilzahlungen); der Status wird automatisch abgeleitet. Bei vollständiger Zahlung `paidAt` setzen. „Bezahlt“ aus A.2 entspricht dem neuen `PAID`.
- **Gutscheine:** CRUD für externe Gutscheine, CSV-Import, Gutschein verkaufen (Beleg plus Zahlung), Code prüfen (`GET /api/vouchers/lookup?code=`, mit Rate-Limit pro User gegen Durchprobieren), auf einer Rechnung einlösen bzw. die Einlösung zurücknehmen (nur solange die Rechnung nicht vollständig bezahlt ist), Liste, Ablauf-Job (setzt abgelaufene Gutscheine auf `EXPIRED`), Report zur Gutscheinverbindlichkeit.
- **Reports:** Dashboard-KPIs, Umsatz pro Monat, Top-Kunden, EÜR-Einnahmenliste pro Jahr (nach Zahlungsdatum, Zuflussprinzip), überfällige Rechnungen.
- Eine OpenAPI-Spezifikation wird aus den zod-Schemas generiert (z. B. `zod-openapi`) und unter `/api/docs` nur in der Entwicklung ausgeliefert.

**Akzeptanz:** Integrationstests pro Endpunkt inkl. IDOR-Testmatrix (A.4.1). Eine Rechnung ist nach dem Ausstellen nicht mehr änderbar (PUT/PATCH/DELETE → 409). Der PDF-Hash ist bei wiederholtem Rendern identisch.

---

### M4 – Web-App: Login & fachliche Views

**Ziel:** Die Angular-PWA mit allen Funktionen aus A.2, angebunden an die neue API.

**Aufgaben**
- Login-, MFA-, Setup-, Einladungs- und Reset-Seiten. Auth-State per Signal aus `GET /api/me`. Route-Guards. HTTP-Interceptor für CSRF-Token und 401-Handling (zurück zum Login).
- Das UI wird **vollständig nach dem Design-System und den Flows aus M0b** gebaut (`docs/design/`, `packages/ui`). Vom alten UI wird nichts übernommen. Angular-Konventionen: Signals (`resource()`/`httpResource()`, `computed()`, `linkedSignal()`), `inject()`, Signal-Forms bzw. typisierte Reactive Forms, `OnPush`, neue Control-Flow-Syntax, lazy geladene Routen.
- Bereiche: **Dashboard (Start), Aufträge, Rechnungen (neu), Gutscheine (neu), Angebote (Platzhalter für M10a), Kunden, Artikel, Steuerreport, Einstellungen (neu), Hilfe**. Navigation, Gruppierung und Reihenfolge nach der Informationsarchitektur aus M0b.
- Der **Auftrags- bzw. Rechnungseditor** wird neu gestaltet, als eigene Seite statt Modal-Dialog: links das Formular, rechts eine Live-Vorschau des PDFs (auf Mobilgeräten umschaltbar). Funktional muss er alles können, was der alte Auftragsdialog konnte (Positionen aus Artikeln oder frei, Positions- und Gesamtrabatt, Flex-Preise, Live-Summe), dazu „Gutschein einlösen“ mit Code-Eingabe bzw. Scan des QR-Codes per Kamera (Restguthaben direkt sichtbar). Neu sind Leistungsdatum, Steuersatz pro Position, Tastaturbedienung (Enter = neue Position, Positionen per Drag & Drop sortieren), automatisches Speichern als Entwurf und „Rechnung ausstellen“ mit einem Bestätigungsschritt, der die Pflichtangaben prüft.
- **Gutscheine:** eigener Bereich mit Liste, Verkauf, externer Erfassung, Detail mit Einlösungshistorie und Gutschein-PDF.
- Rechnungsansicht: Liste mit Status-Chips, Zahlungen erfassen, Storno, „PDF herunterladen“ (die lokale Ordnerablage folgt in M5).
- **Einstellungen:** alle Gruppen aus A.8 (Gruppen für spätere Meilensteine als „kommt bald“ ausgegraut), insbesondere Firmenprofil (Name, Adresse, Telefon, E-Mail, Web, Steuernummer, USt-IdNr., IBAN, BIC, Bank, Logo-Upload als SVG oder PNG, serverseitig validiert und SVG sanitisiert), Steuermodus, Zahlungsziel, Nummernformate, Textvorlagen mit Platzhalter-Hilfe, Profil, Sicherheit (MFA, Sessions).
- **PWA/Offline:** App-Shell offline verfügbar. Geschäftsdaten sind **online-first** und werden nicht dauerhaft im Browser gespeichert (Datenschutz bei geteilten PCs). Offline zeigt die App einen klaren Hinweis.
- Barrierefreiheit, Responsiveness, Performance-Budget und Onboarding nach A.7. axe-Prüfungen laufen in jedem E2E-Test mit.

**Akzeptanz:** Playwright-E2E: Setup → Login mit MFA → Kunde anlegen → Artikel anlegen → Auftrag anlegen → Rechnung ausstellen → Zahlung erfassen → Dashboard und Steuerreport zeigen den Betrag.

---

### M5 – PDF-Erzeugung & lokale Ablage im Ordner

**Ziel:** Rechnungen landen als PDF im vom User gewählten Ordner auf seinem PC; der Server speichert keine Dateien.

**Aufgaben**
- `packages/shared/pdf`: Dokumentdefinition aus dem Invoice-Snapshot. **Neues Rechnungsdesign** aus M0b (DIN 5008, modern und gut lesbar, Akzentfarbe und Logo aus dem Firmenprofil), mit allen Inhalten aus A.2, ergänzt um die Pflichtangaben (Leistungsdatum, Steuerausweis bzw. §19-Hinweis, Steuernummer, USt-IdNr., Storno-Referenz). Gutschein-Einlösungen stehen unter dem Gesamtbetrag, danach „Zu zahlen“. Feste Fonts einbetten. Deterministisch: identischer Snapshot ergibt identische Bytes. Läuft im Browser und in Node mit derselben Definition.
- **GiroCode (EPC-QR-Code)**, steuerbar über einen Schalter in den Settings (Default: an, wenn eine IBAN hinterlegt ist):
  - Format nach EPC069-12 (Version 002, UTF-8, `SCT`), mit Empfängername (max. 70 Zeichen), IBAN, BIC (optional), Betrag = **zu zahlender Betrag** und Verwendungszweck = Rechnungsnummer.
  - Druckgröße mindestens 2 × 2 cm, Fehlerkorrekturstufe M, mit der Beschriftung „Mit Banking-App scannen“.
  - Kein QR-Code, wenn der Betrag 0 ist (dann steht „Bereits vollständig durch Gutschein beglichen“ auf der Rechnung) oder wenn keine IBAN hinterlegt ist.
  - Unit-Tests gegen den Standard (Feldreihenfolge, Längen, Betragsformat `EUR123.45`), außerdem ein Test mit einem QR-Decoder.
- **Gutschein-PDF** (A.2) mit demselben Renderer und derselben lokalen Ablage (Unterordner `Gutscheine/`).
- **Ordnerwahl in den Einstellungen:** `window.showDirectoryPicker({mode: 'readwrite'})`. Den `FileSystemDirectoryHandle` in IndexedDB speichern (er ist gerätegebunden, das Gerät per zufälliger `deviceId` kennzeichnen). Ordnernamen anzeigen und Schreibrecht prüfen. Fehlt nach einem Neustart die Berechtigung, holt die App sie per `requestPermission()` erneut ein, ausgelöst durch einen Klick.
- **Dateistruktur** über ein Muster in den Settings, z. B. `{YYYY}/{invoiceNumber}_{customerLastName}.pdf`. Dateinamen sanitisieren (keine Pfadtrenner, keine reservierten Windows-Namen, max. Länge). Existierende Dateien nie stillschweigend überschreiben.
- **Ablauf beim Ausstellen:** Die API liefert den Snapshot, der Browser rendert das PDF, prüft den SHA-256 gegen den Server-Hash, schreibt die Datei in den Ordner und meldet `POST /local-copy`.
- **Nachspeichern:** Rechnungen ohne bestätigte lokale Kopie (z. B. per MCP-Agent oder auf einem anderen Gerät ausgestellt) zeigt die App als Banner „X Rechnungen noch nicht lokal gespeichert“ mit „Jetzt speichern“.
- **Integritätsprüfung:** Ein Button prüft alle Dateien im Ordner gegen die gespeicherten Hashes und meldet fehlende oder veränderte Dateien. Fehlende Dateien lassen sich neu erzeugen.
- **Fallback** für Browser ohne File System Access API (Firefox, Safari): normaler Download plus deutlicher Hinweis, dass die Ablage in der Verantwortung des Users liegt. Empfehlung in der Hilfe: Chrome oder Edge, App installieren.
- **Verantwortungshinweis** in den Settings und in der Hilfe: Der User muss die PDFs selbst sichern und die gesetzliche Aufbewahrungsfrist einhalten (aktuell 8 Jahre für Rechnungen; den Wert konfigurierbar anzeigen und vor Release prüfen). Dazu eine optionale Erinnerung „Backup deines Rechnungsordners“ (z. B. monatlich).

**Akzeptanz:** Tests für Determinismus (Hash-Gleichheit Browser vs. Node), Dateinamen-Sanitizer und Nachspeicher-Logik. Ein Playwright-Test mit gemockter File System Access API.

---

### M6 – E-Mail-Versand von Rechnungen

**Ziel:** Rechnungen aus der App per Mail an Kunden schicken, über den SMTP-Server des Users.

**Aufgaben**
- **SMTP-Settings pro User:** Host, Port, TLS-Modus (STARTTLS oder implizit, **Zertifikatsprüfung immer an**), Benutzer, Passwort (feldverschlüsselt, nie an den Client zurückgeben, nur „gesetzt/nicht gesetzt“), Absendername und -adresse, Reply-To, BCC an sich selbst. Ein Button „Testmail senden“.
- **Vorlagen** für Betreff und Text mit Platzhaltern (A.2), Vorschau vor dem Senden, Empfänger aus dem Kunden (editierbar).
- **Versand:** Das PDF wird serverseitig im Speicher aus dem Snapshot gerendert, per Hash geprüft und angehängt. **Nichts wird gespeichert.** Danach geht der Status auf `SENT`, und ein Versandprotokoll (Zeitpunkt, Empfänger, Message-ID, ohne Inhalt) wird gespeichert.
- **Schutz:** SSRF-Schutz für den SMTP-Host (keine privaten oder Loopback-IPs, außer per Env erlaubt), Header-Injection verhindern, Rate-Limit für den Versand pro User.

**Akzeptanz:** Integrationstest mit einem lokalen SMTP-Testserver (z. B. Mailpit im Compose). Tests für SSRF-Block, Header-Injection und dafür, dass das Passwort nie in API-Antworten oder Logs auftaucht.

---

### M7 – Import alter Daten (User-Settings)

**Ziel:** Bestehende BillKiller-Daten in das Konto des angemeldeten Users übernehmen.

**Quellformate** (JSON-Backups von BillKiller, vollständig hier beschrieben):
- `customer_backup.json`: Array von `{id: number, name: string /* Vorname */, surname: string /* Nachname */, email?: string, zipCode: number, street: string, city: string, houseNumber: string, gender?: 0 | 1 /* 0 = Herr, 1 = Frau */}`.
- `orders_backup.json`: Array von `{orderNumber: number, customerNumber: number /* = Kunden-id */, customerName: string, isMailAddressAvailable: boolean, state: "OPEN" | "IN_PROGRESS" | "SENT_MAIL" | "CLOSED", createdDate: string, closedDate?: string, payDate?: string /* Fälligkeit */, positions: Position[], discount: number | null /* % */, total: number /* € */}`.
  - `Position = {name: string, count: number, prize: number /* € */, unit: "h" | "pc", discount: number | null /* % */, isFlexPrice: boolean, isNegativePosition: boolean}`.
  - Datumswerte sind ISO-8601-Strings, Beträge Euro-Floats. `IN_PROGRESS` heißt „PDF erstellt“, `SENT_MAIL` „per Mail verschickt“, `CLOSED` „bezahlt“.
- Optional ein Artikel-Backup: Array von `{id: number, name: string, unit: "h" | "pc", prize: number, articleNumber: string, isFlexPrice: boolean, isNegativePosition: boolean, additionalInformation?: string}`.
- Achtung: `name` ist der Vorname, `surname` der Nachname. Die Zuordnung vor dem Import in der Vorschau anzeigen.
- Die Dateien sind Fremddaten: Sie können unvollständig sein oder abweichende Typen haben (z. B. PLZ als Zahl ohne führende Null, wie bei `1067` für `01067`). Validieren, normalisieren und Abweichungen im Bericht ausweisen.

**Aufgaben**
- **Wizard** unter Einstellungen → „Daten importieren“:
  1. Dateien hochladen (Größenlimit, nur JSON, Streaming-Parser).
  2. Validierung mit zod und **Dry-Run-Vorschau**: Anzahl Kunden, Artikel und Aufträge, Fehler pro Datensatz, Zuordnung der Kunden über `customerNumber → id`, nicht zuordenbare Aufträge.
  3. Optionen wählen.
  4. Import ausführen.
  5. Bericht anzeigen und herunterladen.
- **Mapping:** Die alten IDs als `legacyId` bzw. `legacyOrderNumber` speichern. Euro in Cent umrechnen (exakt runden). Der `total` aus der Datei bleibt der **zu zahlende bzw. bezahlte Betrag**; Abweichungen zur Neuberechnung nur im Bericht ausweisen.
- **Negativpositionen = eingelöste Gutscheine:** Jede Position mit `isNegativePosition: true` wird zu einem externen Gutschein (`EXTERNAL`, Code `IMP-<orderNumber>-<n>`, Status `REDEEMED`) plus einer Einlösung auf der Rechnung. Der Einlösebetrag ist der Positionsbetrag × Gesamtrabatt-Faktor, weil das Altsystem den Gutschein mitrabattiert hat. Der Rechnungsbetrag ist `total` + Einlösebetrag. So bleiben Zahlbetrag und Einnahmen exakt gleich, und der Umsatz wird korrekt ohne Gutscheinabzug ausgewiesen. Der Bericht zeigt pro Jahr die Umsatzveränderung durch diese Umdeutung. Negativpositionen aus dem Artikel-Backup werden nicht als Artikel importiert, sondern im Bericht aufgelistet.
- **Status:** Alte Status übersetzen: `CLOSED` wird zur ausgestellten und bezahlten Rechnung mit `paidAt = closedDate`; `SENT_MAIL` wird zu `SENT`; `OPEN` und `IN_PROGRESS` bleiben Aufträge. Steuermodus `SMALL_BUSINESS`.
- **Alte Rechnungen:** Die alte `orderNumber` war die Rechnungsnummer. Importierte Rechnungen behalten diese Nummer (Kennzeichen `imported: true`, Format „wie importiert“). Der neue Nummernkreis startet **oberhalb der höchsten importierten Nummer**, damit keine Duplikate entstehen; das ist im Wizard einstellbar. Die alten PDFs liegen bereits beim User (`<FILE_SAVE_LOCATION>/<orderNumber>/Rechnung_<surname>_<orderNumber>.pdf`) und werden **nicht** neu erzeugt. Optional kann der User seinen alten Rechnungsordner wählen; die App ordnet dann die vorhandenen Dateien zu und speichert deren SHA-256.
- **Idempotenz:** Ein erneuter Import derselben Datei erzeugt keine Duplikate (Upsert über `ownerId + legacyId`). Ein Abbruch ist sicher; wenn kein Replica Set vorhanden ist, wird pro Batch gearbeitet und ein Fortsetzungs-Marker gespeichert.
- Einträge im Audit-Log.

**Akzeptanz:** Tests mit generierten Backup-Fixtures im obigen Format inkl. Randfällen (fehlende Felder, Datumsformate, Rundung, verwaiste Aufträge, doppelter Import, Negativpositionen mit und ohne Gesamtrabatt). Die Summen vor und nach dem Import stimmen exakt überein.

---

### M8 – OAuth 2.1 Authorization Server (für MCP-Clients)

**Ziel:** Ein in die App eingebauter, standardkonformer Authorization Server, über den sich gängige Agents (Claude, ChatGPT, Cursor, VS Code, MCP Inspector) mit dem Einverständnis des Users verbinden.

**Rahmen:** Die Web-App nutzt weiterhin ihre First-Party-Session (M2). OAuth ist **nur für Drittclients** (Agents) gedacht. Der Login- und Consent-Screen des OAuth-Servers verwendet dieselbe Session und dieselbe MFA.

**Aufgaben**
- **Library:** `oidc-provider` (panva, OpenID-zertifiziert) oder eine gleichwertige, aktiv gepflegte Lösung. **Kein Eigenbau der Protokoll-Logik.** Adapter für den Mongo-Store implementieren.
- **Endpunkte und Metadaten:**
  - `/.well-known/oauth-authorization-server` (RFC 8414) und OIDC Discovery,
  - `/.well-known/oauth-protected-resource` für die Ressource `/mcp` (RFC 9728),
  - `authorize`, `token`, `revocation` (RFC 7009), `jwks`,
  - optional `introspection` (RFC 7662).
- **Pflicht laut OAuth 2.1 und MCP-Spec:**
  - **Authorization Code + PKCE (`S256`)** für alle Clients; kein Implicit, kein Password Grant.
  - **Exakter Redirect-URI-Abgleich.** Für native Clients Loopback-Redirects (`http://127.0.0.1:<beliebiger Port>`, RFC 8252); sonst nur HTTPS.
  - **Resource Indicators (RFC 8707):** Der Parameter `resource` wird ausgewertet, und Tokens werden an die Audience `https://<host>/mcp` gebunden. Der MCP-Server lehnt Tokens mit anderer Audience ab (**kein Token-Passthrough**).
  - **Client-Registrierung:** **Client ID Metadata Documents** (laut aktueller MCP-Spec bevorzugt) **und** Dynamic Client Registration (RFC 7591) als Fallback, mit Rate-Limit, Größenlimits und Validierung von `redirect_uris`, `client_name` und `logo_uri` (SSRF-Schutz beim Laden von Metadaten oder Logos: nur HTTPS, keine privaten IPs, Timeouts, Größenlimit). Registrierte, aber nie genutzte Clients nach X Tagen aufräumen.
  - **Kurzlebige Access Tokens** (5–15 min), signiert mit ES256 oder EdDSA, mit JWKS-Rotation. **Refresh-Token-Rotation** mit Erkennung von Wiederverwendung: wird ein altes Refresh Token erneut benutzt, widerruft der Server die ganze Token-Familie. Absolute Lebensdauer begrenzen (z. B. 30 Tage).
  - **`state` bzw. PKCE gegen CSRF**, `iss`-Parameter in der Authorization Response (RFC 9207) gegen Mix-up-Angriffe.
  - DPoP (RFC 9449) optional unterstützen, wenn Clients es anbieten.
- **Scopes** (nur für die Auftragsbearbeitung, passend zu M9): `customers:read`, `customers:write`, `articles:read`, `orders:read`, `orders:write`, `invoices:read`, `invoices:issue`, `invoices:send`, `payments:write`, `vouchers:redeem`, `offline_access`. Default ist nur lesend. Es gibt **keine** Scopes für Einstellungen, Reports, Export oder Administration; der Authorization Server lehnt unbekannte Scopes ab.
- **Consent-Screen:** Clientname, Herkunft (Domain der Redirect-URI bzw. Metadata-URL), Hinweis bei unbekannten oder unverifizierten Clients, angeforderte Scopes in Klartext, einzelne Scopes abwählbar. Einwilligung pro Client und Scope-Set speichern.
- **„Verbundene Apps“** in den Einstellungen: alle Clients mit Scopes, letzter Nutzung und „Zugriff widerrufen“ (widerruft alle Tokens sofort).
- Einträge im Audit-Log (Consent, Token-Ausgabe pro Client, Widerruf, Wiederverwendung eines Refresh Tokens).

**Akzeptanz:** Tests für PKCE-Pflicht, falsche Redirect-URI, falsche Audience, Refresh-Wiederverwendung, Widerruf, abgelaufene Tokens und abgewählte Scopes. Ein End-to-End-Flow mit dem MCP Inspector gegen die lokale Instanz ist dokumentiert.

---

### M9 – MCP-Server (Streamable HTTP, OAuth-geschützt)

**Ziel:** Die Auftragsbearbeitung als MCP-Tools für Agents, abgesichert per OAuth aus M8. Der Funktionsumfang ist bewusst kleiner als die Web-App.

**Aufgaben**
- `@modelcontextprotocol/sdk` (aktuelle Version), **Streamable HTTP** unter `/mcp` (stateless oder mit sicherer `Mcp-Session-Id`). Kein stdio mehr, weil die Daten nicht mehr lokal liegen.
- **Auth:**
  - Ohne oder mit ungültigem Token antwortet der Server `401` mit `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`, bei fehlendem Scope `403` mit `insufficient_scope` und dem benötigten Scope (Step-up).
  - Geprüft werden Signatur, `iss`, `aud` (= `/mcp`), `exp` und Scopes.
  - Der `sub` des Tokens wird zum `ownerId`; die Tools nutzen die Services aus M3 mit diesem Kontext.
  - `Origin`-Header validieren (Schutz vor DNS-Rebinding).
- **Grundsatz – Agent nur für die Auftragsbearbeitung:** Der MCP-Server bietet **ausschließlich** Aktionen, die nötig sind, um einen Auftrag zu erfassen, abzurechnen, zu versenden und als bezahlt zu markieren. Es gibt **keine** Tools für Einstellungen (weder lesen noch schreiben), Auswertungen und Reports (Dashboard, Umsatz, Steuerreport, EÜR, Kleinunternehmergrenze), Datenexport, Ausgaben, Artikelpflege, Gutscheinverkauf, Storno, Benutzer- und Kontoverwaltung. Diese Funktionen gibt es nur in der Web-App. Neue Tools kommen nur hinzu, wenn sie diesem Grundsatz entsprechen; das wird per ADR entschieden.
- **Tools** (die Namen sind verbindlich, die Liste ist abschließend), jeweils mit zod-Input-Schema, `outputSchema`/`structuredContent` und Annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`):
  - **Kunden** (um den Auftrag einem Kunden zuzuordnen): `list_customers` (Suche), `get_customer`, `create_customer`, `update_customer` (z. B. eine korrigierte Adresse oder neue E-Mail). **Kein** Löschen.
  - **Artikel** (nur lesen, um Positionen zu befüllen): `list_article_types` (Suche, Filter `unit`), `get_article_type`, `get_article_type_by_number`.
  - **Aufträge:** `list_orders` (Filter laut A.2, plus `start`/`end` für Pagination), `get_order`, `get_orders_by_customer`, `create_order`, `update_order`, `delete_order` (nur Aufträge ohne ausgestellte Rechnung).
  - **Rechnung zum Auftrag:** `issue_invoice`, `get_invoice`, `list_invoices` (nur Nummer, Kunde, Datum, Betrag und Status, zum Nachverfolgen offener Rechnungen), `get_overdue_invoices`, `send_invoice_mail`, `record_payment` (Zahlungseingang erfassen, um die Rechnung als bezahlt zu markieren; Zahlungsart `VOUCHER` ist ausgeschlossen, dafür gibt es `redeem_voucher`).
  - **Gutschein auf dem Auftrag einlösen:** `lookup_voucher` (prüft nur, ob ein Code gültig ist und wie hoch das Restguthaben ist; **keine** Liste aller Gutscheine) und `redeem_voucher` (auf eine Rechnung).
  - **Neu aus M10, sobald vorhanden** und nur, wenn es zur Auftragsbearbeitung gehört: `create_quote`, `get_quote`, `convert_quote_to_order` (Angebote) sowie `get_dunning_status` (Mahnstatus einer Rechnung, nur lesen). Mahnungen auslösen, wiederkehrende Rechnungen anlegen und E-Rechnungs-Export (M11) bleiben in der Web-App.
- **Keine Einstellungen nach außen:**
  - Kein Tool gibt Einstellungswerte zurück (Firmenprofil, Bankdaten, Steuermodus, Nummernkreise, Textvorlagen, SMTP, Zahlungsanbieter).
  - Fehlen Pflichtangaben für eine Rechnung, meldet `issue_invoice` nur „Einstellungen unvollständig, bitte in der App ergänzen: Firmenprofil, Bankverbindung“, also Bereiche, keine Werte.
  - Es gibt **kein** Tool, das ein PDF (Rechnung, Angebot, Gutschein, Mahnung) an den Agenten liefert, weil das PDF Firmen- und Bankdaten enthält. `get_invoice` liefert nur Nummer, Kunde, Positionen, Beträge, Daten und Status, ohne den Firmen- und Bank-Teil des Snapshots.
  - Ein Test stellt sicher, dass keine Tool-Antwort Felder aus `UserSettings` enthält.
- **Sicherheit für Agents:**
  - Folgenreiche Tools (`delete_order`, `issue_invoice`, `send_invoice_mail`, `record_payment`, `redeem_voucher`) brauchen eigene Scopes. Wo der Client es unterstützt, holen sie per **Elicitation** eine Bestätigung ein; sonst verlangen sie einen Parameter `confirm: true` und beschreiben die Folgen im Tool-Text.
  - Rate-Limits pro Client und User.
  - Tool-Ausgaben enthalten keine Secrets. Freitextfelder aus der DB werden als Daten gekennzeichnet (Prompt-Injection-Hinweis in der Tool-Beschreibung).
  - Jeder Tool-Aufruf landet im Audit-Log (Client, Tool, Ergebnis, ohne Payload-PII).
- **Doku in der Hilfe-Seite und in `docs/MCP.md`:** Wie man die App verbindet. Claude (Custom Connector mit der URL `https://<host>/mcp`), ChatGPT (Connector/Apps), Cursor und VS Code (`mcp.json` mit URL) und der MCP Inspector, jeweils mit Screenshot-Platzhaltern. Remote-URL mit OAuth statt stdio-Config.

**Akzeptanz:** Integrationstests pro Tool (inkl. Scope-Prüfung und Owner-Trennung); ein Test „Token von User A sieht keine Daten von User B“; ein manuell dokumentierter Durchlauf mit dem MCP Inspector und mindestens einem echten Agent-Client.

---

### M10a – Angebote & wiederkehrende Rechnungen

- **Angebote** (eigener Nummernkreis): erstellen, als PDF (lokal ablegen wie in M5), per Mail senden, Status `DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED` mit Gültigkeitsdatum. „In Auftrag umwandeln“ übernimmt die Positionen.
- **Wiederkehrende Rechnungen:** Vorlage mit Intervall (monatlich, quartalsweise, jährlich), Startdatum, Ende optional und Modus „Entwurf erzeugen“ oder „automatisch ausstellen und senden“. Ein Scheduler in der API ist idempotent, vergibt kein Ausführungsdatum doppelt und ist auch bei mehreren Instanzen sicher (Lock-Dokument in Mongo mit TTL). Automatisch ausgestellte Rechnungen erscheinen im Nachspeicher-Banner.
- MCP nur laut M9: `create_quote`, `get_quote`, `convert_quote_to_order`. Wiederkehrende Rechnungen sind nicht über MCP verfügbar.

### M10b – Mahnwesen & Zahlungen

- **Mahnstufen** konfigurierbar (Zahlungserinnerung, 1. und 2. Mahnung) mit Fristen, Texten und optionalen Mahngebühren bzw. Verzugszinsen (Basiszinssatz konfigurierbar, nicht hart codiert). Mahnungen als PDF (lokal) und per Mail. Übersicht „Fällig zur Mahnung“, optional automatische Erinnerung per Mail.
- **Zahlungen:** Teilzahlungen, Skonto, Abschreibung als uneinbringlich. Optional CSV-Import von Kontoauszügen (CAMT.053 oder CSV) mit Zuordnungsvorschlägen über Rechnungsnummer und Betrag.
- Der GiroCode ist bereits in M5 umgesetzt. Hier wird er zusätzlich auf Mahnungen gedruckt, jeweils mit dem offenen Betrag.
- **Bezahllink in der Rechnungsmail** (in den Settings aktivierbar):
  - **Stripe** (automatischer Abgleich):
    - Der User hinterlegt einen eigenen *Restricted API Key*, verschlüsselt gespeichert und nur mit den nötigen Rechten.
    - Pro Rechnung erzeugt die App einen Checkout- bzw. Payment-Link über den zu zahlenden Betrag, mit Rechnungs-ID in den Metadaten. Der Link kommt in die Mail und optional als Link bzw. QR-Code aufs PDF.
    - Der Webhook-Endpunkt ist pro User eindeutig. Er prüft die Signatur (`Stripe-Signature`, Toleranz gegen Replay) und verarbeitet idempotent über die Event-ID.
    - Der gezahlte Betrag und die Rechnungs-ID werden gegen die DB geprüft. Danach entsteht automatisch eine Zahlung `ONLINE` (optional mit Gebühren), und der Status wird aktualisiert.
    - Die App sieht oder verarbeitet nie Kartendaten (PCI DSS SAQ A).
    - Der Link wird ungültig, wenn die Rechnung anderweitig bezahlt oder storniert wird.
  - **PayPal**: einfacher PayPal.me-Link mit Betrag, ohne automatischen Abgleich. Optional die PayPal-Orders-API mit Webhook und Signaturprüfung, analog zu Stripe.
  - Andere Anbieter (z. B. Mollie) über eine gemeinsame `PaymentProvider`-Schnittstelle vorbereiten.
  - Tests: Webhook mit falscher Signatur, Replay, falschem Betrag, unbekannter Rechnung und doppeltem Event.

### M10c – Export, DSGVO & Komfort

- **Steuerberater-Export:** CSV und **DATEV-Buchungsstapel** (Format vorher recherchieren und im ADR festhalten), EÜR-Report als PDF und CSV.
- **DSGVO:** „Meine Daten exportieren“ (JSON plus CSV als ZIP) und Kontolöschung mit Sperrkonzept für aufbewahrungspflichtige Rechnungsdaten (A.5).
- **Komfort:** globale Suche, Duplizieren von Aufträgen, Kundenhistorie (Umsatz, offene Posten), Dashboard-Erweiterungen (offene Forderungen, durchschnittliche Zahlungsdauer, Umsatz-Vorjahresvergleich).

### M10d – Ausgaben, Belege & Kleinunternehmergrenze

- **Ausgaben erfassen:** Datum, Lieferant, Beschreibung, Kategorie (an die Zeilen der Anlage EÜR angelehnt, z. B. Wareneinkauf, Fremdleistungen, Raumkosten, Fahrzeugkosten, Telefon/Internet, Software, Fortbildung, Bürobedarf; erweiterbar), Bruttobetrag, im Modus `STANDARD` Vorsteuer nach Steuersatz, Zahlungsdatum (maßgeblich für die EÜR), Zahlungsart, Notiz. Dazu wiederkehrende Ausgaben (z. B. monatliche Software-Abos).
- **Anlagegüter:** Liegt eine Ausgabe über der GWG-Grenze (aktuell 800 € netto; konfigurierbar, vor Umsetzung prüfen), wird sie als Anlagegut mit Nutzungsdauer erfasst. Die lineare AfA wird pro Jahr berechnet und fließt in die EÜR.
- **Belege lokal, wie Rechnungen:**
  - Beleg als PDF oder Foto auswählen oder auf dem Handy direkt mit der Kamera aufnehmen (`<input type="file" accept="image/*,application/pdf" capture>`).
  - Die Datei wird im Rechnungsordner unter `Belege/{YYYY}/{Datum}_{Lieferant}_{Betrag}.{ext}` gespeichert (File System Access API bzw. Download-Fallback).
  - Der **Server speichert nur Metadaten und den SHA-256**, nie die Datei. Die Integritätsprüfung aus M5 gilt auch für Belege.
- **Kein MCP-Zugriff:** Ausgaben, EÜR und die Kleinunternehmergrenze sind nur in der Web-App verfügbar (M9).
- **Vollständige EÜR:**
  - Einnahmen (A.2) minus Ausgaben und AfA, nach Kategorie und Monat, mit Jahresvergleich.
  - Im Modus `STANDARD` zusätzlich vereinnahmte USt, Vorsteuer und Zahllast als Vorbereitung für die Umsatzsteuer-Voranmeldung (keine ELSTER-Übermittlung, nur eine Übersicht).
  - Export als PDF und CSV; der DATEV-Export aus M10c enthält auch die Ausgaben.
- **Kleinunternehmergrenze** (nur im Modus `SMALL_BUSINESS`):
  - Die App prüft beide Grenzen aus §19 UStG: Gesamtumsatz im **Vorjahr ≤ 25.000 €** und im **laufenden Jahr ≤ 100.000 €** (Stand ab 2025; Grenzwerte konfigurierbar, Berechnungsbasis und Rechtslage vor Umsetzung prüfen und im ADR festhalten). Gutscheinverkäufe zählen nicht zum Umsatz, Gutschein-Einlösungen schon.
  - Anzeige auf dem Dashboard: Fortschrittsbalken „Umsatz {Jahr}: 62.300 € von 100.000 €“ mit Prognose zum Jahresende auf Basis des bisherigen Verlaufs.
  - Warnstufen: ab 80 % ein Hinweis; ab 95 % eine deutliche Warnung mit Erklärung und Link zur Hilfe.
  - Würde eine neue Rechnung die 100.000 € überschreiten, blockiert ein Dialog vor dem Ausstellen: Ab diesem Umsatz gilt die Regelbesteuerung. Der Dialog bietet an, in den Modus `STANDARD` zu wechseln. Die Rechnung, mit der die Grenze überschritten wird, ist bereits mit USt auszustellen.
  - Zum Jahreswechsel prüft die App die 25.000-€-Grenze des Vorjahres und weist darauf hin, falls die Kleinunternehmerregelung im neuen Jahr nicht mehr gilt.
  - Jeder Wechsel des Steuermodus wird mit Stichtag im Audit-Log festgehalten. Rechnungen vor dem Stichtag bleiben unverändert.
  - Kein Ersatz für Steuerberatung: Ein klarer Hinweis in der UI und in der Hilfe.

---

### M11 – E-Rechnung (optional, empfohlen)

**Hintergrund:** In Deutschland müssen Unternehmen seit 2025 im B2B E-Rechnungen empfangen können. Die Pflicht zur Ausstellung kommt schrittweise (2027/2028). Kleinunternehmer sind von der Ausstellungspflicht ausgenommen. **Aktuelle Rechtslage vor Umsetzung recherchieren und im ADR festhalten.**

- Pro Kunde einstellbar: Rechnung als **ZUGFeRD/Factur-X** (PDF/A-3 mit eingebettetem CII-XML, Profil mindestens EN 16931) oder als **XRechnung** (UBL oder CII, für öffentliche Auftraggeber mit Leitweg-ID).
- Das XML wird aus dem Invoice-Snapshot erzeugt und gegen die offiziellen Schemas bzw. Schematron validiert (KoSIT-Validator in der CI). Die PDF/A-3-Konvertierung läuft per `pdf-lib` oder vergleichbar. Die Ablage erfolgt wie in M5 lokal, der Hash wird über die finale Datei gebildet.
- Kein eigenes MCP-Tool (Auslieferung nur in der Web-App, M9).

---

### M12 – Härtung, Security-Review & Release

**Aufgaben**
- **Security-Review** gegen OWASP ASVS 5.0 L2 als Checkliste in `docs/security/asvs-checklist.md`, mit Nachweis pro Punkt (Code- oder Teststelle), außerdem gegen RFC 9700 und die MCP-Security-Best-Practices. Gefundene Mängel beheben.
- **Automatisierte Prüfungen:** SAST (CodeQL oder Semgrep), Dependency-Scan, Secret-Scan (gitleaks), DAST-Baseline mit OWASP ZAP gegen die laufende Instanz in der CI.
- Tests für Lastverhalten und Missbrauch: Rate-Limits, große Uploads, viele DCR-Registrierungen.
- **Betrieb:** `docs/DEPLOYMENT.md` mit:
  - Reverse Proxy mit TLS (Caddy-Beispiel) und Header-Prüfung,
  - Mongo-Anbindung (TLS, eigener DB-User mit minimalen Rechten, Backup der Mongo **durch den Betreiber**),
  - Rotation von Secrets und Schlüsseln (Session-, Daten- und JWKS-Keys),
  - Update-Prozess, Ablauf der Migrationen, Healthchecks.
- **Datenschutz:** Vorlage für Datenschutzerklärung und Verzeichnis der Verarbeitungstätigkeiten (Hinweis: rechtlich prüfen lassen), Impressums-Platzhalter.
- **Abschluss:** Release-Notes, Versionierung (SemVer) und eine vollständige Hilfe-Seite für Endnutzer.

**Akzeptanz:** Alle Scans ohne High- oder Critical-Funde, die ASVS-Checkliste vollständig, ein frischer Deploy nach Doku gegen eine leere Mongo funktioniert, und der Import eines echten (anonymisierten) BillKiller-Backups läuft durch.

---

## TEIL C – Startprompt für jede Session (Vorlage)

```
Du arbeitest am Projekt EasyBill. Lies zuerst CLAUDE.md, docs/ARCHITECTURE.md,
docs/PROGRESS.md und docs/adr/*. Der folgende gemeinsame Kontext (Teil A) gilt verbindlich:

<Teil A hier einfügen>

Deine Aufgabe ist ausschließlich Meilenstein <Mx>:

<Abschnitt Mx hier einfügen>

Arbeite die Aufgaben vollständig ab und halte die Definition of Done (A.6) und bei
UI-Arbeit die UI/UX-Leitlinien (A.7) ein. Konfiguration nur nach A.8:
User-bezogenes gehört in die User-Settings, nie in die .env. Die fachliche Grundlage ist ausschließlich
A.2; es gibt kein Altsystem zum Nachschauen.
Recherchiere aktuelle Versionen und Spezifikationen, bevor du Abhängigkeiten
hinzufügst. Frag mich, wenn eine fachliche Entscheidung offen ist. Aktualisiere
am Ende docs/PROGRESS.md mit einer Übergabe für den nächsten Agenten und committe.
```
