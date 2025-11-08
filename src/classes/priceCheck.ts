import axios from "axios";
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

  async run(
    params?:
      | { code: string; brand?: undefined }
      | { brand: string; code?: undefined }
  ): Promise<IProductResponse> {
    const payload: Record<string, any> = {
      cmd: "prepaid",
      username: env.digiflazz.username,
      sign: md5(env.digiflazz.username + this.apiKey + "pricelist"),
    };

    if (params) {
      if ("code" in params) payload.code = params.code;
      if ("brand" in params) payload.brand = params.brand;
    }

    const { data } = await axios.post(
      env.digiflazz.baseURL + "/price-list",
      payload
    );
    return data;
  }
}

export default priceCheck;
