import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type client from "../client.js";
import createEmbed from "../../classes/createEmbed.js";
import { db } from "../../config/database.js";
import type { RowDataPacket } from "mysql2";
import type { IPrice } from "../../interfaces/priceDB.js";

const data = new SlashCommandBuilder()
  .setName("check-price")
  .setDescription("Check and update product prices from Digiflazz")
  .addStringOption((opt) =>
    opt.setName("code").setDescription("Product SKU code")
  )
  .addNumberOption((opt) =>
    opt
      .setName("limit")
      .setDescription("Show limit")
      .setMinValue(1)
      .setMaxValue(100)
  )
  .toJSON();

export default {
  data,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    // await interaction.deferReply();
    const { options } = interaction;
    const productCode = options.getString("code");
    const limit = options.getNumber("limit");

    try {
      let data;
      if (productCode) {
        const [rows] = await db.query<RowDataPacket[]>(
          `
          SELECT price, product_code, product_brand, product_name FROM admins WHERE product_code = ? LIMIT 1
      `,
          [productCode]
        )!;
        data = rows.length ? rows[0] : null;
        if (!data)
          return interaction.editReply({
            embeds: [new createEmbed().run(interaction, "Code ora nemu")],
          });
      } else {
        if (!limit)
          return interaction.editReply({
            embeds: [new createEmbed().run(interaction, "Kontol")],
          });
        const [rows] = await db.query<RowDataPacket[]>(
          `
SELECT price, product_code, product_brand, product_name
FROM admins 
LIMIT ?`,
          [limit]
        );
        data = rows;

        if (!data?.length)
          return interaction.editReply({
            embeds: [new createEmbed().run(interaction, "Gkda data")],
          });
      }

      // console.dir(data, {
      //   depth: null,
      // });

      if (Array.isArray(data)) {
        let result = "";
        for (const asw of data) {
          result += `Code: ${asw.product_code}
Name: ${asw.product_name}
Game: ${asw.product_brand}
Price: ${Number(asw.price).toLocaleString("id-ID", {
            style: "currency",
            currency: "IDR",
          })}
========================
`;
        }
        await interaction.editReply({
          embeds: [new createEmbed().run(interaction, result)],
        });
      } else {
        await interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              `Code: ${data?.product_code}
Name: ${data?.product_name}
Game: ${data?.product_brand}
Price: ${Number(data?.price).toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
              })}`
            ),
          ],
        });
      }

      // 🔹 Ambil data dari API Digiflazz
      // const digiflazz = new priceCheck(
      //   env.digiflazz.apiKey,
      //   env.digiflazz.username
      // );
      // const response: IProductResponse = await digiflazz.run();

      // 🔹 Update database MySQL sesuai aturan (cek 30 menit lalu)
      // await new CheckPrice(30).upsert(response);

      // await interaction.editReply({
      //   embeds: [
      //     await new createEmbed().run(
      //       interaction,
      //       "✅ Harga produk berhasil diperiksa dan diperbarui di database."
      //     ),
      //   ],
      // });

      //       const [rows] = await db.query<(PriceRow & RowDataPacket)[]>(
      //         "SELECT id, buyer_sku_code, price, updated_at, product_name FROM prices WHERE buyer_sku_code = ? LIMIT 1",
      //         [productCode]
      //       );

      //       const data: PriceRow | undefined = rows.length ? rows[0] : undefined;

      //       if (data) {
      //         await interaction.followUp({
      //           embeds: [
      //             await new createEmbed().run(
      //               interaction,
      //               `Name: ${data.product_name}
      // Code: ${data.buyer_sku_code}
      // Price: ${Number(data.price).toLocaleString("id-ID", {
      //                 style: "currency",
      //                 currency: "IDR",
      //               })}`
      //             ),
      //           ],
      //         });
      //       }
    } catch (error) {
      console.error("❌ Error while checking price:", error);
      await interaction.editReply({
        embeds: [
          await new createEmbed().run(
            interaction,
            "❌ Gagal memeriksa harga produk. Cek log server."
          ),
        ],
      });
    }
  },
};
