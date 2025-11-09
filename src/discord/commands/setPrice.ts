import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type client from "../client.ts";
import createEmbed from "../../classes/createEmbed.js";
import { db } from "../../config/database.js";
import type { RowDataPacket } from "mysql2";
import type { PriceRow } from "../../interfaces/checkPrice.js";

const data = new SlashCommandBuilder()
  .setName("set-price")
  .setDescription(
    "Set/update price untuk SKU tertentu (harus sudah ada di DB)."
  )
  .addStringOption((opt) =>
    opt
      .setName("code")
      .setDescription("Product SKU code (buyer_sku_code / product_code)")
      .setRequired(true)
  )
  .addNumberOption((opt) =>
    opt.setName("price").setDescription("Harga baru (angka)").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("brand")
      .setDescription("Game name")
      .addChoices(
        { name: "Mobile Legends", value: "MOBILE LEGENDS" },
        { name: "Free Fire", value: "FREE FIRE" },
        { name: "PUBG Mobile", value: "PUBG MOBILE" },
        { name: "Valorant", value: "VALORANT" },
        { name: "Honor of Kings", value: "HONOR OF KINGS" },
        { name: "Call of Duty Mobile", value: "CALL OF DUTY MOBILE" }
      )
  )
  .addStringOption((opt) => opt.setName("name").setDescription("Code name"))
  .toJSON();

export default {
  data,
  ownerOnly: true,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    const { options } = interaction;
    const code = options.getString("code", true);
    const price = options.getNumber("price", true);
    const brandOpt = options.getString("brand")?.trim() || null;
    const nameOpt = options.getString("name")?.trim() || null;

    try {
      // optional: kalau handler kamu pakai editReply, baiknya defer dulu
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }

      // Cek apakah SKU sudah ada di DB
      const [rows] = await db.query<(PriceRow & RowDataPacket)[]>(
        `
          SELECT id, product_code, price, product_brand, product_name, updated_at
          FROM admins
          WHERE product_code = ?
          LIMIT 1
        `,
        [code]
      );

      if (!rows.length) {
        // SKU belum ada -> brand & name WAJIB dari user (runtime required)
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

        // Insert baru
        await db.query(
          `
            INSERT INTO admins (product_code, price, product_brand, product_name, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [code, price, brandOpt, nameOpt]
        );
      } else {
        // SKU sudah ada -> boleh kosongkan brand/name KALAU sudah ada di DB
        const existing = rows[0];

        const finalBrand = brandOpt ?? existing?.product_brand ?? null;
        const finalName = nameOpt ?? existing?.product_name ?? null;

        // Kalau di DB kosong dan user juga tidak mengisi, tetap wajib isi
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

        // Update harga (+ isi brand/name jika dikirim atau belum ada)
        await db.query(
          `
            UPDATE admins
            SET price = ?, product_brand = ?, product_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE product_code = ?
            LIMIT 1
          `,
          [price, finalBrand, finalName, code]
        );
      }

      // Ambil data setelah insert/update
      const [after] = await db.query<(PriceRow & RowDataPacket)[]>(
        `
          SELECT id, product_code, price, product_brand, product_name, updated_at
          FROM admins
          WHERE product_code = ?
          LIMIT 1
        `,
        [code]
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
