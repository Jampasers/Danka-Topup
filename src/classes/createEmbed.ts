import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ModalSubmitInteraction,
} from "discord.js";

class createEmbed {
  constructor() {}

  run(
    interaction:
      | ChatInputCommandInteraction
      | ButtonInteraction
      | ModalSubmitInteraction,
    text: string,
    image?: string
  ): EmbedBuilder {
    let embed;
    embed = new EmbedBuilder()
      .setTitle(interaction?.guild?.name || "DankaStur")
      .setDescription(text)
      .setFooter({
        text: interaction.user.tag,
        iconURL: interaction.guild?.iconURL() as string | "",
      })
      .setTimestamp()
      .setColor("Random");

    if (image) embed.setImage(image);

    return embed;
  }
}

export default createEmbed;
