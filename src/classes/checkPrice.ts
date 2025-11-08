import type { IProductResponse, IProduct } from "../interfaces/product.js";
import type { PriceRow } from "../interfaces/checkPrice.js";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "../config/database.js";

export class CheckPrice {
  private readonly delayMs: number;
  constructor(delayMinutes = 30) {
    this.delayMs = delayMinutes * 60 * 1000;
  }

  private async findPrice(
    buyer_sku_code: string
  ): Promise<PriceRow | null | undefined> {
    const [rows] = await db.query<(PriceRow & RowDataPacket)[]>(
      "SELECT id, buyer_sku_code, price, updated_at, product_name FROM prices WHERE buyer_sku_code = ? LIMIT 1",
      [buyer_sku_code]
    );
    return rows.length ? rows[0] : null;
  }

  private async insertPrice(p: IProduct): Promise<void> {
    await db.query(
      `INSERT INTO prices (
      product_name, category, brand, type, seller_name, price, buyer_sku_code,
      buyer_product_status, seller_product_status, unlimited_stock, stock, multi,
      start_cut_off, end_cut_off, \`desc\`
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      product_name = VALUES(product_name),
      category = VALUES(category),
      brand = VALUES(brand),
      type = VALUES(type),
      seller_name = VALUES(seller_name),
      price = VALUES(price),
      buyer_product_status = VALUES(buyer_product_status),
      seller_product_status = VALUES(seller_product_status),
      unlimited_stock = VALUES(unlimited_stock),
      stock = VALUES(stock),
      multi = VALUES(multi),
      start_cut_off = VALUES(start_cut_off),
      end_cut_off = VALUES(end_cut_off),
      \`desc\` = VALUES(\`desc\`),
      updated_at = CURRENT_TIMESTAMP
    `,
      [
        p.product_name,
        p.category,
        p.brand,
        p.type,
        p.seller_name,
        p.price,
        p.buyer_sku_code,
        p.buyer_product_status,
        p.seller_product_status,
        p.unlimited_stock,
        p.stock,
        p.multi,
        p.start_cut_off,
        p.end_cut_off,
        p.desc,
      ]
    );
  }

  private async updatePrice(p: IProduct, id: number): Promise<void> {
    await db.query(
      `UPDATE prices SET
        product_name = ?, category = ?, brand = ?, type = ?, seller_name = ?,
        price = ?, buyer_product_status = ?, seller_product_status = ?,
        unlimited_stock = ?, stock = ?, multi = ?, start_cut_off = ?,
        end_cut_off = ?, \`desc\` = ?
       WHERE id = ?`,
      [
        p.product_name,
        p.category,
        p.brand,
        p.type,
        p.seller_name,
        p.price,
        p.buyer_product_status,
        p.seller_product_status,
        p.unlimited_stock,
        p.stock,
        p.multi,
        p.start_cut_off,
        p.end_cut_off,
        p.desc,
        id,
      ]
    );
  }

  public async upsertOne(p: IProduct): Promise<void> {
    const existing = await this.findPrice(p.buyer_sku_code);

    if (!existing) {
      await this.insertPrice(p);
      return;
    }

    const last =
      existing.updated_at?.getTime?.() ??
      new Date(existing.updated_at).getTime();
    const diff = Date.now() - last;

    if (diff >= this.delayMs) {
      await this.updatePrice(p, existing.id);
      // kalau mau: panggil update saldo di sini
      // await this.updateSaldo()
    } else {
      // Jika ingin selalu sync meski < delay, uncomment:
      // await this.updatePrice(p, existing.id)
    }
  }

  public async upsert(payload: IProductResponse): Promise<void> {
    for (const p of payload.data) {
      await this.upsertOne(p);
    }
  }
}
