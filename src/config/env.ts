import "dotenv/config";
import type { IEnvConfig } from "../interfaces/env.js";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const env: IEnvConfig = {
  whatsapp: {
    phoneNumber: process.env.phoneNumber!,
    useQRCode: Boolean(process.env.useQRCode),
  },
  discord: {
    botToken: must("botToken"),
    profileBot: must("profileBot"),
    serverId: must("serverId"),
    ownerId: must("ownerId"),
  },
  digiflazz: {
    apiKey: process.env.digiflazzApiKey!,
    apiKeyDev: process.env.digiflazzApiKeyDev!,
    username: process.env.digiflazzUsername!,
    baseURL: process.env.digiflazzBaseURL!,
  },
  DB_HOST: must("DB_HOST"),
  DB_USER: must("DB_USER"),
  DB_PASSWORD: must("DB_PASSWORD"),
  DB_NAME: must("DB_NAME"),
};
