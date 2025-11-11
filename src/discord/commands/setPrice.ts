import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type client from "../client.ts";
import createEmbed from "../../classes/createEmbed.js";
import { db } from "../../config/database.js";
import type { RowDataPacket } from "mysql2";
import type { PriceRow } from "../../interfaces/checkPrice.js";
import axios from "axios";

type BulkItem = {
  code: string;
  price: number;
  brand?: string | null;
  name?: string | null;
};

const data = new SlashCommandBuilder()
  .setName("set-price")
  .setDescription("Set/update price untuk SKU tertentu atau via JSON (bulk).")
  .addStringOption((opt) =>
    opt
      .setName("code")
      .setDescription("Product SKU code (buyer_sku_code / product_code)")
  )
  .addNumberOption((opt) =>
    opt.setName("price").setDescription("Harga baru (angka)")
  )
  .addStringOption((opt) =>
    opt
      .setName("brand")
      .setDescription("Game name (fallback untuk INSERT baru)")
      .addChoices(
        { name: "Mobile Legends", value: "MOBILE LEGENDS" },
        { name: "Free Fire", value: "FREE FIRE" },
        { name: "PUBG Mobile", value: "PUBG MOBILE" },
        { name: "Valorant", value: "VALORANT" },
        { name: "Honor of Kings", value: "HONOR OF KINGS" },
        { name: "Call of Duty Mobile", value: "CALL OF DUTY MOBILE" }
      )
  )
  .addStringOption((opt) =>
    opt.setName("name").setDescription("Code name (fallback untuk INSERT baru)")
  )
  .addAttachmentOption((opt) =>
    opt
      .setName("json")
      .setDescription(
        "File JSON untuk bulk update. Lihat deskripsi perintah untuk format."
      )
  )
  .toJSON();

export default {
  data,
  ownerOnly: true,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    const { options } = interaction;

    const codeOpt = options.getString("code")?.trim() || null;
    const priceOpt = options.getNumber("price") ?? null;
    const brandOpt = options.getString("brand")?.trim() || null;
    const nameOpt = options.getString("name")?.trim() || null;
    const jsonAtt = options.getAttachment("json") || null;

    try {
      // -------------------------
      // MODE 1: BULK via JSON
      // -------------------------
      if (jsonAtt) {
        // Basic guard
        const url = jsonAtt.url;
        const filename = jsonAtt.name?.toLowerCase() || "";
        if (!filename.endsWith(".json")) {
          return interaction.editReply({
            embeds: [
              new createEmbed().run(
                interaction,
                "❌ File harus berformat **.json**."
              ),
            ],
          });
        }

        // Ambil JSON
        let raw: any;
        try {
          const { data } = await axios.get(url, { responseType: "json" });
          raw = data;
        } catch {
          return interaction.editReply({
            embeds: [
              new createEmbed().run(
                interaction,
                "❌ Gagal membaca file JSON. Pastikan file valid."
              ),
            ],
          });
        }

        // Normalisasi ke array BulkItem
        let items: BulkItem[] = [];
        if (Array.isArray(raw)) {
          items = raw.map((r) => ({
            code: String(r.code ?? "").trim(),
            price: Number(r.price),
            brand: r.brand ? String(r.brand).trim() : null,
            name: r.name ? String(r.name).trim() : null,
          }));
        } else if (raw && typeof raw === "object") {
          items = Object.entries(raw).map(([k, v]: [string, any]) => ({
            code: String(k).trim(),
            price: Number(v?.price),
            brand: v?.brand ? String(v.brand).trim() : null,
            name: v?.name ? String(v.name).trim() : null,
          }));
        } else {
          return interaction.editReply({
            embeds: [
              new createEmbed().run(
                interaction,
                "❌ Struktur JSON tidak dikenali. Gunakan array objek atau object map."
              ),
            ],
          });
        }

        // Filter invalid baris awal
        const invalidEarly: string[] = [];
        items = items.filter((it) => {
          const ok =
            it.code &&
            Number.isFinite(it.price) &&
            typeof it.price === "number" &&
            it.price >= 0;
          if (!ok) invalidEarly.push(it.code || "(kosong)");
          return ok;
        });

        if (!items.length) {
          return interaction.editReply({
            embeds: [
              new createEmbed().run(
                interaction,
                "❌ Tidak ada item valid untuk diproses."
              ),
            ],
          });
        }

        // Ambil daftar code unik dan cek existing
        const codes = Array.from(new Set(items.map((i) => i.code)));
        // Query IN (...) aman karena codes adalah array user-provided; gunakan binding
        const [existRows] = await db.query<(PriceRow & RowDataPacket)[]>(
          `
            SELECT id, product_code, price, product_brand, product_name
            FROM admins
            WHERE product_code IN (${codes.map(() => "?").join(",")})
          `,
          codes
        );
        const existMap = new Map(
          existRows.map((r) => [String(r.product_code), r])
        );

        const toInsert: BulkItem[] = [];
        const toUpdate: BulkItem[] = [];
        const needMeta: string[] = [];

        for (const it of items) {
          if (existMap.has(it.code)) {
            // update: brand/name pakai yang baru kalau ada, kalau kosong pakai existing
            const ex = existMap.get(it.code)!;
            toUpdate.push({
              code: it.code,
              price: it.price,
              brand: it.brand ?? (ex.product_brand as any) ?? null,
              name: it.name ?? (ex.product_name as any) ?? null,
            });
          } else {
            // insert: brand/name wajib. Kalau tidak ada di item, coba fallback dari option brand/name command
            const brand = it.brand ?? brandOpt;
            const name = it.name ?? nameOpt;
            if (!brand || !name) {
              needMeta.push(it.code);
              continue;
            }
            toInsert.push({
              code: it.code,
              price: it.price,
              brand,
              name,
            });
          }
        }

        // Eksekusi dalam transaksi
        const conn = await db.getConnection();
        let okInsert = 0;
        let okUpdate = 0;
        try {
          await conn.beginTransaction();

          // Batch update
          for (const u of toUpdate) {
            await conn.query(
              `
                UPDATE admins
                SET price = ?, product_brand = ?, product_name = ?, updated_at = CURRENT_TIMESTAMP
                WHERE product_code = ?
                LIMIT 1
              `,
              [u.price, u.brand, u.name, u.code]
            );
            okUpdate++;
          }

          // Batch insert
          for (const ins of toInsert) {
            await conn.query(
              `
                INSERT INTO admins (product_code, price, product_brand, product_name, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              `,
              [ins.code, ins.price, ins.brand, ins.name]
            );
            okInsert++;
          }

          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }

        const lines: string[] = [];
        lines.push("✅ **Bulk set-price selesai.**");
        lines.push(
          `• Total input: **${items.length}** (unik: ${codes.length})`
        );
        if (invalidEarly.length)
          lines.push(
            `• Dilewati (data tidak valid): ${invalidEarly.join(", ")}`
          );
        lines.push(`• Update: **${okUpdate}**`);
        lines.push(`• Insert: **${okInsert}**`);
        if (needMeta.length)
          lines.push(
            `• Gagal insert (butuh brand & name): ${needMeta.join(", ")}`
          );

        return interaction.editReply({
          embeds: [new createEmbed().run(interaction, lines.join("\n"))],
        });
      }

      // -------------------------
      // MODE 2: SINGLE via options
      // -------------------------
      if (!codeOpt || priceOpt === null) {
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              "❌ Gunakan *code* dan *price*, atau unggah **json** untuk bulk."
            ),
          ],
        });
      }

      // Cek existing
      const [rows] = await db.query<(PriceRow & RowDataPacket)[]>(
        `
          SELECT id, product_code, price, product_brand, product_name, updated_at
          FROM admins
          WHERE product_code = ?
          LIMIT 1
        `,
        [codeOpt]
      );

      if (!rows.length) {
        // Insert baru: brand/name wajib (pakai option)
        if (!brandOpt || !nameOpt) {
          return interaction.editReply({
            embeds: [
              new createEmbed().run(
                interaction,
                "❌ SKU belum terdaftar. Harap isi **brand** dan **name**."
              ),
            ],
          });
        }

        await db.query(
          `
            INSERT INTO admins (product_code, price, product_brand, product_name, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [codeOpt, priceOpt, brandOpt, nameOpt]
        );
      } else {
        const existing = rows[0];
        const finalBrand = brandOpt ?? (existing?.product_brand as any) ?? null;
        const finalName = nameOpt ?? (existing?.product_name as any) ?? null;

        if (!finalBrand || !finalName) {
          return interaction.editReply({
            embeds: [
              new createEmbed().run(
                interaction,
                "❌ Data tidak lengkap. **brand** dan **name** diperlukan karena belum tersimpan di database."
              ),
            ],
          });
        }

        await db.query(
          `
            UPDATE admins
            SET price = ?, product_brand = ?, product_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE product_code = ?
            LIMIT 1
          `,
          [priceOpt, finalBrand, finalName, codeOpt]
        );
      }

      // Ambil data setelahnya
      const [after] = await db.query<(PriceRow & RowDataPacket)[]>(
        `
          SELECT id, product_code, price, product_brand, product_name, updated_at
          FROM admins
          WHERE product_code = ?
          LIMIT 1
        `,
        [codeOpt]
      );

      const updated = after[0];
      await interaction.editReply({
        embeds: [
          new createEmbed().run(
            interaction,
            [
              "✅ **Harga berhasil diupdate.**",
              `**Name:** ${updated?.product_name ?? "-"}`,
              `**Game:** ${updated?.product_brand ?? "-"}`,
              `**Code:** ${updated?.product_code ?? "-"}`,
              `**Price:** ${Number(updated?.price).toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`,
              `**Updated At:** ${
                updated?.updated_at
                  ? new Date(
                      updated.updated_at as unknown as string
                    ).toLocaleString("id-ID")
                  : "-"
              }`,
            ].join("\n")
          ),
        ],
      });
    } catch (error) {
      console.error("❌ Error while setting price:", error);
      await interaction.editReply({
        embeds: [
          new createEmbed().run(
            interaction,
            "❌ Gagal mengubah harga. Cek log server."
          ),
        ],
      });
    }
  },
};
