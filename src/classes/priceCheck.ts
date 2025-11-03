import axios from "axios";
import { db } from "../config/database.js";
import type { IProductResponse } from "../interfaces/product.js";
import { env } from "../config/env.js";
import { md5 } from "./md5.js";

class priceCheck {
  apiKey: string;
  username: string;
  constructor(apiKey: string, username: string) {
    this.apiKey = apiKey;
    this.username = username;
  }

  async run(code?: string): Promise<IProductResponse> {
    const payload: Record<string, any> = {
      cmd: "prepaid",
      username: env.digiflazz.username,
      sign: md5(env.digiflazz.username + this.apiKey + "pricelist"),
    };
    if (code) payload.code = code;
    const data = await axios.post(
      env.digiflazz.baseURL + "/price-list",
      payload
    );
    const response: IProductResponse = data.data;
    return response;
  }
}

export default priceCheck;
