import mysql from "mysql2/promise";
import { env } from "./env.js";

export const db = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initDatabase(): Promise<void> {
  await db.query(`
  CREATE TABLE IF NOT EXISTS prices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Wajib
    product_name VARCHAR(255)       NOT NULL,
    category     VARCHAR(100)       NOT NULL,
    brand        VARCHAR(100)       NOT NULL,
    type         VARCHAR(100)       NOT NULL,
    seller_name  VARCHAR(100)       NOT NULL,
    price        DECIMAL(15,2)      NOT NULL,
    buyer_sku_code VARCHAR(100)     NOT NULL UNIQUE,

    buyer_product_status  TINYINT(1) NOT NULL, -- Boolean
    seller_product_status TINYINT(1) NOT NULL, -- Boolean
    unlimited_stock       TINYINT(1) NOT NULL DEFAULT 0, -- Boolean
    multi                 TINYINT(1) NOT NULL DEFAULT 0, -- Boolean

    -- Tidak wajib
    stock        INT                 NULL,     -- wajib secara logika kalau unlimited_stock = 0
    start_cut_off TIME               NULL,     -- boleh kosong
    end_cut_off   TIME               NULL,     -- boleh kosong
    \`desc\`       TEXT               NULL,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Validasi logis (MySQL 8.0.16+). Jika versi lama, abaikan/biarkan CHECK diabaikan.
    CHECK (price >= 0),
    CHECK (stock IS NULL OR stock >= 0)
  );
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(255) NOT NULL,
      product_brand VARCHAR(255),
      product_name VARCHAR(255) NOT NULL,
      price DECIMAL(15,2),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )  
  `);

  console.log("[DB] Table checked/created.");
}

// Tes koneksi
export async function testConnection() {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ MySQL connected:", (rows as any)[0].result);
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
  }
}
