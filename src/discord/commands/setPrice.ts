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
      .setDescription("Product SKU code (buyer_sku_code)")
      .setRequired(true)
  )
  .addNumberOption((opt) =>
    opt.setName("price").setDescription("Harga baru (angka)").setRequired(true)
  )
  .toJSON();

export default {
  data,
  ownerOnly: true,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    // await interaction.deferReply(); // aktifkan kalau butuh
    const { options } = interaction;
    const code = options.getString("code", true);
    const price = options.getNumber("price", true);

    try {
      // Cek apakah SKU ada
      const [rows] = await db.query<(PriceRow & RowDataPacket)[]>(
        "SELECT id, product_code, price, updated_at FROM admins WHERE product_code = ? LIMIT 1",
        [code]
      );

      if (!rows.length) {
        await db.query(
          "INSERT INTO admins (product_code, price, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
          [code, price]
        );
      } else {
        // Update harga
        await db.query(
          "UPDATE admins SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ? LIMIT 1",
          [price, code]
        );
      }

      // Ambil data setelah update
      const [after] = await db.query<(PriceRow & RowDataPacket)[]>(
        "SELECT id, product_code, price, updated_at FROM admins WHERE product_code = ? LIMIT 1",
        [code]
      );

      const updated = after[0];

      await interaction.editReply({
        embeds: [
          await new createEmbed().run(
            interaction,
            `✅ **Harga berhasil diupdate.**\n` +
              `**Name:** ${updated?.product_name}\n` +
              `**Code:** ${updated?.buyer_sku_code}\n` +
              `**Price:** ${Number(updated?.price).toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}\n` +
              `**Updated At:** ${new Date(updated?.updated_at!).toLocaleString(
                "id-ID"
              )}`
          ),
        ],
      });
    } catch (error) {
      console.error("❌ Error while setting price:", error);
      await interaction.editReply({
        embeds: [
          await new createEmbed().run(
            interaction,
            "❌ Gagal mengubah harga. Cek log server."
          ),
        ],
      });
    }
  },
};
