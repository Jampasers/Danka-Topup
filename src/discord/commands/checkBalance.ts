import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import client from "../client.js";
import balCheck from "../../classes/balCheck.js";
import { env } from "../../config/env.js";
import type { IBalCheck } from "../../interfaces/balCheck.js";
import createEmbed from "../../classes/createEmbed.js";

const data = new SlashCommandBuilder()
  .setName("check-balance")
  .setDescription("Check digi balance")
  .toJSON();

export default {
  data,
  ownerOnly: true,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    const bal: IBalCheck = await new balCheck(
      env.digiflazz.apiKeyDev,
      env.digiflazz.username
    ).run();

    await interaction.editReply({
      embeds: [
        await new createEmbed().run(
          interaction,
          `Balance: ${Number(bal.data.deposit).toLocaleString("id-ID", {
            currency: "IDR",
            style: "currency",
          })}`
        ),
      ],
    });
  },
};
