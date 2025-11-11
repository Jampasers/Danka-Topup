import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type client from "../client.js";
import priceCheck from "../../classes/priceCheck.js";
import { CheckPrice } from "../../classes/checkPrice.js";
import { env } from "../../config/env.js";
import type { IProductResponse } from "../../interfaces/product.js";
import createEmbed from "../../classes/createEmbed.js";
import { db } from "../../config/database.js";
import type { RowDataPacket } from "mysql2";
import type { IPrice } from "../../interfaces/priceDB.js";

const data = new SlashCommandBuilder()
  .setName("check-price-admin")
  .setDescription("Check and update product prices from Digiflazz")
  .addStringOption((opt) =>
    opt.setName("code").setDescription("Product SKU code")
  )
  .addStringOption((opt) =>
    opt.setName("brand").setDescription("Game Name").addChoices(
      {
        name: "Mobile Legends",
        value: "MOBILE LEGENDS",
      },
      {
        name: "Free Fire",
        value: "FREE FIRE",
      },
      {
        name: "PUBG Mobile",
        value: "PUBG MOBILE",
      },
      {
        name: "Valorant",
        value: "VALORANT",
      },
      {
        name: "Honor of Kings",
        value: "HONOR OF KINGS",
      },
      {
        name: "Call of Duty Mobile",
        value: "CALL OF DUTY MOBILE",
      }
    )
  )
  .toJSON();

export default {
  data,
  ownerOnly: true,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    // await interaction.deferReply();
    const { options } = interaction;
    const productCode = options.getString("code");
    const productBrand = options.getString("brand");

    try {
      // 🔹 Ambil data dari API Digiflazz
      const digiflazz = new priceCheck(
        env.digiflazz.apiKey,
        env.digiflazz.username
      );

      let response: IProductResponse;

      if (productCode && productBrand)
        return await interaction.editReply({
          embeds: [new createEmbed().run(interaction, "Pilih 1 anj")],
        });
      if (!productBrand && !productCode)
        return interaction.editReply({
          embeds: [new createEmbed().run(interaction, "Pilih salah 1 lh")],
        });

      if (productCode) {
        response = await digiflazz.run({ code: productCode });
      } else if (productBrand) {
        response = await digiflazz.run({ brand: productBrand });
      } else {
        response = await digiflazz.run(); // tanpa filter
      }

      console.dir(response, {
        depth: null,
      });

      if (!response.data)
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              `${
                productBrand ? "Game" : productCode ? "Code" : "Goblok"
              } ora ada`
            ),
          ],
        });

      // 🔹 Update database MySQL sesuai aturan (cek 30 menit lalu)
      await new CheckPrice(30).upsert(response);

      await interaction.editReply({
        embeds: [
          new createEmbed().run(
            interaction,
            "✅ Harga produk berhasil diperiksa dan diperbarui di database."
          ),
        ],
      });

      let data: IPrice | IPrice[] | undefined;

      if (productCode) {
        const [rows] = await db.query<(IPrice & RowDataPacket)[]>(
          "SELECT * FROM prices WHERE buyer_sku_code = ? ORDER BY price ASC LIMIT 1",
          [productCode]
        );

        data = rows.length ? rows[0] : undefined;
      } else if (productBrand) {
        const [rows] = await db.query<(IPrice & RowDataPacket)[]>(
          "SELECT * FROM prices WHERE brand = ? ORDER BY price ASC",
          [productBrand]
        );

        data = rows;
      }

      // console.dir(data, {
      //   depth: null,
      // });

      if (Array.isArray(data)) {
        let result = "";
        for (const asw of data) {
          result += `Code: ${asw.buyer_sku_code}
Name: ${asw.product_name}
Game: ${asw.brand}
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
      } else if (data) {
        await interaction.followUp({
          embeds: [
            new createEmbed().run(
              interaction,
              `Name: ${data.product_name}
Code: ${data.buyer_sku_code}
Price: ${Number(data.price).toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
              })}`
            ),
          ],
        });
      }
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
