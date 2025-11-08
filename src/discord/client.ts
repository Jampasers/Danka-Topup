import { Client, Partials, GatewayIntentBits, ActivityType } from "discord.js";
import deployCommands from "../handlers/deployCommands.js";
import startEvents from "../handlers/startEvents.js";
import { env } from "../config/env.js";

export default class extends Client {
  slashCommand: any[] = [];
  slashCommands: Map<any, any> = new Map();
  slashSubcommands: Map<any, any> = new Map();
  slashSubcommand: Map<any, any> = new Map();
  buttons: Map<any, any> = new Map();
  modals: Map<any, any> = new Map();
  selectMenus: Map<any, any> = new Map();
  prefixCommandAliases: Map<any, any> = new Map();
  prefixCommands: Map<any, any> = new Map();

  constructor() {
    super({
      intents: Object.values(GatewayIntentBits) as GatewayIntentBits[],
      partials: Object.values(Partials) as Partials[],
      rest: {
        timeout: 30_000,
      },
    });
  }

  sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  start = async (): Promise<void> => {
    await deployCommands(this);
    await startEvents(this);
    await this.login(env.discord.botToken);
  };
}
