# HDFCINSURA — Insurance Policy Management System

A full-stack insurance policy management platform built on the MERN stack with TypeScript. It handles role-based access for Admins and Agents, enforces real-world insurance business rules, masks PII in every response, and keeps sessions alive through a sliding-window JWT refresh strategy.

**Live:** [hdfcinsura.vercel.app](https://hdfcinsura.vercel.app)  
**API:** [insureflow-backend-u92x.onrender.com](https://insureflow-backend-u92x.onrender.com)  
**Health check:** [/healthz](https://insureflow-backend-u92x.onrender.com/healthz)

> The backend is on Render's free tier — hit the health check URL first so it wakes up before you test anything.

---

## Screenshots

### Portal Selector
![Landing page](docs/screenshots/landing.png)

### Admin Login
![Admin login](docs/screenshots/admin_login.png)

### Admin Dashboard
![Admin dashboard](docs/screenshots/admin_dashboard.png)

### Agent Dashboard
![Agent dashboard](docs/screenshots/agent_dashboard.png)

---

## Demo Credentials

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Admin   | `admin@insurance.com`  | `admin123` |
| Agent 1 | `agent1@insurance.com` | `agent123` |
| Agent 2 | `agent2@insurance.com` | `agent123` |

---

## Tech Stack

| Layer            | Technology                                         |
|------------------|----------------------------------------------------|
| Backend          | Node.js · Express.js · TypeScript                  |
| Frontend         | Next.js 14 (App Router) · React 18 · TypeScript    |
| Database         | MongoDB (Mongoose ODM)                             |
| State Management | TanStack React Query v5                            |
| Auth             | Cookie-based JWT (HTTPOnly · Secure · SameSite)    |
| Validation       | Zod — shared schema between frontend and backend   |
| Forms            | React Hook Form + Zod resolver                     |
| Styling          | Tailwind CSS + Framer Motion                       |
| Testing          | Jest · Supertest · mongodb-memory-server           |
| API              | REST via Axios                                     |

---

## Project Structure

```
/
├── shared/            # Zod schemas + types shared between frontend and backend
│   └── src/index.ts
│
├── backend/
│   └── src/
│       ├── controllers/   # HTTP handlers
│       ├── services/      # Business logic + DB queries
│       ├── models/        # Mongoose schemas (User, Customer, Policy)
│       ├── routes/        # Route definitions + middleware binding
│       ├── middleware/    # Auth, ownership, error handling
│       ├── utils/         # PII masking helpers
│       ├── scripts/       # Seed script
│       └── tests/         # Jest test suites
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/       # Admin & Agent login pages
│       │   ├── (dashboard)/  # Admin & Agent dashboards
│       │   └── page.tsx      # Portal selector (landing)
│       ├── components/       # Auth provider, toast, theme, policy wizard
│       └── lib/              # Axios client config
│
├── package.json       # npm workspaces root
└── render.yaml        # Render deployment config
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB running locally **or** a MongoDB Atlas connection string

### 1. Clone

```bash
git clone https://github.com/Matrixxx17/HDFCLife_Assesment.git
cd HDFCLife_Assesment
```

### 2. Install

Run this from the repo root — npm workspaces installs everything in one shot:

```bash
npm install
```

### 3. Environment variables

**Backend** — create `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/insurance-policy-system
JWT_SECRET=super_secret_session_jwt_key_987654321
FRONTEND_URL=http://localhost:3000
```

**Frontend** — create `frontend/.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

See `backend/.env.example` and `frontend/.env.example` for the full list of available variables.

### 4. Seed the database

Creates the default Admin and Agent accounts:

```bash
npm run seed --workspace=backend
```

### 5. Start development servers

```bash
# Terminal 1 — backend on port 5000
npm run dev --workspace=backend

# Terminal 2 — frontend on port 3000
npm run dev --workspace=frontend
```

Open **http://localhost:3000**.

---

## Running Tests

```bash
npm run test --workspace=backend
```

Uses `mongodb-memory-server` so no external database is needed.

**What's covered:**
- Business rule validation (age limits, PAN/Aadhaar format, mobile format, premium floor, date rules)
- PII masking (Aadhaar, PAN, Mobile)
- RBAC enforcement (Admin vs Agent routes)
- Agent ownership isolation — agent A cannot touch agent B's customers

---

## API Reference

### Auth

| Method | Endpoint          | Description            |
|--------|-------------------|------------------------|
| POST   | `/api/auth/login` | Login (Admin or Agent) |
| POST   | `/api/auth/logout`| Clear session cookie   |
| GET    | `/api/auth/me`    | Get current session    |

### Admin

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| POST   | `/api/admin/agents`       | Create a new Agent account         |
| GET    | `/api/admin/agents`       | List agents (paginated, filterable)|
| GET    | `/api/admin/agents/:id`   | Agent profile + stats              |
| DELETE | `/api/admin/agents/:id`   | Soft-deactivate an agent           |
| GET    | `/api/admin/analytics`    | System-wide analytics              |

### Agent — Customers

| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| POST   | `/api/customers`          | Create customer            |
| GET    | `/api/customers/search?q=`| Search own customers       |
| GET    | `/api/customers/:id`      | View customer              |
| PUT    | `/api/customers/:id`      | Update customer            |

### Agent — Policies

| Method | Endpoint                            | Description                  |
|--------|-------------------------------------|------------------------------|
| POST   | `/api/policies/issue`               | Issue policy for a customer  |
| GET    | `/api/policies/customer/:customerId`| List policies for a customer |

---

## Business Rules

1. Customer age must be between **18 and 65 years**
2. PAN is **mandatory** when premium > ₹50,000
3. Nominee is **mandatory** and cannot be the same person as the policyholder
4. Mobile must be **10 digits** starting with 6, 7, 8, or 9
5. Aadhaar must be **exactly 12 digits**
6. Policy term: **10, 15, 20, 25, or 30 years**
7. Premium frequency: **Monthly, Quarterly, Half-Yearly, or Yearly**
8. Minimum premium: **₹5,000**
9. Policy start date **cannot be in the past**
10. PAN and Aadhaar must be **unique** across all customers
11. Once issued, the **owning agent cannot be changed** on a policy

---

## Architecture Notes

**Monorepo via npm Workspaces** — `shared`, `backend`, `frontend` are three separate packages. The `shared` package holds Zod schemas that run on both client (for instant inline validation) and server (authoritative enforcement). This eliminates duplicated validation logic entirely.

**Layered backend** — Routes bind middleware and hand off to Controllers. Controllers handle HTTP serialization and delegate to Services. Services own all business logic and DB queries. Models define the data shapes.

**Agent data isolation** — Every MongoDB query in agent-facing services is scoped to `agentId` extracted from the authenticated JWT. A dedicated `checkCustomerOwnership` middleware gates all write operations. The server never trusts a client-supplied agent ID.

**PII masking** — A serializer runs before any customer or policy data leaves the server:
- Aadhaar `123456789012` → `XXXX-XXXX-9012`
- PAN `ABCDE1234F` → `ABCXX12XXF`
- Mobile `9876543210` → `98XXXXXX10`

**Sliding-window session refresh** — If a valid request arrives within the last 5 minutes of a 15-minute session window, the backend transparently issues a new token in the response cookie. Active users never hit an unexpected logout.

**Cross-domain cookie handling** — Next.js `rewrites` in `next.config.js` proxy `/api/*` from the Vercel domain to Render, making cookies first-party. This sidesteps `SameSite=None` restrictions on Safari and Firefox without any security trade-offs.
