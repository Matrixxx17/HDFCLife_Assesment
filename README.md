# HDFCINSURA: Insurance Policy Management System

HDFCINSURA is a production-grade, full-stack Insurance Policy Management System built using the MERN stack with TypeScript. The platform features strict role-based access control (RBAC), database-level ownership isolation, real-time premium calculations, and automated PII masking serialization to ensure maximum privacy and security.

---

## Technical Stack

- **Backend**: Node.js + Express.js + Mongoose (MongoDB) + TypeScript
- **Frontend**: Next.js 14 (App Router) + React 18 + TanStack Query + Tailwind CSS + Framer Motion
- **Shared Module**: Conceptually unified TypeScript package for Zod validation schemas and shared business rules
- **Auth**: Cookie-based sessions using signed HTTPOnly, Secure, SameSite=Strict JSON Web Tokens (JWT) with 15-minute expiration and sliding-window refresh
- **Testing**: Jest + Supertest (Backend), Jest + React Testing Library (Frontend)

---

## Key Design Decisions & Architecture

### 1. Monorepo Organization & Shared Validations
We set up `npm workspaces` separating the project into `/shared`, `/backend`, and `/frontend`. 
- The `/shared` package acts as the single source of truth for validation.
- Zod schemas are shared between client-side form controls (for instant visual feedback) and backend services (source of truth).

### 2. Layered Architecture (SOLID)
No business logic lives in the backend controllers. The backend implements a robust separation of concerns:
- **Routes**: Define endpoints and apply authentication/authorization middleware.
- **Controllers**: Handle HTTP serialization, parse Zod inputs, and call Services.
- **Services**: Enforce domain-specific business rules, database queries, and credentials hashing.
- **Models**: Standard Mongoose schemas representing database collections.

### 3. Query-Level Ownership Isolation
To prevent vertical or horizontal privilege escalation (e.g. Agent A querying Agent B's clients or policies via ID manipulation):
- Mongoose queries in services are explicitly scoped by `agentId` derived directly from the authenticated session context.
- Middleware intercepts customer/policy routes (e.g. `checkCustomerOwnership`) to verify ownership before hitting controller actions.
- Client-supplied agent IDs are never trusted during mutations.

### 4. Reusable PII Masking Serialization
All client details (Aadhaar, PAN, Mobile) are masked by a custom serializer wrapper before being sent in JSON responses:
- **Aadhaar**: Masks the first 8 digits separated by hyphens (e.g., `XXXX-XXXX-9012`).
- **PAN**: Obscures internal digits leaving signature flags visible (e.g., `ABCXX12XXF`).
- **Mobile**: Masks intermediate digits (e.g., `98XXXXXX10`).
This serializer acts at the controller response layer to ensure unmasked data is never exposed over the wire.

### 5. Sliding-Window Session Refresh
To maintain user engagement without security compromise, the backend auth middleware monitors cookie token expiration. If a valid request is received and the session has less than 5 minutes of validity remaining, a new JWT is issued and set in the cookie, extending active sessions by another 15 minutes.

---

## Directory Structure

```text
/shared      → Common Zod validation schemas, types, and premium calculator functions
/backend     → Express API Server (routes, controllers, services, models, tests)
/frontend    → Next.js Client App (App Router layout, wizard, dashboards, portal selector)
```

---

## Environment Variables

### Backend `.env`
Create a `.env` in the `/backend` folder:
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/insurance-policy-system
JWT_SECRET=super_secret_session_jwt_key_987654321
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend `.env`
Create a `.env` in the `/frontend` folder:
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Getting Started

### 1. Installation
Install all dependencies from the root directory:
```bash
npm install
```

### 2. Seeding the Database
Provision default Admin and Agent roles:
```bash
npm run seed
```

**Seed Credentials:**
- **Supervisory Admin**: `admin@insurance.com` / `admin123`
- **Agent Alice**: `agent1@insurance.com` / `agent123`
- **Agent Bob**: `agent2@insurance.com` / `agent123`

### 3. Run Development Servers
Start both backend and frontend servers:
```bash
# Terminal 1 - Backend Server
npm run dev:backend

# Terminal 2 - Frontend Next.js Client
npm run dev:frontend
```

Open `http://localhost:3000` to access the portal.

---

## Running Tests

Verify the backend suite (which covers business rules, masking utilities, and ownership isolation tests):
```bash
npm run test:backend
```
All 30 backend tests run against an in-memory MongoDB server (`mongodb-memory-server`) to ensure zero-state dependency and side effects.
