import mysql from "mysql2/promise";
import { env } from "./env.js";

// Buat koneksi pool
export const db = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tes koneksi
export async function testConnection() {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ MySQL connected:", (rows as any)[0].result);
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
  }
}
