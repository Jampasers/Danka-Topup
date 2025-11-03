export interface IDigiflazzConfig {
  apiKey: string;
  apiKeyDev: string;
  username: string;
  baseURL: string;
}

export interface IEnvConfig {
  phoneNumber: string;
  digiflazz: IDigiflazzConfig;
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
}
