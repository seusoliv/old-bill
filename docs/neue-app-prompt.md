# Prompt-Paket: Neue Abrechnungs-App „EasyBill“ (Nachfolger von BillKiller)

> **So verwendest du dieses Dokument**
>
> 1. Lege ein neues, leeres Repository an (z. B. `easy-bill`) und kopiere das alte Repo `old-bill` als Referenz nach `legacy/` hinein (nur lesen, wird nicht gebaut).
> 2. Starte für **jeden Meilenstein eine eigene Claude-Code-Session** (eigener Agent, frischer Kontext).
> 3. Gib jedem Agenten **immer zuerst Teil A (Gemeinsamer Kontext)** und danach **genau einen Meilenstein aus Teil B**.
> 4. Halte die Reihenfolge laut Abhängigkeitsgraph ein. Meilensteine in derselben Zeile können parallel laufen (dann jeweils in einem eigenen Branch/Worktree).
> 5. Jeder Agent beendet seine Arbeit mit grünen Tests, einem aktualisierten `docs/PROGRESS.md` und einem Commit. Der nächste Agent baut darauf auf.

```
M0 ─► M1 ─► M2 ─► M3 ─┬─► M4 ─► M5 ─┬─► M6
                      │             ├─► M7
                      └─► M8 ───────┴─► M9 ─► M10a/b/c ─► M11 (optional) ─► M12
```
(M8 kann nach M3 parallel zu M4/M5 laufen. M6 und M7 können parallel laufen.)

---

## TEIL A – Gemeinsamer Kontext (jedem Agenten mitgeben)

### A.1 Ziel

Du baust **EasyBill**, eine deutschsprachige Rechnungs-PWA für Selbstständige und Kleinunternehmer. Sie ersetzt die bestehende App „BillKiller“, deren Code unter `legacy/` liegt (Angular 19 PWA + Express-Backend; Doku in `legacy/CLAUDE.md`). **Alle bestehenden Funktionen bleiben erhalten**, die Architektur ändert sich:

| Bisher (legacy) | Neu |
|---|---|
| Daten in IndexedDB (Browser) oder SQLite (lokales Backend) | Daten in einer **bereits vorhandenen MongoDB** (Verbindung per `MONGODB_URI`) |
| PDFs auf dem Server unter `FILE_SAVE_LOCATION/<nr>/…` | PDFs **nur auf dem PC des Users**, in einem Ordner, den er in den User-Settings wählt (File System Access API). Der Server **speichert keine PDFs**. |
| Kein Login | **Benutzerverwaltung**: Login, MFA, Admin legt User an. **Jeder User hat komplett eigene Daten.** |
| Firmendaten/Texte/SMTP in `.env` | Firmendaten, Textvorlagen und SMTP-Daten **pro User in den Settings** |
| MCP über stdio/HTTP ohne Auth | **Remote-MCP-Server (Streamable HTTP) mit OAuth 2.1**, nutzbar von Claude, ChatGPT, Cursor, VS Code usw. |
| – | **Import** alter JSON-Backups über die User-Settings |
| – | Zusätzliche Features: Angebote, Mahnwesen, Zahlungseingänge, Storno, wiederkehrende Rechnungen, USt-Modus, DATEV/CSV-Export, DSGVO-Export, optional E-Rechnung |

### A.2 Funktionen aus der alten App, die erhalten bleiben (Referenz: `legacy/`)

- **Dashboard** (`legacy/src/app/views/dashboard`): KPI-Karten, Monatsumsatz-Chart, Top-5-Kunden, Aufschlüsselung nach Auftragsstatus. Standardroute.
- **Aufträge** (`order-overview`): anlegen, bearbeiten, löschen, suchen (Name/Nummer), Positionen aus Artikeln oder frei, Positions- und Gesamtrabatt, Negativpositionen, Flex-Preise, PDF erzeugen, Rechnung per Mail senden, Status `OPEN → IN_PROGRESS → SENT_MAIL → CLOSED`, `payDate = Rechnungsdatum + 14 Tage` (künftig einstellbar), `closedDate` beim Schließen.
- **Kunden** (`customer-overview`): CRUD, paginierte Suche, XLSX-Import.
- **Artikel** (`articles-overview`): Artikeltypen (Einheit Stunde/Stück, Preis, Artikelnummer, Flex-Preis, Negativposition, Zusatzinfo), CRUD, XLSX-Import.
- **Steuerreport** (`tax-report`): EÜR-Einnahmenliste nach Monaten, Jahr wählbar, nur bezahlte bzw. geschlossene Rechnungen.
- **Hilfe** (`help`): wird zur Bedienungsanleitung (Ordner wählen, Import, Agent verbinden).
- **Preisberechnung**: `legacy/src/app/shared/utils/calc-prize.ts` 1:1 übernehmen (mit Tests). Der neue Code rechnet **in Cent (Integer)** und muss bei denselben Eingaben exakt dieselben Beträge liefern.
- **PDF-Layout**: `legacy/Backend/src/services/pdf-generator.service.ts` (pdfmake) als Vorlage: Logo, Firmenblock, Kundenblock, Einleitungstext mit Platzhaltern, Rechnungs-/Kundennummer, Rechnungs-/Fälligkeitsdatum, Positionstabelle (Rabattspalte nur bei Bedarf), Summenblock, Bankverbindung in der Fußzeile.
- **Platzhalter** (`placeholder-replace.utils.ts`): `%customerName%`, `%customerFirstName%`, `%customerLastName%`, `%orderNumber%`, `%payDay%`, `%genderedFormallyGreetings%`, `%tenantBusiness%`. Alle ersetzen, nicht nur das erste Vorkommen (der alte Code nutzt `String.replace`, das ist ein Bug).
- **MCP-Tools** (`legacy/Backend/src/mcp/register-tools.ts`): alle Tools fachlich übernehmen (siehe M9).

### A.3 Tech-Stack (vor Projektstart auf aktuelle stabile Versionen prüfen)

- **Monorepo** mit npm workspaces:
  - `apps/web`: Angular (aktuelle stabile Major-Version), standalone components, Signals, zoneless, Angular Material, Tailwind, `@angular/service-worker` (PWA).
  - `apps/api`: Node.js (aktuelle LTS, ≥ 24), TypeScript strict, Express 5, offizieller `mongodb`-Treiber, `zod` für Validierung.
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

## TEIL B – Meilensteine

Jeder Meilenstein ist so geschrieben, dass er als eigener Prompt funktioniert:
**„Teil A (oben) gilt. Deine Aufgabe ist Meilenstein Mx:“** + der Abschnitt.

---

### M0 – Projektfundament

**Ziel:** Ein lauffähiges, leeres Monorepo mit Tooling, CI, Doku-Gerüst und Security-Grundgerüst.

**Aufgaben**
- Monorepo nach A.3 anlegen (`apps/web`, `apps/api`, `packages/shared`). Gemeinsame `tsconfig` (strict), ESLint, Prettier und EditorConfig einrichten.
- `apps/api`: Express-5-Grundgerüst mit:
  - zod-validierter Config (`MONGODB_URI`, `MONGODB_DB`, `PUBLIC_BASE_URL`, `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `NODE_ENV`, `PORT`, …),
  - helmet/CSP, pino-Logging mit Redaction,
  - zentraler Fehlerbehandlung (keine Stacktraces an Clients, RFC 9457 Problem Details),
  - `/healthz` (Liveness) und `/readyz` (Mongo-Ping).
- `apps/web`: leere Angular-PWA (zoneless, Material, Tailwind, Service Worker) mit Shell-Layout (linke Sidebar wie in `legacy/src/app/app.component.html`).
- `docker-compose.yml` für die Entwicklung: MongoDB als Replica Set mit einem Knoten (für lokale Transaktionstests), API und Web. `.env.example` ohne echte Secrets.
- CI (GitHub Actions): install, lint, typecheck, test, build, `npm audit --audit-level=high`, SBOM erzeugen.
- Doku: `CLAUDE.md` (Befehle, Struktur, Konventionen aus Teil A), `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, `docs/adr/0001-architektur.md` (Monorepo, Mongo, PDFs nur lokal, BFF-Sessions, eingebauter OAuth-Server).
- `legacy/` von Lint, Build und Tests ausschließen.

**Akzeptanz:** `docker compose up` startet alles. `/readyz` ist grün mit Mongo. Die Web-App lädt mit leerer Shell. Die CI ist grün.

---

### M1 – Domänenmodell & Persistenz

**Ziel:** Alle fachlichen Typen, Schemas und Repositories mit erzwungener `ownerId`-Trennung.

**Aufgaben**
- In `packages/shared` als zod-Schemas mit abgeleiteten Typen anlegen:
  - `Customer`: `customerNumber` (pro User fortlaufend), Anrede/`gender`, Vorname, Nachname, Firma optional, E-Mail optional, Straße, Hausnummer, PLZ, Ort, Land (Default DE), USt-IdNr. optional, Notizen, `legacyId?`.
  - `ArticleType`: wie in legacy, plus `taxRate` (Basispunkte).
  - `Position`: wie in legacy, plus `taxRate` und `unit`. Beträge in Cent.
  - `Order` (Auftrag/Entwurf): wie in legacy, plus `serviceDate` oder `servicePeriod` (Leistungsdatum ist Pflichtangabe nach §14 UStG), `notes`, `legacyOrderNumber?`.
  - `Invoice`: unveränderlicher Snapshot nach A.4.2, mit `invoiceNumber`, `type` (`INVOICE | CANCELLATION | CREDIT_NOTE`), `refInvoiceId?`, `issuedAt`, `dueDate`, `pdfSha256`, `layoutVersion`, `localCopy: {confirmedAt?}`, `status` (`ISSUED | SENT | PARTIALLY_PAID | PAID | CANCELLED | OVERDUE` (abgeleitet)).
  - `Payment` (Zahlungseingang), `Counter` (Nummernkreise), `UserSettings` (Firmenprofil, Steuermodus, Texte, Zahlungsziel, Nummernformat, Dateinamensmuster, SMTP), `AuditEvent`.
- **Steuermodus** in den Settings:
  - `SMALL_BUSINESS` (Kleinunternehmer nach §19 UStG, Default): keine USt; der Hinweistext wird automatisch auf die Rechnung gedruckt.
  - `STANDARD`: USt pro Position (19 %, 7 %, 0 %), Ausweis nach Steuersätzen getrennt, Steuernummer bzw. USt-IdNr. Pflicht.
  - Berechnung in `packages/shared/calc` mit Rundung pro Steuersatz-Summe. Für den Kleinunternehmer-Modus mit legacy-kompatiblen Ergebnissen; Golden-Tests gegen die legacy-Funktion.
- Nummernkreise: konfigurierbares Format (z. B. `RE-{YYYY}-{####}`), atomar und lückenlos. Getrennte Kreise für Rechnung, Angebot, Kunde und Storno.
- `apps/api`: Mongo-Verbindungsmodul, Migrationssystem (versionierte Skripte, beim Start oder per CLI) für Collections, JSON-Schema-Validatoren und Indizes (u. a. eindeutig `{ownerId, invoiceNumber}`, `{ownerId, customerNumber}`, Textindex für die Suche).
- Ein `BaseRepository<T>`, das `ownerId` **zwingend** im Konstruktor bzw. Kontext erwartet und an jede Operation hängt. Eine direkte Collection-Nutzung außerhalb der Repositories wird per Lint-Regel verboten.
- Feldverschlüsselungs-Helper (A.5) mit Tests.

**Akzeptanz:** Unit-Tests für Berechnung (inkl. Rabatt, Negativpositionen, beide Steuermodi), Nummernkreise (parallele Vergabe ohne Duplikate oder Lücken) und Owner-Trennung im Repository.

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
- E-Mail-Versand für System-Mails (Einladung, Reset) über eine **systemweite** SMTP-Config per Env, getrennt von der User-SMTP in M6.

**Akzeptanz:** Negativtests für falsches Passwort, MFA-Bypass-Versuche, Session-Fixation, CSRF ohne Token, Rate-Limit, User-Enumeration (gleiche Antwort für existierende und nicht existierende Mail), abgelaufene und wiederverwendete Tokens sowie den Zugriff eines Admins auf fremde Geschäftsdaten (muss 404/403 liefern).

---

### M3 – REST-API Kerndomäne

**Ziel:** Alle fachlichen Endpunkte, auf denen später Web-App und MCP aufsetzen.

**Aufgaben**
- **Service-Layer** (`apps/api/src/domain/*`), den die REST-Router und später der MCP-Server gemeinsam nutzen.
- **Kunden:** CRUD, Suche (Name, Firma, Ort, Nummer), Pagination, XLSX-Import (Spaltenmapping wie legacy; `xlsx` durch eine gepflegte Library wie `exceljs` ersetzen).
- **Artikel:** CRUD, Suche, Filter (`unit`, `isNegativePosition`), Lookup nach Artikelnummer, „alle löschen“ (mit Bestätigung), XLSX-Import.
- **Aufträge:** CRUD, Suche, Filter wie in legacy (`customerNumber`, `state`, `createdFrom`/`createdTo`, `onlyOverdue`), dazu eine Statusmaschine mit erlaubten Übergängen.
- **Rechnung ausstellen:** `POST /api/orders/:id/issue` validiert die Pflichtangaben (§14 UStG: vollständige Adressen, Steuernummer bzw. USt-IdNr., Leistungsdatum, fortlaufende Nummer, Steuerausweis oder §19-Hinweis). Der Endpunkt erzeugt den Snapshot und die Nummer, rendert das PDF serverseitig **nur im Speicher**, um den SHA-256 zu bilden, speichert die Rechnung und liefert sie zurück.
- **Rechnungen:** lesen, filtern, `GET /api/invoices/:id/pdf` (PDF aus dem Snapshot im Speicher erzeugen und streamen; `Cache-Control: no-store`), Storno (erzeugt eine Stornorechnung mit eigener Nummer und Referenz, die Originalrechnung wird `CANCELLED`), `POST /api/invoices/:id/local-copy` (bestätigt, dass die lokale Ablage erfolgt ist, mit Hash-Abgleich).
- **Zahlungen:** Zahlung erfassen (Teilzahlungen); der Status wird automatisch abgeleitet. Bei vollständiger Zahlung `paidAt` setzen. Das legacy-`CLOSED` entspricht dem neuen `PAID`.
- **Reports:** Dashboard-KPIs, Umsatz pro Monat, Top-Kunden, EÜR-Einnahmenliste pro Jahr (nach Zahlungsdatum, Zuflussprinzip), überfällige Rechnungen.
- Eine OpenAPI-Spezifikation wird aus den zod-Schemas generiert (z. B. `zod-openapi`) und unter `/api/docs` nur in der Entwicklung ausgeliefert.

**Akzeptanz:** Integrationstests pro Endpunkt inkl. IDOR-Testmatrix (A.4.1). Eine Rechnung ist nach dem Ausstellen nicht mehr änderbar (PUT/PATCH/DELETE → 409). Der PDF-Hash ist bei wiederholtem Rendern identisch.

---

### M4 – Web-App: Login & fachliche Views

**Ziel:** Die Angular-PWA mit allen Views der alten App, angebunden an die neue API.

**Aufgaben**
- Login-, MFA-, Setup-, Einladungs- und Reset-Seiten. Auth-State per Signal aus `GET /api/me`. Route-Guards. HTTP-Interceptor für CSRF-Token und 401-Handling (zurück zum Login).
- Views nach dem Muster der legacy-App (`resource()`/`computed()`, `inject()`, `protected readonly`, `takeUntilDestroyed`): **Dashboard, Aufträge, Rechnungen (neu), Kunden, Artikel, Steuerreport, Einstellungen (neu), Hilfe**. Navigation in dieser Reihenfolge in der Sidebar.
- Den Auftragsdialog aus `legacy/src/app/views/order-overview` übernehmen (Positionen aus Artikeln, Rabatte, Live-Summe). Neu sind Leistungsdatum, Steuersatz pro Position und der Button „Rechnung ausstellen“ mit Vorschau.
- Rechnungsansicht: Liste mit Status-Chips, Zahlungen erfassen, Storno, „PDF herunterladen“ (die lokale Ordnerablage folgt in M5).
- **Einstellungen:** Firmenprofil (Name, Adresse, Telefon, E-Mail, Web, Steuernummer, USt-IdNr., IBAN, BIC, Bank, Logo-Upload als SVG oder PNG, serverseitig validiert und SVG sanitisiert), Steuermodus, Zahlungsziel, Nummernformate, Textvorlagen mit Platzhalter-Hilfe, Profil, Sicherheit (MFA, Sessions).
- **PWA/Offline:** App-Shell offline verfügbar. Geschäftsdaten sind **online-first** und werden nicht dauerhaft im Browser gespeichert (Datenschutz bei geteilten PCs). Offline zeigt die App einen klaren Hinweis.
- Barrierefreiheit (WCAG 2.2 AA für Formulare und Kontraste), responsive ab 360 px.

**Akzeptanz:** Playwright-E2E: Setup → Login mit MFA → Kunde anlegen → Artikel anlegen → Auftrag anlegen → Rechnung ausstellen → Zahlung erfassen → Dashboard und Steuerreport zeigen den Betrag.

---

### M5 – PDF-Erzeugung & lokale Ablage im Ordner

**Ziel:** Rechnungen landen als PDF im vom User gewählten Ordner auf seinem PC; der Server speichert keine Dateien.

**Aufgaben**
- `packages/shared/pdf`: Dokumentdefinition aus dem Invoice-Snapshot. Layout wie legacy, ergänzt um die Pflichtangaben (Leistungsdatum, Steuerausweis bzw. §19-Hinweis, Steuernummer, USt-IdNr., Storno-Referenz). Feste Fonts einbetten. Deterministisch: identischer Snapshot ergibt identische Bytes. Läuft im Browser und in Node mit derselben Definition.
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

**Quellformate** (siehe `legacy/Backend/src/services/backup.service.ts` und die legacy-Interfaces unter `legacy/src/app/services/storage/interfaces/`):
- `customer_backup.json`: Array von `Customer {id, name, surname, email?, zipCode, street, city, houseNumber, gender?}`.
- `orders_backup.json`: Array von `Order {orderNumber, customerNumber, customerName, isMailAddressAvailable, state, createdDate, closedDate?, payDate?, positions[], discount, total}`. Datumswerte sind ISO-Strings, Preise Euro-Floats.
- Optional `backup_articleTypes/*.json`: Array von `ArticleType`.
- Achtung: Im legacy-Code ist `name` der Vorname und `surname` der Nachname (siehe PDF-Generator). Die Zuordnung vor dem Import in der Vorschau anzeigen.

**Aufgaben**
- **Wizard** unter Einstellungen → „Daten importieren“:
  1. Dateien hochladen (Größenlimit, nur JSON, Streaming-Parser).
  2. Validierung mit zod und **Dry-Run-Vorschau**: Anzahl Kunden, Artikel und Aufträge, Fehler pro Datensatz, Zuordnung der Kunden über `customerNumber → id`, nicht zuordenbare Aufträge.
  3. Optionen wählen.
  4. Import ausführen.
  5. Bericht anzeigen und herunterladen.
- **Mapping:** Legacy-IDs als `legacyId` bzw. `legacyOrderNumber` speichern. Euro in Cent umrechnen (exakt runden). Legacy-States übersetzen: `CLOSED` wird zur ausgestellten und bezahlten Rechnung mit `paidAt = closedDate`; `SENT_MAIL` wird zu `SENT`; `OPEN` und `IN_PROGRESS` bleiben Aufträge. Steuermodus `SMALL_BUSINESS`.
- **Alte Rechnungen:** Die legacy-`orderNumber` war die Rechnungsnummer. Importierte Rechnungen behalten diese Nummer (Kennzeichen `imported: true`, Format „wie importiert“). Der neue Nummernkreis startet **oberhalb der höchsten importierten Nummer**, damit keine Duplikate entstehen; das ist im Wizard einstellbar. Die alten PDFs liegen bereits beim User (`<FILE_SAVE_LOCATION>/<orderNumber>/Rechnung_<surname>_<orderNumber>.pdf`) und werden **nicht** neu erzeugt. Optional kann der User seinen alten Rechnungsordner wählen; die App ordnet dann die vorhandenen Dateien zu und speichert deren SHA-256.
- **Idempotenz:** Ein erneuter Import derselben Datei erzeugt keine Duplikate (Upsert über `ownerId + legacyId`). Ein Abbruch ist sicher; wenn kein Replica Set vorhanden ist, wird pro Batch gearbeitet und ein Fortsetzungs-Marker gespeichert.
- Einträge im Audit-Log.

**Akzeptanz:** Tests mit generierten Legacy-Fixtures inkl. Randfällen (fehlende Felder, Datumsformate, Rundung, verwaiste Aufträge, doppelter Import). Die Summen vor und nach dem Import stimmen exakt überein.

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
- **Scopes** (fein und verständlich benannt): `customers:read`, `customers:write`, `articles:read`, `articles:write`, `orders:read`, `orders:write`, `invoices:read`, `invoices:issue`, `invoices:send`, `payments:write`, `reports:read`, `offline_access`. Default ist nur lesend.
- **Consent-Screen:** Clientname, Herkunft (Domain der Redirect-URI bzw. Metadata-URL), Hinweis bei unbekannten oder unverifizierten Clients, angeforderte Scopes in Klartext, einzelne Scopes abwählbar. Einwilligung pro Client und Scope-Set speichern.
- **„Verbundene Apps“** in den Einstellungen: alle Clients mit Scopes, letzter Nutzung und „Zugriff widerrufen“ (widerruft alle Tokens sofort).
- Einträge im Audit-Log (Consent, Token-Ausgabe pro Client, Widerruf, Wiederverwendung eines Refresh Tokens).

**Akzeptanz:** Tests für PKCE-Pflicht, falsche Redirect-URI, falsche Audience, Refresh-Wiederverwendung, Widerruf, abgelaufene Tokens und abgewählte Scopes. Ein End-to-End-Flow mit dem MCP Inspector gegen die lokale Instanz ist dokumentiert.

---

### M9 – MCP-Server (Streamable HTTP, OAuth-geschützt)

**Ziel:** Alle fachlichen Funktionen als MCP-Tools für Agents, abgesichert per OAuth aus M8.

**Aufgaben**
- `@modelcontextprotocol/sdk` (aktuelle Version), **Streamable HTTP** unter `/mcp` (stateless oder mit sicherer `Mcp-Session-Id`). Kein stdio mehr, weil die Daten nicht mehr lokal liegen.
- **Auth:**
  - Ohne oder mit ungültigem Token antwortet der Server `401` mit `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`, bei fehlendem Scope `403` mit `insufficient_scope` und dem benötigten Scope (Step-up).
  - Geprüft werden Signatur, `iss`, `aud` (= `/mcp`), `exp` und Scopes.
  - Der `sub` des Tokens wird zum `ownerId`; die Tools nutzen die Services aus M3 mit diesem Kontext.
  - `Origin`-Header validieren (Schutz vor DNS-Rebinding).
- **Tools** (Namen wie legacy, wo vorhanden), jeweils mit zod-Input-Schema, `outputSchema`/`structuredContent` und Annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`):
  - Kunden: `list_customers`, `get_customer`, `create_customer`, `update_customer`, `delete_customer`, `get_customer_with_orders`.
  - Artikel: `list_article_types` (Filter `unit`, `isNegativePosition`), `get_article_type`, `get_article_type_by_number`, `create_article_type`, `update_article_type`, `delete_article_type`, `clear_article_types`.
  - Aufträge: `list_orders` (Filter wie legacy), `get_order`, `create_order`, `update_order`, `delete_order`, `get_orders_by_customer`.
  - Rechnungen: `issue_invoice`, `list_invoices`, `get_invoice`, `get_overdue_invoices`, `cancel_invoice`, `record_payment`, `send_invoice_mail`, `get_invoice_pdf` (liefert das PDF als eingebettete Resource bzw. Base64-Blob, im Speicher erzeugt). **Hinweis an das Modell:** Die Datei wird nicht auf dem Server gespeichert; der User speichert sie beim nächsten Öffnen der App (Banner aus M5).
  - Reports: `get_revenue_report` (Jahr bzw. Zeitraum, gruppiert nach Monat), `get_dashboard_kpis`, `get_tax_report`.
  - Neu aus M10, sobald vorhanden: Angebote, Mahnungen, wiederkehrende Rechnungen.
  - Die legacy-Tools `trigger_*_backup` entfallen, weil die Datenbank zentral liegt. Ersatz ist `export_my_data` (JSON-Export als Resource).
- **Sicherheit für Agents:**
  - Destruktive bzw. folgenreiche Tools (`delete_*`, `clear_*`, `issue_invoice`, `send_invoice_mail`, `cancel_invoice`) brauchen eigene Scopes. Wo der Client es unterstützt, holen sie per **Elicitation** eine Bestätigung ein; sonst verlangen sie einen Parameter `confirm: true` und beschreiben die Folgen im Tool-Text.
  - Rate-Limits pro Client und User.
  - Tool-Ausgaben enthalten keine Secrets. Freitextfelder aus der DB werden als Daten gekennzeichnet (Prompt-Injection-Hinweis in der Tool-Beschreibung).
  - Jeder Tool-Aufruf landet im Audit-Log (Client, Tool, Ergebnis, ohne Payload-PII).
- **Doku in der Hilfe-Seite und in `docs/MCP.md`:** Wie man die App verbindet. Claude (Custom Connector mit der URL `https://<host>/mcp`), ChatGPT (Connector/Apps), Cursor und VS Code (`mcp.json` mit URL) und der MCP Inspector, jeweils mit Screenshot-Platzhaltern. Remote-URL mit OAuth statt stdio-Config.

**Akzeptanz:** Integrationstests pro Tool (inkl. Scope-Prüfung und Owner-Trennung); ein Test „Token von User A sieht keine Daten von User B“; ein manuell dokumentierter Durchlauf mit dem MCP Inspector und mindestens einem echten Agent-Client.

---

### M10a – Angebote & wiederkehrende Rechnungen

- **Angebote** (eigener Nummernkreis): erstellen, als PDF (lokal ablegen wie in M5), per Mail senden, Status `DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED` mit Gültigkeitsdatum. „In Auftrag umwandeln“ übernimmt die Positionen.
- **Wiederkehrende Rechnungen:** Vorlage mit Intervall (monatlich, quartalsweise, jährlich), Startdatum, Ende optional und Modus „Entwurf erzeugen“ oder „automatisch ausstellen und senden“. Ein Scheduler in der API ist idempotent, vergibt kein Ausführungsdatum doppelt und ist auch bei mehreren Instanzen sicher (Lock-Dokument in Mongo mit TTL). Automatisch ausgestellte Rechnungen erscheinen im Nachspeicher-Banner.
- Neue MCP-Tools und Scopes ergänzen.

### M10b – Mahnwesen & Zahlungen

- **Mahnstufen** konfigurierbar (Zahlungserinnerung, 1. und 2. Mahnung) mit Fristen, Texten und optionalen Mahngebühren bzw. Verzugszinsen (Basiszinssatz konfigurierbar, nicht hart codiert). Mahnungen als PDF (lokal) und per Mail. Übersicht „Fällig zur Mahnung“, optional automatische Erinnerung per Mail.
- **Zahlungen:** Teilzahlungen, Skonto, Abschreibung als uneinbringlich. Optional CSV-Import von Kontoauszügen (CAMT.053 oder CSV) mit Zuordnungsvorschlägen über Rechnungsnummer und Betrag.
- **EPC-QR-Code** („GiroCode“) auf Rechnungen für SEPA-Überweisungen (abschaltbar).

### M10c – Export, DSGVO & Komfort

- **Steuerberater-Export:** CSV und **DATEV-Buchungsstapel** (Format vorher recherchieren und im ADR festhalten), EÜR-Report als PDF und CSV.
- **DSGVO:** „Meine Daten exportieren“ (JSON plus CSV als ZIP) und Kontolöschung mit Sperrkonzept für aufbewahrungspflichtige Rechnungsdaten (A.5).
- **Komfort:** globale Suche, Duplizieren von Aufträgen, Kundenhistorie (Umsatz, offene Posten), Dashboard-Erweiterungen (offene Forderungen, durchschnittliche Zahlungsdauer, Umsatz-Vorjahresvergleich).

---

### M11 – E-Rechnung (optional, empfohlen)

**Hintergrund:** In Deutschland müssen Unternehmen seit 2025 im B2B E-Rechnungen empfangen können. Die Pflicht zur Ausstellung kommt schrittweise (2027/2028). Kleinunternehmer sind von der Ausstellungspflicht ausgenommen. **Aktuelle Rechtslage vor Umsetzung recherchieren und im ADR festhalten.**

- Pro Kunde einstellbar: Rechnung als **ZUGFeRD/Factur-X** (PDF/A-3 mit eingebettetem CII-XML, Profil mindestens EN 16931) oder als **XRechnung** (UBL oder CII, für öffentliche Auftraggeber mit Leitweg-ID).
- Das XML wird aus dem Invoice-Snapshot erzeugt und gegen die offiziellen Schemas bzw. Schematron validiert (KoSIT-Validator in der CI). Die PDF/A-3-Konvertierung läuft per `pdf-lib` oder vergleichbar. Die Ablage erfolgt wie in M5 lokal, der Hash wird über die finale Datei gebildet.
- MCP-Tool `get_invoice_xml`.

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

**Akzeptanz:** Alle Scans ohne High- oder Critical-Funde, die ASVS-Checkliste vollständig, ein frischer Deploy nach Doku gegen eine leere Mongo funktioniert, und der Import eines echten (anonymisierten) Legacy-Backups läuft durch.

---

## TEIL C – Startprompt für jede Session (Vorlage)

```
Du arbeitest am Projekt EasyBill. Lies zuerst CLAUDE.md, docs/ARCHITECTURE.md,
docs/PROGRESS.md und docs/adr/*. Der folgende gemeinsame Kontext (Teil A) gilt verbindlich:

<Teil A hier einfügen>

Deine Aufgabe ist ausschließlich Meilenstein <Mx>:

<Abschnitt Mx hier einfügen>

Arbeite die Aufgaben vollständig ab und halte die Definition of Done (A.6) ein.
Recherchiere aktuelle Versionen und Spezifikationen, bevor du Abhängigkeiten
hinzufügst. Frag mich, wenn eine fachliche Entscheidung offen ist. Aktualisiere
am Ende docs/PROGRESS.md mit einer Übergabe für den nächsten Agenten und committe.
```
