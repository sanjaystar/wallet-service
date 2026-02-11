# Wallet Service - Internal Wallet Management System

A production-ready internal wallet service built with NestJS, Sequelize-TypeScript, and MySQL. This service handles wallet transactions (top-up, bonus, spend) with strong guarantees for data integrity, idempotency, and concurrency control.

## 🏗️ Architecture

### Technology Stack

- **Framework**: NestJS (Node.js)
- **ORM**: Sequelize-TypeScript
- **Database**: MySQL 8.0+
- **Language**: TypeScript

### Why This Stack?

- **NestJS**: Provides excellent structure, dependency injection, and modular architecture
- **Sequelize-TypeScript**: Type-safe ORM with decorators, perfect for TypeScript projects
- **MySQL**: ACID-compliant relational database with strong transaction support

## 📊 Database Design

### Schema Overview

The system uses a **double-entry ledger architecture** for complete auditability and data integrity:

```
users
├── id (bigint, PK)
├── phone (varchar, unique)
├── name (varchar)
└── created_at (timestamp)

asset_types
├── id (bigint, PK)
├── name (varchar, unique) - e.g., 'Gold Coins', 'Diamonds', 'Loyalty Points'
├── code (varchar, unique) - e.g., 'GOLD', 'DIAMOND', 'LOYALTY'
└── created_at (timestamp)

wallets
├── id (bigint, PK)
├── user_id (bigint, FK → users.id, nullable for system wallets)
├── asset_type_id (bigint, FK → asset_types.id)
├── type (ENUM: 'USER' | 'SYSTEM')
├── name (varchar)
├── balance (bigint, stored as integer - e.g., 100 = 100 credits)
├── created_at (timestamp)
└── updated_at (timestamp)

transactions
├── id (bigint, PK)
├── type (ENUM: 'TOPUP' | 'BONUS' | 'SPEND')
├── idempotency_key (varchar, UNIQUE)
└── created_at (timestamp)

ledger_entries
├── id (bigint, PK)
├── transaction_id (bigint, FK → transactions.id)
├── wallet_id (bigint, FK → wallets.id)
├── direction (ENUM: 'IN' | 'OUT')
├── amount (bigint, transaction amount)
├── balance_after (bigint, wallet balance after this transaction)
└── created_at (timestamp)
```

### Key Design Decisions

1. **Double-Entry Ledger**: Every transaction creates two ledger entries (debit + credit), ensuring balance is always traceable
2. **Idempotency Key**: Unique constraint on `idempotency_key` prevents duplicate transactions
3. **Multi-Asset Support**: Asset types table allows support for multiple asset types (e.g.,Credits, Gold Coins, Diamonds, Loyalty Points).
4. **System Wallets**: Three system wallets act as sources/destinations for funds:
   - **TREASURY**: Source for top-ups (user purchases)
   - **REWARDS**: Source for bonuses (free credits)
   - **REVENUE**: Destination for spending (user purchases services)
5. **Balance Tracking**: `balance_after` in ledger entries provides point-in-time balance snapshots

### Relationships

- **AssetType → Wallet**: One-to-Many (one asset type can have many wallets)
- **User → Wallet**: One-to-Many (one user can have multiple wallets)
- **Wallet → LedgerEntry**: One-to-Many (one wallet has many ledger entries)
- **Transaction → LedgerEntry**: One-to-Many (one transaction has two ledger entries)

## 🔄 Transaction Flows

### 1. Top-Up (Purchase)
```
User purchases credits using real money
DEBIT:  SYSTEM_TREASURY (-amount)
CREDIT: USER_WALLET (+amount)
```

### 2. Bonus (Incentive)
```
System issues free credits to user
DEBIT:  SYSTEM_REWARDS (-amount)
CREDIT: USER_WALLET (+amount)
```

### 3. Spend (Purchase/Spend)
```
User spends credits to buy service
DEBIT:  USER_WALLET (-amount)
CREDIT: SYSTEM_REVENUE (+amount)
```

## 🔒 Transaction & Concurrency Handling

### ACID Compliance

All operations run within **Sequelize transactions** to ensure:
- **Atomicity**: All-or-nothing execution
- **Consistency**: Database constraints always satisfied
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist

### Concurrency Control Strategy

#### 1. **Pessimistic Locking (FOR UPDATE)**
```typescript
// Wallets are locked in ascending ID order to prevent deadlocks
const lockedWallets = await Wallet.findAll({
  where: { id: [userWalletId, systemWalletId].sort() },
  lock: 'UPDATE',  // SELECT ... FOR UPDATE
  transaction: t,
  order: [['id', 'ASC']],
});
```

- Locks wallet rows in **ascending ID order** to prevent deadlocks
- Prevents concurrent modifications
- Ensures balance calculations are accurate

#### 2. **Idempotency Enforcement**
```typescript
// Check for existing transaction with same idempotency_key
const existing = await Transaction.findOne({
  where: { idempotencyKey },
  transaction: t,
});

if (existing) {
  return existing; // Return existing result, don't process again
}
```

- **Database-level**: Unique constraint on `idempotency_key`
- **Application-level**: Check before processing; duplicate key returns existing transaction
- **Client responsibility**: For safe retries, send the same `idempotencyKey` in the request body (optional). If omitted, the server generates a key per request (retries may duplicate the operation).

#### 3. **Deadlock Avoidance**

- **Consistent Lock Ordering**: Always lock wallets in ascending ID order
- **Short Transactions**: Keep transaction scope minimal
- **Retry Logic**: Handle deadlock errors with exponential backoff (can be added)

#### 4. **Negative Balance Prevention**

```typescript
// Balance check happens AFTER wallet is locked
// This prevents race conditions from concurrent spend requests
if (lockedUserWallet.balance < amount) {
  throw new BadRequestException('Insufficient balance');
}

// System wallet balance is also validated
lockedSystemWallet.balance -= amount;
if (lockedSystemWallet.balance < 0) {
  throw new BadRequestException('Insufficient treasury/rewards balance');
}
```

**Critical**: Balance checks occur **after** acquiring wallet locks to prevent race conditions where multiple concurrent spend requests could cause negative balances.

### Transaction Isolation

MySQL's default isolation level (`REPEATABLE READ`) is sufficient for this use case:
- Prevents dirty reads
- Prevents non-repeatable reads
- Works well with `FOR UPDATE` locks

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd Dino
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp env.template .env
   ```
   
   Edit `.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=wallet_db
   NODE_ENV=development
   ```

4. **Run seed script** (creates database, tables, and seed data)
   ```bash
   mysql -u root -p < seed.sql
   ```
   
   This single script will:
   - Create the `wallet_db` database (if it doesn't exist)
   - Create all required tables (asset_types, users, wallets, transactions, ledger_entries)
   - Insert seed data (4 asset types, 2 users, user wallets, system wallets)

5. **Start the application**
   ```bash
   npm run start:dev
   ```

   The service will be available at `http://localhost:3000`

### Documentation & API Testing

- **[API Reference](API_REFERENCE.md)** — Full API documentation with request/response examples for all endpoints.
- **Postman collection** — Import `postmanCollection.json` into [Postman](https://www.postman.com/) to run and modify requests against the Wallet Service API (Top-Up, Bonus, Spend, Get Balances). Set the `baseUrl` collection variable to your API origin (e.g. `http://localhost:3000` or your production URL).
- **DB Design** — Database schema diagram: `DB_Design.png`.

### System Wallets Initialization

System wallets (TREASURY, REWARDS, REVENUE) are automatically created on application startup via `AppModule.onModuleInit()`. They can also be pre-seeded using `seed.sql`.

## Run with Docker

**Requirements:**

- Docker
- Docker Compose

Start the app and database:

```bash
docker-compose up -d --build
```

This starts the NestJS app and MySQL 8.0 (with `seed.sql` applied). The API is available at `http://localhost:3000`.

## 📡 API Endpoints

### Base URL: `http://localhost:3000/api`

For full request/response details and multi-asset support, see **[API_REFERENCE.md](API_REFERENCE.md)**. Use the **Postman collection** (`postmanCollection.json`) to call the API from Postman.

## 🧪 Testing

### Manual Testing with cURL

```bash
# Top-up
curl -X POST http://localhost:3000/api/wallets/topup \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","amount":100,"assetTypeId":1}'

# Get all balances
curl http://localhost:3000/api/wallets/1

# Get single asset balance
curl "http://localhost:3000/api/wallets/1?assetId=1"

# Spend
curl -X POST http://localhost:3000/api/wallets/spend \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","amount":30,"assetTypeId":1}'

# Check balance again
curl http://localhost:3000/api/wallets/1
```


## 📁 Project Structure

```
src/
├── models/                    # Sequelize models
│   ├── asset-type.model.ts
│   ├── user.model.ts
│   ├── wallet.model.ts
│   ├── transaction.model.ts
│   └── ledger-entry.model.ts
├── wallet/                    # Wallet module
│   ├── dto/
│   │   └── wallet-transaction.dto.ts
│   ├── wallet.controller.ts
│   ├── wallet.service.ts
│   └── wallet.module.ts
├── app.module.ts              # Root module
└── main.ts                    # Application entry point
```

**Project root:** `API_REFERENCE.md`, `postmanCollection.json`, `seed.sql`, `env.template`, `DB_Design.png`

