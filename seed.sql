-- Wallet Service Database Setup and Seed Script
-- This script creates the database, tables, and initializes with seed data
-- Run: mysql -u root -p < seed.sql

-- ============================================
-- 1. Create Database
-- ============================================
-- CREATE DATABASE IF NOT EXISTS wallet_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE wallet_db;

-- ============================================
-- 2. Create Tables
-- ============================================

-- Table: asset_types
CREATE TABLE IF NOT EXISTS asset_types (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_phone (phone),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: wallets
CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  asset_type_id BIGINT NOT NULL DEFAULT 1,
  type ENUM('USER', 'SYSTEM') NOT NULL,
  name VARCHAR(255),
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE RESTRICT,
  INDEX idx_user_id (user_id),
  INDEX idx_asset_type_id (asset_type_id),
  INDEX idx_type (type),
  INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: System wallet uniqueness (type, name) is enforced by application logic
-- using findOrCreate in WalletService.initializeSystemWallets()

-- Table: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type ENUM('TOPUP', 'BONUS', 'SPEND') NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_idempotency_key (idempotency_key),
  INDEX idx_idempotency_key (idempotency_key),
  INDEX idx_user_id (user_id),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: ledger_entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  transaction_id BIGINT NOT NULL,
  wallet_id BIGINT NOT NULL,
  direction ENUM('IN', 'OUT') NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_wallet_created (wallet_id, created_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Seed Data
-- ============================================

-- Asset Types
INSERT IGNORE INTO asset_types (id, name, code, created_at)
VALUES 
  (1, 'Credits', 'CREDITS', NOW()),
  (2, 'Gold Coins', 'GOLD', NOW()),
  (3, 'Diamonds', 'DIAMOND', NOW()),
  (4, 'Loyalty Points', 'LOYALTY', NOW());

-- System Wallets
-- System wallets are also created automatically by the application on startup
-- But we pre-create them here for initial setup
-- Create system wallets for ALL asset types (1=Credits, 2=Gold, 3=Diamonds, 4=Loyalty)
INSERT IGNORE INTO wallets (user_id, asset_type_id, type, name, balance, created_at, updated_at)
VALUES 
  -- Credits (asset_type_id = 1)
  (NULL, 1, 'SYSTEM', 'TREASURY', 1000000, NOW(), NOW()),
  (NULL, 1, 'SYSTEM', 'REWARDS', 1000000, NOW(), NOW()),
  (NULL, 1, 'SYSTEM', 'REVENUE', 0, NOW(), NOW()),
  -- Gold Coins (asset_type_id = 2)
  (NULL, 2, 'SYSTEM', 'TREASURY', 1000000, NOW(), NOW()),
  (NULL, 2, 'SYSTEM', 'REWARDS', 1000000, NOW(), NOW()),
  (NULL, 2, 'SYSTEM', 'REVENUE', 0, NOW(), NOW()),
  -- Diamonds (asset_type_id = 3)
  (NULL, 3, 'SYSTEM', 'TREASURY', 1000000, NOW(), NOW()),
  (NULL, 3, 'SYSTEM', 'REWARDS', 1000000, NOW(), NOW()),
  (NULL, 3, 'SYSTEM', 'REVENUE', 0, NOW(), NOW()),
  -- Loyalty Points (asset_type_id = 4)
  (NULL, 4, 'SYSTEM', 'TREASURY', 1000000, NOW(), NOW()),
  (NULL, 4, 'SYSTEM', 'REWARDS', 1000000, NOW(), NOW()),
  (NULL, 4, 'SYSTEM', 'REVENUE', 0, NOW(), NOW());

-- Users
INSERT INTO users (phone, name, created_at)
VALUES 
  ('+1234567890', 'John Doe', NOW()),
  ('+0987654321', 'Jane Smith', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Get user IDs
SET @user1_id = (SELECT id FROM users WHERE phone = '+1234567890' LIMIT 1);
SET @user2_id = (SELECT id FROM users WHERE phone = '+0987654321' LIMIT 1);

-- User Wallets with Initial Balances
-- User 1: John Doe - Initial balance: 500 (using default asset_type_id = 1 for Credits)
DELETE FROM wallets WHERE user_id = @user1_id AND type = 'USER';
INSERT INTO wallets (user_id, asset_type_id, type, name, balance, created_at, updated_at)
VALUES (@user1_id, 1, 'USER', 'Main Wallet', 500, NOW(), NOW());

-- User 2: Jane Smith - Initial balance: 1000 (using default asset_type_id = 1 for Credits)
DELETE FROM wallets WHERE user_id = @user2_id AND type = 'USER';
INSERT INTO wallets (user_id, asset_type_id, type, name, balance, created_at, updated_at)
VALUES (@user2_id, 1, 'USER', 'Main Wallet', 1000, NOW(), NOW());
