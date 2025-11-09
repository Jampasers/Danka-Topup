import { ChatInputCommandInteraction, Events } from "discord.js";
import type client from "../client.ts";
import createEmbed from "../../classes/createEmbed.js";
import { env } from "../../config/env.js";

export default {
  name: Events.InteractionCreate,

  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;
    await interaction.deferReply();

    // cek apakah user pakai subcommand
    const sub = options.getSubcommand(false);

    let command: any;

    if (sub) {
      // jika command memiliki subcommand, ambil dari client.slashSubcommands
      const parent = client.slashSubcommands.get(commandName);

      if (!parent)
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              `Subcommand container "${commandName}" tidak ditemukan.`
            ),
          ],
        });

      command = parent.get(sub);

      if (!command)
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              `Subcommand "${sub}" tidak ditemukan pada "/${commandName}".`
            ),
          ],
        });
    } else {
      // command tanpa subcommand
      command = client.slashCommands.get(commandName);

      if (!command)
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              `Command "${commandName}" tidak ditemukan.`
            ),
          ],
        });
    }

    try {
      await interaction.editReply({
        embeds: [
          new createEmbed().run(interaction, "Executing command, please wait."),
        ],
      });

      // ownerOnly check
      if (command.ownerOnly && interaction.user.id !== env.discord.ownerId)
        return interaction.editReply({
          embeds: [
            new createEmbed().run(interaction, "Siapa lu anj, sok asik kontol"),
          ],
        });

      await command.run(client, interaction);
    } catch (e) {
      console.error(e);
      const msg = (e as Error).message;

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: msg });
      }

      return interaction.reply({ content: msg });
    }
  },
};
