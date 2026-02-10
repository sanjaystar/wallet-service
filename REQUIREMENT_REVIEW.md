# Requirement Review & Score — Dino Wallet Service

Review against **requirement.md**. Scores are for assessment only (not official).

---

## Scoring Rubric

| Category | Max | Your Score | Notes |
|----------|-----|------------|--------|
| **A. Data Seeding & Setup** | 20 | **20** | All items present |
| **B. API Endpoints** | 15 | **15** | RESTful, complete |
| **C. Functional Logic** | 25 | **25** | All 3 flows + tech stack |
| **D. Critical Constraints** | 25 | **25** | Concurrency + Idempotency |
| **E. Deliverables** | 15 | **15** | README + seed |
| **Core total** | **100** | **100** | ✅ Passing |
| **Brownie: Deadlock avoidance** | 5 | **5** | Lock order implemented |
| **Brownie: Ledger-based** | 5 | **5** | Double-entry ledger |
| **Brownie: Containerization** | 5 | **0** | Missing |
| **Brownie: Hosting** | 5 | **0** | Missing |
| **Brownie total** | **20** | **10** | |
| **TOTAL** | **120** | **110** | |

---

## Section-by-Section Review

### A. Data Seeding & Setup (20/20) ✅

| Requirement | Done? | Evidence |
|-------------|-------|----------|
| Script initializes DB (e.g. seed.sql) | ✅ | `seed.sql` — creates DB, tables, seed data |
| 1. Asset types (e.g. Gold Coins, Diamonds, Loyalty Points) | ✅ | Credits, Gold Coins, Diamonds, Loyalty Points |
| 2. At least one system wallet (Treasury / Revenue) | ✅ | TREASURY, REWARDS, REVENUE per asset type |
| 3. At least two users with initial balances | ✅ | John Doe (500), Jane Smith (1000) |

**Nothing missing.**

---

### B. API Endpoints (15/15) ✅

| Requirement | Done? | Evidence |
|-------------|-------|----------|
| RESTful endpoints for transactions | ✅ | `POST /api/wallets/topup`, `bonus`, `spend` |
| Check balance | ✅ | `GET /api/wallets/:userId`, optional `?assetId=` |

**Nothing missing.**

---

### C. Functional Logic (25/25) ✅

| Requirement | Done? | Evidence |
|-------------|-------|----------|
| Tech stack: backend + relational DB (ACID) | ✅ | NestJS + MySQL, transactions used |
| 1. Wallet top-up (user purchases credits) | ✅ | Treasury → user, transactional |
| 2. Bonus / incentive (free credits) | ✅ | Rewards → user, transactional |
| 3. Purchase / spend (user spends in-app) | ✅ | User → Revenue, balance check after lock |

**Nothing missing.**

---

### D. Critical Constraints (25/25) ✅

| Requirement | Done? | Evidence |
|-------------|-------|----------|
| Concurrency & race conditions | ✅ | `FOR UPDATE` locks, wallets locked in ascending ID order; balance checks after lock |
| Idempotency | ✅ | Unique `idempotency_key` in DB; app check + duplicate-key handling; **client can send `idempotencyKey`** in body |

**Nothing missing.**

---

### E. Deliverables (15/15) ✅

| Requirement | Done? | Evidence |
|-------------|-------|----------|
| Source code | ✅ | Repo present |
| seed.sql / setup script | ✅ | `seed.sql` |
| README: how to spin up DB and run seed | ✅ | README has steps |
| README: technology choice and why | ✅ | NestJS, Sequelize, MySQL explained |
| README: strategy for concurrency | ✅ | Lock order, idempotency, negative balance prevention |

**Nothing missing.**

---

## Brownie Points

| Item | Done? | Score | Evidence / Gap |
|------|-------|--------|----------------|
| Deadlock avoidance | ✅ | 5/5 | `lockWalletsInOrder()` — consistent ascending ID lock order |
| Ledger-based architecture | ✅ | 5/5 | `ledger_entries` with IN/OUT, `balance_after`; double-entry per transaction |
| Containerization (Dockerfile + docker-compose) | ❌ | 0/5 | **Missing** — no project `Dockerfile` or `docker-compose.yml` |
| Hosting (live URL) | ❌ | 0/5 | **Missing** — no deployment or URL in README |

---

## What’s Missing / Needs to Be Done

### Must-have (Core)

- **Nothing.** All core requirements and deliverables are met.

### Optional (Brownie)

1. **Containerization**
   - Add a **Dockerfile** that builds and runs the NestJS app (Node image, install deps, run app).
   - Add **docker-compose.yml** that:
     - Starts MySQL (with `wallet_db` and credentials from env).
     - Runs the app (depends on DB).
     - Runs the seed (e.g. after DB is healthy: `mysql ... < seed.sql` or an init container).
   - Document in README: “Run with Docker: `docker-compose up --build`” (or equivalent).

2. **Hosting**
   - Deploy app + DB (or managed DB) to a cloud provider (e.g. Railway, Render, AWS, GCP).
   - Add the **live URL** to the README (and optionally to API_REFERENCE.md as base URL for “live” env).

---

## Summary

- **Core score: 100/100** — All functional and non-functional requirements and deliverables are satisfied. The solution is **passing**.
- **Brownie score: 10/20** — Deadlock avoidance and ledger-based design are implemented; containerization and hosting are not.
- **Total: 110/120.**

To reach the full 120/120, add Dockerfile + docker-compose (and optionally document a live URL if you deploy).
