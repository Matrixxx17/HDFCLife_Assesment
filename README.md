# HDFCINSURA — Insurance Policy Management System

A production-grade, full-stack **Insurance Policy Management System** built using the **MERN stack** with **TypeScript**. The platform features strict role-based access control (RBAC), database-level ownership isolation between agents, real-time premium calculations, automated PII masking, and cookie-based JWT authentication with sliding-window session refresh.

---

## 🔗 Live Deployment

| Service | URL |
|---|---|
| **Frontend (Vercel)** | https://hdfcinsura.vercel.app |
| **Backend API (Render)** | https://insureflow-backend-u92x.onrender.com |
| **Health Check** | https://insureflow-backend-u92x.onrender.com/healthz |

> **Note:** The backend runs on Render's free tier and may take **20–40 seconds** to wake up after inactivity. Open the health check URL first before testing.

---

## 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@insurance.com` | `admin123` |
| Agent 1 | `agent1@insurance.com` | `agent123` |
| Agent 2 | `agent2@insurance.com` | `agent123` |

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js + Express.js + TypeScript |
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript |
| **Database** | MongoDB (Mongoose ODM) |
| **State Management** | TanStack React Query v5 |
| **Auth** | Cookie-based JWT (HTTPOnly, Secure, SameSite) — 15 min expiry |
| **Validation** | Zod (shared between frontend and backend) |
| **Forms** | React Hook Form + Zod resolver |
| **Styling** | Tailwind CSS + Framer Motion |
| **Testing** | Jest + Supertest + mongodb-memory-server |
| **API** | RESTful via Axios |

---

## 📁 Directory Structure

```
/
├── shared/            # Shared Zod schemas, types, and utilities
│   └── src/index.ts   # LoginSchema, AgentCreateSchema, CustomerSchema, etc.
│
├── backend/           # Express API server
│   ├── src/
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── services/      # Business logic + DB queries
│   │   ├── models/        # Mongoose schemas (User, Customer, Policy)
│   │   ├── routes/        # Route definitions + middleware
│   │   ├── middleware/     # Auth, ownership, error handling
│   │   ├── scripts/       # Seed script
│   │   └── tests/         # Jest test suites
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/          # Next.js 14 App Router client
│   ├── src/
│   │   ├── app/           # Pages and layouts
│   │   │   ├── (auth)/    # Admin & Agent login pages
│   │   │   ├── (dashboard)/ # Admin & Agent dashboards
│   │   │   └── page.tsx   # Landing/portal selector
│   │   ├── components/    # Auth provider, toast, theme, policy wizard
│   │   └── lib/           # Axios client
│   ├── .env.example
│   ├── vercel.json
│   └── next.config.js
│
├── package.json       # Root npm workspaces config
├── render.yaml        # Render deployment config
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v18 or higher
- MongoDB running locally **OR** a MongoDB Atlas connection string

### 1. Clone the Repository
```bash
git clone https://github.com/Matrixxx17/HDFCLife_Assesment.git
cd HDFCLife_Assesment
```

### 2. Install All Dependencies
From the root directory (uses npm workspaces):
```bash
npm install
```

### 3. Configure Environment Variables

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

> See `backend/.env.example` and `frontend/.env.example` for all available variables.

### 4. Seed the Database
Creates the default Admin and Agent accounts:
```bash
npm run seed --workspace=backend
```

**Seeded credentials:**
| Role | Email | Password |
|---|---|---|
| Admin | `admin@insurance.com` | `admin123` |
| Agent 1 | `agent1@insurance.com` | `agent123` |
| Agent 2 | `agent2@insurance.com` | `agent123` |

### 5. Run Development Servers
```bash
# Terminal 1 — Start backend (port 5000)
npm run dev --workspace=backend

# Terminal 2 — Start frontend (port 3000)
npm run dev --workspace=frontend
```

Open **http://localhost:3000** to access the portal.

---

## 🧪 Running Tests

```bash
# Run all backend tests
npm run test --workspace=backend
```

Tests use `mongodb-memory-server` — no external database connection is required.

**Test coverage includes:**
- Business rule validation (age, PAN, Aadhaar, mobile, premium, dates)
- PII masking utilities (Aadhaar, PAN, Mobile)
- Role-based access control enforcement
- Agent ownership isolation (cross-agent access prevention)
- Policy issuance workflow validation

---

## 🚀 Deployment

### Backend → Render

| Setting | Value |
|---|---|
| **Build Command** | `npm install && npm run build:backend` |
| **Start Command** | `node backend/dist/server.js` |
| **Health Check** | `/healthz` |

**Required Render Environment Variables:**
```ini
NODE_ENV=production
MONGODB_URI=<your_atlas_connection_string>
JWT_SECRET=<strong_random_secret>
FRONTEND_URL=https://hdfcinsura.vercel.app
```

### Frontend → Vercel

| Setting | Value |
|---|---|
| **Root Directory** | `frontend` |
| **Framework** | Next.js |
| **Build Command** | *(auto from vercel.json)* |
| **Install Command** | `npm install --prefix=..` |

**Required Vercel Environment Variables:**
```ini
NEXT_PUBLIC_API_URL=/api
BACKEND_API_URL=https://<your-render-service>.onrender.com
```

> The frontend uses Next.js **rewrite rules** to proxy `/api/*` requests to the backend, making auth cookies first-party and solving mobile browser restrictions.

---

## 🏛 Key Architecture Decisions

### 1. Monorepo with npm Workspaces
Three packages: `shared`, `backend`, `frontend`. The `shared` package contains Zod schemas used for validation on **both** the client (instant visual feedback) and server (authoritative enforcement).

### 2. Layered Backend Architecture
- **Routes** → define endpoints + apply middleware
- **Controllers** → HTTP serialization + call Services
- **Services** → business rules + DB queries
- **Models** → Mongoose schemas

### 3. Agent Ownership Isolation
All MongoDB queries in agent-facing services are scoped by `agentId` from the authenticated JWT. A `checkCustomerOwnership` middleware verifies ownership before any write. Client-supplied agent IDs are never trusted.

### 4. PII Masking
A custom serializer function masks sensitive fields before any JSON response:
- **Aadhaar** `123456789012` → `XXXX-XXXX-9012`
- **PAN** `ABCDE1234F` → `ABCXX12XXF`
- **Mobile** `9876543210` → `98XXXXXX10`

### 5. Sliding-Window Session Refresh
If a valid request arrives within the last 5 minutes of a session, the backend silently issues a new 15-minute token in the response cookie — keeping active users seamlessly logged in.

### 6. Cross-Domain Cookie Handling
When deployed (Vercel + Render), the Next.js `rewrites` in `next.config.js` proxy all `/api/*` requests from the frontend domain to Render, making auth cookies first-party. This resolves mobile browser SameSite restrictions without any security compromises.

---

## 📋 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login as Admin or Agent |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current session user |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/agents` | Create a new Agent account |
| `GET` | `/api/admin/agents` | List agents (paginated, filterable) |
| `GET` | `/api/admin/agents/:id` | View agent profile + stats |
| `DELETE` | `/api/admin/agents/:id` | Soft-deactivate an agent |
| `GET` | `/api/admin/analytics` | System-wide analytics dashboard |

### Agent — Customers
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/customers` | Create a new customer |
| `GET` | `/api/customers/search?q=` | Search own customers |
| `GET` | `/api/customers/:id` | View customer detail |
| `PUT` | `/api/customers/:id` | Edit own customer |

### Agent — Policies
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/policies/issue` | Issue a policy for a customer |
| `GET` | `/api/policies/customer/:customerId` | List policies for a customer |

---

## ✅ Business Rules Enforced

1. Customer age must be between **18 and 65 years**
2. **PAN is mandatory** if premium > ₹50,000
3. **Nominee is mandatory** and cannot be the same person as the policyholder
4. Mobile must be **10 digits** starting with 6, 7, 8, or 9
5. Aadhaar must be **exactly 12 digits**
6. Policy term must be one of **10, 15, 20, 25, or 30 years**
7. Premium frequency must be **Monthly, Quarterly, Half-Yearly, or Yearly**
8. **Minimum premium is ₹5,000**
9. Policy start date **cannot be in the past**
10. **PAN and Aadhaar must be unique** across all customers
11. Once a policy is issued, the **owning Agent cannot be changed**
