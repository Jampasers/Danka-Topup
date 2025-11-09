import axios from "axios";
import type { IBalCheck } from "../interfaces/balCheck.ts";
import { env } from "../config/env.js";
import { md5 } from "./md5.js";

class balCheck {
  apiKey: string;
  username: string;
  constructor(apiKey: string, username: string) {
    this.apiKey = apiKey;
    this.username = username;
  }

  async run(): Promise<IBalCheck> {
    const data = await axios.post(env.digiflazz.baseURL + "/cek-saldo", {
      cmd: "deposit",
      username: this.username,
      sign: md5(this.username + this.apiKey + "depo"),
    });
    const result: IBalCheck = data.data;
    return result;
  }
}

export default balCheck;
