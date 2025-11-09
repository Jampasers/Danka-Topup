import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import client from "../client.js";
import Topup from "../../classes/topup.js";
import { env } from "../../config/env.js";
import type { TransactionResponse } from "../../interfaces/topup.js";
import { sleep } from "../../classes/sleep.js";
import createEmbed from "../../classes/createEmbed.js";

const data = new SlashCommandBuilder()
  .setName("topup")
  .setDescription("Topup, apalagi")
  .addStringOption((opt) =>
    opt
      .setName("code")
      .setDescription("Product code, apalagi")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("id").setDescription("ID Game").setRequired(true)
  )
  .addStringOption((opt) => opt.setName("zone").setDescription("Game zone id"))
  .toJSON();

export default {
  data,
  ownerOnly: true,

  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    const { options } = interaction;
    const productCode = options.getString("code")!;
    let idGame = options.getString("id")!;
    const zoneGame = options.getString("zone");

    if (productCode.startsWith("WDP") || productCode.startsWith("ML"))
      idGame += zoneGame;

    const digiflazz = new Topup(env.digiflazz.apiKey, env.digiflazz.username);

    await interaction.editReply({
      embeds: [new createEmbed().run(interaction, "Mengirim transaksi...")],
    });

    // Kirim transaksi pertama
    let response: TransactionResponse = await digiflazz.run(
      productCode,
      idGame
    );

    // console.log("FIRST RESPONSE:");
    // console.dir(response, { depth: null });

    // Jika bukan pending, langsung selesai
    if (response.data.status !== "Pending") {
      return interaction.editReply({
        embeds: [
          new createEmbed().run(
            interaction,
            `Status: ${response.data.status}\nSN: ${
              response.data.sn || "Gkda sn"
            }`
          ),
        ],
      });
    }

    // LOOP CHECK STATUS
    const refId = response.data.ref_id;
    await interaction.editReply({
      embeds: [new createEmbed().run(interaction, "Sex, pending")],
    });

    while (true) {
      await sleep(5000);

      response = await digiflazz.run(productCode, idGame, refId);

      console.log("CHECK RESPONSE:");
      console.dir(response, { depth: null });

      const status = response.data.status;

      if (status === "Sukses") {
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              `Status: ${response.data.status}\nSN: ${
                response.data.sn || "Gkda sn"
              }`
            ),
          ],
        });
      }

      if (status === "Gagal") {
        return interaction.editReply({
          embeds: [new createEmbed().run(interaction, "Awokawok gagal")],
        });
      }

      // masih pending → update embed
      await interaction.editReply({
        embeds: [new createEmbed().run(interaction, `Masih pending, sabar`)],
      });
    }
  },
};
