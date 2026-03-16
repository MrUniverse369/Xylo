-- ================================================
-- 1. AMEND CUSTOMERS TABLE
-- ================================================
ALTER TABLE customers
  ADD COLUMN first_name     VARCHAR(100),
  ADD COLUMN last_name      VARCHAR(100),
  ADD COLUMN company_name   VARCHAR(150),
  ADD COLUMN phone          VARCHAR(20),
  ADD COLUMN status         VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active | suspended | churned
  ADD COLUMN created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  ADD COLUMN updated_at     TIMESTAMP    NOT NULL DEFAULT NOW();

-- Drop the old flat columns (back these up first!)
ALTER TABLE customers
  DROP COLUMN products,
  DROP COLUMN plans;


-- ================================================
-- 2. ADDRESSES
-- Customers can have billing + shipping addresses
-- ================================================
CREATE TABLE addresses (
  id            SERIAL PRIMARY KEY,
  customer_id   INT          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          VARCHAR(20)  NOT NULL DEFAULT 'billing',  -- billing | shipping
  line_1        VARCHAR(150) NOT NULL,
  line_2        VARCHAR(150),
  city          VARCHAR(100) NOT NULL,
  county        VARCHAR(100),
  postcode      VARCHAR(20)  NOT NULL,
  country       CHAR(2)      NOT NULL DEFAULT 'GB',
  is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ================================================
-- 3. PLANS
-- Subscription tiers (e.g. Starter, Pro, Enterprise)
-- ================================================
CREATE TABLE plans (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100)   NOT NULL UNIQUE,  -- e.g. 'Starter', 'Pro'
  price_monthly   NUMERIC(10,2)  NOT NULL,
  price_annually  NUMERIC(10,2),
  max_terminals   INT            NOT NULL DEFAULT 1,
  max_users       INT            NOT NULL DEFAULT 1,
  features        JSONB,                           -- flexible feature flags
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);


-- ================================================
-- 4. CUSTOMER SUBSCRIPTIONS
-- Which plan a customer is on + billing cycle
-- ================================================
CREATE TABLE customer_subscriptions (
  id             SERIAL PRIMARY KEY,
  customer_id    INT         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id        INT         NOT NULL REFERENCES plans(id),
  billing_cycle  VARCHAR(10) NOT NULL DEFAULT 'monthly',  -- monthly | annually
  status         VARCHAR(20) NOT NULL DEFAULT 'active',   -- active | cancelled | past_due
  start_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date       DATE,
  cancelled_at   TIMESTAMP,
  created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- ================================================
-- 5. PRODUCTS
-- POS hardware / software SKUs you sell
-- ================================================
CREATE TABLE products (
  id           SERIAL PRIMARY KEY,
  sku          VARCHAR(60)    NOT NULL UNIQUE,
  name         VARCHAR(150)   NOT NULL,
  description  TEXT,
  category     VARCHAR(60),                        -- e.g. 'terminal', 'printer', 'software'
  price        NUMERIC(10,2)  NOT NULL,
  stock_qty    INT            NOT NULL DEFAULT 0,
  is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP      NOT NULL DEFAULT NOW()
);


-- ================================================
-- 6. ORDERS
-- A customer's purchase of one or more products
-- ================================================
CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  customer_id   INT           NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | paid | shipped | cancelled
  subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Line items for each order
CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT            NOT NULL REFERENCES products(id),
  quantity    INT            NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2)  NOT NULL,  -- snapshot of price at time of purchase
  line_total  NUMERIC(10,2)  GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- ================================================
-- 7. PAYMENTS
-- Payment records tied to orders or subscriptions
-- ================================================
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  customer_id     INT            NOT NULL REFERENCES customers(id),
  order_id        INT            REFERENCES orders(id),               -- null for subscription payments
  subscription_id INT            REFERENCES customer_subscriptions(id),
  amount          NUMERIC(10,2)  NOT NULL,
  currency        CHAR(3)        NOT NULL DEFAULT 'GBP',
  method          VARCHAR(30),                                         -- card | bank_transfer | direct_debit
  status          VARCHAR(20)    NOT NULL DEFAULT 'pending',           -- pending | succeeded | failed | refunded
  provider_ref    VARCHAR(150),                                        -- Stripe charge ID etc.
  paid_at         TIMESTAMP,
  created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);


-- ================================================
-- 8. SUPPORT TICKETS
-- Basic helpdesk linkage per customer
-- ================================================
CREATE TABLE support_tickets (
  id           SERIAL PRIMARY KEY,
  customer_id  INT         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subject      VARCHAR(200) NOT NULL,
  body         TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'open',   -- open | in_progress | resolved | closed
  priority     VARCHAR(10)  NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ================================================
-- 9. USEFUL INDEXES
-- ================================================
CREATE INDEX idx_subscriptions_customer  ON customer_subscriptions(customer_id);
CREATE INDEX idx_orders_customer         ON orders(customer_id);
CREATE INDEX idx_payments_customer       ON payments(customer_id);
CREATE INDEX idx_tickets_customer        ON support_tickets(customer_id);
CREATE INDEX idx_order_items_order       ON order_items(order_id);