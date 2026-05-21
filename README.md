# pos-mono-ui

Angular 16 web application for **CicdPOS** — the storefront UI for cashiers, managers, and administrators. Built with **Angular Material**, **JWT** auth, and optional **offline/PWA** support via a service worker and IndexedDB.

> **Full setup (PostgreSQL + API + UI):** see the [root README](../README.md).

---

## What this application does

CicdPOS UI is a single-page app: public landing and login, then an authenticated shell with role-based navigation. It talks to `pos-mono-api` over REST and caches data for offline POS when configured.

### Screens & features

| Route | Who uses it | Features |
|-------|-------------|----------|
| **Landing** `/` | Public | Product overview / entry to login |
| **Login / Register** | All | JWT login; self-registration when enabled |
| **Dashboard** `/app/dashboard` | Admin, Manager | Today’s KPIs: orders, revenue, averages, low-stock style alerts |
| **POS / Cashier** `/app/pos` | Cashier+ | Two layouts (**product grid** or **search/scan**); barcode; cart; customer; rewards redemption; discount; payment; tax; shift open/close on POS (if enabled); offline checkout + sync |
| **Products** `/app/products` | Manager+ | List, search, create/edit, images, categories, tax category, bulk Excel upload |
| **Categories** `/app/categories` | Manager+ | Category CRUD |
| **Customers** `/app/customers` | Cashier+ | Customer list, member cards |
| **Orders** `/app/orders` | Cashier+ | Filterable/sortable table; order detail; cancel; **refund dialog** (line-level qty); receipt actions; offline pending/failed banners |
| **Inventory** `/app/inventory` | Manager+ | Stock levels, adjustments, low-stock visibility |
| **Shifts** `/app/shifts` | Admin, Manager | All shifts; force-close |
| **My shift** `/app/my-shift` | Cashier | Open/close own shift |
| **Reports** `/app/reports` | Cashier+ | Daily/monthly/range sales; charts; Excel download |
| **Labels** `/app/labels` | Manager+ | Pre-print labels; bulk add; print sheets (company label template) |
| **Rewards** `/app/rewards` | Manager+ | Points configuration |
| **Billing** `/app/billing` | Admin | Billing/subscription view |
| **Settings** `/app/settings` | Admin | Company, logo, receipts, email (SMTP/Microsoft), tax, tax rules, currency/locale, POS layout, shift rules, offline policy, label templates, sync diagnostics |
| **Users** `/app/users` | Admin | User list, roles, activate/deactivate |
| **Access logs** `/app/access-logs` | Admin | Login/access history |
| **Backup** `/app/backup` | Admin | Download JSON/SQL backup; restore upload |
| **Guide** `/app/guide` | All | In-app help / how-to |

### UI capabilities
- **Role-based menus** — items hidden or blocked by `ADMIN` / `MANAGER` / `CASHIER`
- **HCI-aligned design** — 40px form controls, compact tables, status chips, filter/sort in headers (see `required/ui-standards.mdc`)
- **Currency & locale** — prices and dates formatted from company settings
- **Offline** — service worker + local store for POS orders; sync queue; admin-controlled offline access for dashboard/orders/POS
- **Dialogs** — product, category, customer, label, refund, and other Material dialogs
- **Error handling** — API errors shown with `ErrorCode` prefix in snackbars

### Tech stack
- **Angular 16** — modules per feature area, lazy-loaded routes
- **Angular Material** — tables, forms, dialogs, chips, snackbar
- **RxJS** — API services and state
- **IndexedDB** — offline order queue and cached catalog (via `PosLocalStoreService`)
- **Service worker** — PWA assets (see `ngsw-config.json`)

---

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **pos-mono-api** running at `http://localhost:8080` (see [pos-mono-api README](../pos-mono-api/README.md))

---

## Quick start

**From repo root (recommended):**

```bash
../script/run-ui.sh
```

**Or from this folder:**

```bash
npm ci
npm start
```

Open **http://localhost:4200**. Log in or register (if enabled on the API).

---

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Dev server (port 4200) |
| `npm run build` | Production build → `dist/pos-mono-ui` |
| `npm test` | Unit tests (Karma) |

---

## Configuration

| File | Purpose |
|------|---------|
| `src/environments/environment.ts` | Dev API URL (`http://localhost:8080`) |
| `src/environments/environment.prod.ts` | Production API URL (Azure App Service) |

All HTTP calls use `environment.apiUrl` in `src/app/core/services/*`.

---

## CI/CD

GitHub Actions deploys to **Azure Static Web Apps** on push to `main`. Set `AZURE_STATIC_WEB_APPS_API_TOKEN_*` in repo secrets.
