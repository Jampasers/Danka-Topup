export interface IDigiflazzConfig {
  apiKey: string;
  apiKeyDev: string;
  username: string;
  baseURL: string;
}

export interface IWhatsApp {
  phoneNumber: string;
  useQRCode: boolean;
}

export interface IDiscord {
  botToken: string;
  serverId: string;
  ownerId: string;
  profileBot: string;
}

export interface IEnvConfig {
  whatsapp: IWhatsApp;
  discord: IDiscord;
  digiflazz: IDigiflazzConfig;
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}
