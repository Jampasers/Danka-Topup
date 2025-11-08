import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import client from "../client.js";

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
    const idGame = options.getString("id")!;
    const zoneGame = options.getString("zone");
  },
};
