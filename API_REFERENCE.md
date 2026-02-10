# Wallet Service API Reference

**Base URL**: `http://localhost:3000/api`

---

## Idempotency

For **top-up**, **bonus**, and **spend**, you can send an optional `idempotencyKey`. If you retry the same request with the **same key**, the server returns the existing transaction and does not apply the operation again. This is required for safe retries (e.g. after timeouts). If omitted, the server generates a key per request (retries will create duplicate transactions).

---

## 1. Top-Up Wallet

**Endpoint**: `POST http://localhost:3000/api/wallets/topup`

**Payload**:
```json
{
  "userId": "1",              // Use existing users (1, 2)
  "amount": 100,              // Amount to top-up (must be positive)
  "idempotencyKey": "topup-abc123",  // Optional. Same key on retry = same result
  "assetTypeId": 1            // Asset type ID: 1=Credits, 2=Gold Coins, 3=Diamonds, 4=Loyalty Points
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": 1,
  "message": "Top-up successful",
  "assetTypeId": 1
}
```

---

## 2. Bonus Credit

**Endpoint**: `POST http://localhost:3000/api/wallets/bonus`

**Payload**:
```json
{
  "userId": "1",              // Use existing users (1, 2)
  "amount": 50,               // Amount to give as bonus (must be positive)
  "idempotencyKey": "bonus-xyz456",   // Optional. Same key on retry = same result
  "assetTypeId": 1            // Asset type ID: 1=Credits, 2=Gold Coins, 3=Diamonds, 4=Loyalty Points
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": 2,
  "message": "Bonus credited successfully",
  "assetTypeId": 1
}
```

---

## 3. Spend Credits

**Endpoint**: `POST http://localhost:3000/api/wallets/spend`

**Payload**:
```json
{
  "userId": "1",              // Use existing users (1, 2)
  "amount": 30,               // Amount to spend (must be positive, must have sufficient balance)
  "idempotencyKey": "spend-order-789",  // Optional. Same key on retry = same result
  "assetTypeId": 1            // Asset type ID: 1=Credits, 2=Gold Coins, 3=Diamonds, 4=Loyalty Points 
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": 3,
  "message": "Spend successful",
  "assetTypeId": 1
}
```

---

## 4. Get All Balances

**Endpoint**: `GET http://localhost:3000/api/wallets/:userId`     - `userId` (path parameter): User ID (1 or 2)

**Response**:
```json
{
  "userId": 1,
  "balances": [
    { "asset": "CREDITS", "balance": 500 },
    { "asset": "GOLD", "balance": 0 },
    { "asset": "DIAMOND", "balance": 0 },
    { "asset": "LOYALTY", "balance": 0 }
  ]
}
```

---

## 5. Get One Balance by Asset ID

**Endpoint**: `GET http://localhost:3000/api/wallets/:userId?assetId=1`

**Query Parameters**:
- `userId` (path parameter): User ID (1 or 2)
- `assetId` (query parameter): Asset type ID (1=Credits, 2=Gold Coins, 3=Diamonds, 4=Loyalty Points)

**Response**:
```json
{
  "userId": 1,
  "asset": "CREDITS",
  "balance": 500
}
```

---
