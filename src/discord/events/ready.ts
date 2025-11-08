import { REST, Routes, Events } from "discord.js";
import client from "../client.js";
import { env } from "../../config/env.js";

export default {
  name: Events.ClientReady,
  once: true,
  run: async (client: client) => {
    const token = env.discord.botToken;
    const clientId = client?.user?.id!;
    const rest = new REST({ version: "10" }).setToken(token);

    console.log(`Refreshing ${client.slashCommand.length} Slash Commands.`);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      // const currentCommands = await rest.get(
      //   Routes.applicationCommands(clientId)
      // );
      // console.log({ currentCommands: JSON.stringify(currentCommands) });
      // console.log({ slashCommand: JSON.stringify(client.slashCommand) });

      await rest.put(
        Routes.applicationGuildCommands(clientId, env.discord.serverId),
        { body: [] }
      );
      await rest.put(Routes.applicationCommands(clientId), { body: [] });

      const response: any = await rest.put(
        Routes.applicationGuildCommands(clientId, env.discord.serverId),
        {
          body: client.slashCommand,
        }
      );

      console.log(`Successfully reloaded ${response.length} commands.`);
    } catch (error: any) {
      // Jika kena rate limit
      if (error.status === 429) {
        const retryAfter = error.headers?.["x-ratelimit-reset-after"] || 60;
        console.log(
          `Rate limit hit! Waiting for ${retryAfter} seconds before retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      } else {
        console.error("Error deploying commands:", error.message);
      }
    }

    console.log(`Logged In As ${client.user?.tag}!`);
    const profile = env.discord.profileBot;
    console.log({ profile });

    if (profile !== "") client.user?.setAvatar(env.discord.profileBot);
  },
};
