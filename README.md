# pos-mono-ui

Angular 16 frontend for CicdPOS: POS/cashier, products, categories, inventory, orders, customers, labels, reports, billing, and admin (settings, users). Uses Angular Material and JWT auth.

## Prerequisites

- **Node.js 18+** and **npm**
- The **pos-mono-api** backend running (e.g. at `http://localhost:8080`) for full functionality

## Quick start

1. **Install and run:**

   ```bash
   npm ci
   npm start
   ```

2. Open **http://localhost:4200**. Log in with a user created in the API (or register if enabled).

## Commands

| Command        | Description                    |
|----------------|--------------------------------|
| `npm start`    | Dev server (port 4200)         |
| `npm run build`| Production build → `dist/pos-mono-ui` |
| `npm test`     | Unit tests (Karma)            |

## Configuration

- **Dev:** API base URL is in `src/environments/environment.ts` (default `http://localhost:8080`).
- **Prod:** API URL is set in `src/environments/environment.prod.ts` (e.g. Azure App Service URL).

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs tests and deploys the build to Azure Static Web Apps on push to `main`. Set `AZURE_STATIC_WEB_APPS_API_TOKEN_*` in repo secrets.
