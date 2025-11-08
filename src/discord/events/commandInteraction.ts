import { ChatInputCommandInteraction, Events } from "discord.js";
import type client from "../client.ts";
import createEmbed from "../../classes/createEmbed.js";
import { env } from "../../config/env.js";

export default {
  name: Events.InteractionCreate,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    const { commandName, options } = interaction;

    if (interaction.isCommand()) {
      await interaction.deferReply();
      const subCommand = options.getSubcommand(false);
      const query = client.slashSubcommands
        .get(subCommand)
        ?.filter((sub: string) => sub == commandName)[0];
      console.log({ query });

      const command = client.slashCommands.get(
        subCommand ? query : commandName
      );
      console.log({ command });

      try {
        await interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              "Executing command, please wait."
            ),
          ],
        });

        if (command.ownerOnly && interaction.user.id !== env.discord.ownerId)
          return interaction.editReply({
            embeds: [
              await new createEmbed().run(
                interaction,
                "Siapa lu anj, sok asik kontol"
              ),
            ],
          });
        await command?.run(client, interaction);
      } catch (e) {
        console.error(e);
        if (interaction.replied || interaction.deferred) {
          interaction.followUp({
            content: (e as Error).message,
          });
        } else {
          interaction.reply({
            content: (e as Error).message,
          });
        }
      }
    }
  },
};
