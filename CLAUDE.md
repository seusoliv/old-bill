# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (root directory)
```bash
npm start          # Dev server
npm run build      # Production build → dist/bill-killer/browser/
npm test           # Karma/Jasmine tests
```

### Backend (Backend/ directory)
```bash
npm run start:dev  # Dev server with nodemon + auto-compile
npm run build      # Compile TypeScript → dist/
npm run lint       # ESLint
npm test           # Jest
```

## Architecture

BillKiller is a German-language invoice management PWA. The frontend is Angular 19 with IndexedDB for offline-first storage; the backend is Express.js for PDF generation and email delivery.

**Important:** IndexedDB is origin-bound — data on `localhost` is separate from `easy-bill.oe-home.de`.

### Frontend (`src/`)

Angular 19 standalone components using signals (`resource()`, `computed()`) for reactivity. All views follow the same pattern:
- `resource()` with no `request` (fires once) or with a search signal for filtered views
- `computed()` for all derived state
- `inject()` for DI (no constructor injection)
- `protected readonly` for all component properties
- `takeUntilDestroyed(this.destroyRef)` for subscription cleanup

### Views (`src/app/views/`)

| Route | Component | Description |
|---|---|---|
| `/dashboard` | `DashboardComponent` | KPI cards, monthly revenue chart (CSS-only), top 5 customers, order state breakdown. **Default route.** |
| `/order-overview` | `OrderOverviewComponent` | Order CRUD, PDF generation, email dispatch, JSON export (→ backend), JSON import dialog |
| `/customer-overview` | `CustomerOverviewComponent` | Customer CRUD, XLSX import, JSON export (→ backend) |
| `/articles-overview` | `ArticlesOverviewComponent` | Article type CRUD, XLSX import |
| `/tax-report` | `TaxReportComponent` | EÜR income list, grouped by month, filtered by year (current year ±5/+10). Only CLOSED orders. |
| `/help` | `HelpComponent` | Step-by-step domain migration guide |

### Storage layer (`src/app/services/storage/`)

Each entity has its own service whose public API is unchanged, but the services now
delegate to a **storage abstraction** that is switchable between two backends:

| Service | Key method | Notes |
|---|---|---|
| `CustomersService` | `getAllCustomers()`, `findCustomers(search, start, end)` | Paginated search |
| `OrdersService` | `getAllOrders()`, `findOrders(search)` | Search by name or order number |
| `ArticleTypesService` | `findArticleTypes(search)` | Empty string returns all |

**Storage switch:** `StorageModeService` (`src/app/services/storage-mode.service.ts`),
backed by `localStorage` key `useSqlite` (default `false`). Toggled at runtime via a
slide-toggle in the help view (`/help`); the value is read at startup, so toggling
reloads the page to apply it.
- `false` → **IndexedDB** (`idb`), offline-first, origin-bound. CRUD + search run in the browser.
- `true` → **SQLite via backend** (`BACKEND_URL`). CRUD **and search run server-side as SQL**,
  so a future MCP server can hit the same tables directly.

Each entity defines a store interface + two implementations under
`src/app/services/storage/stores/` (`Idb*Store`, `Http*Store`). `store.providers.ts`
binds the `*_STORE` injection tokens to the chosen implementation (read from
`StorageModeService`); `app.config.ts` registers them and `appInitialize` skips
IndexedDB schema setup when SQLite mode is on. `Http*Store` for orders revives ISO
date strings back to `Date`.

All services use `update*()` (→ `put`/upsert) to preserve IDs on imports.

### Backend (`Backend/src/`)

Express 5 server. PDF/email/backup are stateless; when `USE_SQLITE` is on, the
`/db/*` endpoints persist all data in a local **SQLite** file (`better-sqlite3`).

| Endpoint | Purpose |
|---|---|
| `POST /orders` | Generate PDF invoice (pdfmake) |
| `POST /orders/send-invoice` | Send invoice via email (Nodemailer) |
| `POST /orders/backup` | Write orders JSON to `FILE_SAVE_LOCATION/backup_orders/` |
| `POST /customers/backup` | Write customers JSON to `FILE_SAVE_LOCATION/backup_customer/` |
| `GET /db/:store?search=&start=&end=` | List/search (server-side SQL). `:store` ∈ `customer\|articleTypes\|orders` |
| `GET /db/orders?customerNumber=&state=&createdFrom=&createdTo=&onlyOverdue=` | Extra order filters (AND-combined): exact customer id, `state`, created-date range (by day, inclusive), past-due unpaid orders |
| `GET /db/:store/:key` | Get one by key |
| `GET /db/articleTypes/by-number/:articleNumber` | Article-type lookup by article number |
| `POST /db/:store` `{value}` | Insert, returns `{key}` |
| `PUT /db/:store` `{value}` | Upsert (preserves key), returns `{key}` |
| `DELETE /db/:store/:key` | Delete |
| `POST /db/articleTypes/clear` | Clear all article types |

SQLite uses **real columns** (not JSON blobs; `Order.positions` is a JSON column) so an
MCP server can query natively. Mapping/queries live in `Backend/src/services/*.repository.ts`,
schema/connection in `database.service.ts`. DB file: `SQLITE_FILE` env, else
`FILE_SAVE_LOCATION/billkiller.sqlite`.

**Backend URL** comes from `BACKEND_URL` in `src/app/constans.ts` (`http://localhost:4000`)
— the backend only works when running locally.

### MCP server (`Backend/src/mcp/`)

Exposes all backend functions as Model-Context-Protocol tools so an LLM can drive BillKiller's
data directly. Tools call the repository classes (and `PdfGenerator`/`InvoiceMailService`)
in-process — same code path as the REST API, sharing the same SQLite DB.

Two transports share the same tools (`register-tools.ts`, zod schemas in `schemas.ts`):
for each store `customer` / `articleTypes` / `orders` → `list_*`, `get_*`, `create_*`,
`update_*`, `delete_*`, plus `get_article_type_by_number`, `clear_article_types`,
`generate_invoice_pdf`, `send_invoice_mail`.

Additional automation tools:
- `list_orders` takes structured filters: `customerNumber`, `state`, `createdFrom`/`createdTo`,
  `onlyOverdue`, `start`/`end` (all optional, AND-combined).
- `list_article_types` adds optional `unit` (`h`/`pc`) and `isNegativePosition` filters.
- `get_orders_by_customer`, `get_overdue_orders`, `get_customer_with_orders` (customer + orders),
  `get_revenue_report` (CLOSED orders summed & grouped by month; optional `year`/`from`/`to`).
- `trigger_orders_backup` / `trigger_customers_backup` (dump DB to `FILE_SAVE_LOCATION/backup_*`).
Filter/aggregation SQL lives in `*.repository.ts`; backup logic in `services/backup.service.ts`
(shared with the REST `/orders/backup` & `/customers/backup` routes).

- **stdio** (`mcp/stdio.ts`, script `npm run mcp:stdio` → `node dist/Backend/src/mcp/stdio.js`):
  the transport Claude Desktop actually launches. Opens the SQLite DB directly (loads the
  project `.env` relative to its own path, so it hits the same `SQLITE_FILE` as the backend) —
  the Express server does **not** need to be running. Diagnostics go to stderr (stdout is the
  protocol channel).
- **Streamable HTTP** (`mcp/http.ts` → `mcpRouter`, mounted at **`/mcp`** in `routers/router.ts`):
  stateless, a fresh server+transport per request; `GET /mcp` returns 405. For clients that
  speak MCP-over-HTTP directly (Cursor, MCP Inspector at `http://localhost:4000/mcp`).

**Connecting Claude Desktop** (Settings → Developer → Edit Config; build first with
`npm run build`). Remote URLs are **not** supported in `claude_desktop_config.json` — it only
takes stdio `command`/`args`, so point it at the built stdio entry:
```json
{
  "mcpServers": {
    "easy-bill-server": {
      "command": "node",
      "args": ["C:\\ABSOLUTE\\PATH\\TO\\BillKiller\\Backend\\dist\\Backend\\src\\mcp\\stdio.js"]
    }
  }
}
```
Optionally pin the DB with `"env": {"SQLITE_FILE": "C:\\...\\billkiller.sqlite"}`. Restart
Claude Desktop fully (tray → Quit) after editing. (`mcp-remote` bridging the HTTP endpoint is
an alternative but adds an npx/network dependency.)

### Data Models

```typescript
Order {
  orderNumber?: number        // IDB keyPath, auto-increment
  customerNumber: number      // ref to Customer.id
  customerName: string        // denormalized
  isMailAddressAvailable: boolean
  state: OrderState           // OPEN | IN_PROGRESS | SENT_MAIL | CLOSED
  createdDate: Date
  closedDate?: Date           // set when state → CLOSED
  payDate?: Date              // set to createdDate + 14 days when PDF created
  positions: Position[]
  discount: number | null
  total: number               // pre-calculated
}

Customer { id?, name, surname, email?, zipCode, street, city, houseNumber }

ArticleType { id?, name, unit: HOUR|PIECE, prize, articleNumber, isFlexPrice, isNegativePosition, additionalInformation? }

Position { name, count, prize, unit, discount, isFlexPrice, isNegativePosition }
```

**No VAT/MwSt fields exist** in any model.

### Shared utilities

- `CalcPrizeUtils.calcTotalPrize(positions, discount)` — `src/app/shared/utils/calc-prize.ts`
- `CurrencyPipe`, `DatePipe` — Angular built-ins, used throughout
- `SnackBarService` — `openSnackBar(message)` for toast notifications
- `LoadingSpinnerService` — `activateLoadingSpinner()` / `deactivateLoadingSpinner()` (always pair with `.finally()`)
- `ConfirmationDialogComponent` — reusable yes/no dialog
- `DEBOUNCE_TIME` constant — `src/app/constans`

### Navigation (`src/app/app.component.html`)

Fixed 250px left sidebar with `mat-raised-button` + FontAwesome icons. Order: Dashboard → Aufträge → Kunden → Artikel → Steuerreport → Hilfe.

### Adding a new view — checklist

1. Create `src/app/views/[name]/[name].component.ts/html/scss`
2. Add route in `src/app/app.routes.ts`: `{path: '[name]', loadComponent: ((): any => MyComponent)}`
3. Add nav button in `src/app/app.component.html` following the existing pattern
4. No changes needed to `app.component.ts` (lazy-loaded via router)

### Infrastructure

- **Angular build output:** `dist/bill-killer/browser/`
- **Backend `.env` variables:** `SERVER_PORT`, `FILE_SAVE_LOCATION`, `SQLITE_FILE` (optional, SQLite DB path), `SMTP_*`, `BUSINESS_NAME`, `STREET`, `ZIP_CODE`, `CITY`, `PHONE`, `IBAN`, `BANK`, `INVOICE_*`, `MAIL_*`

### Git workflow

- Feature branches off `main`, pushed to Azure DevOps (`dev.azure.com/BusinessBook/BillKiller`)
- Remote configured with PAT token in URL
- Commit author: `olli`
