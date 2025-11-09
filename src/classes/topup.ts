import axios from "axios";
import { env } from "../config/env.js";
import { md5 } from "./md5.js";
import type { TransactionResponse } from "../interfaces/topup.js";
import { createRefId } from "./refId.js";

class Topup {
  apiKey: string;
  username: string;
  constructor(apiKey: string, username: string) {
    this.apiKey = apiKey;
    this.username = username;
  }
  async run(
    code: string,
    id: string,
    refId?: string
  ): Promise<TransactionResponse> {
    const ref_id = refId || createRefId(15);
    const payload: Record<string, any> = {
      username: this.username,
      sign: md5(this.username + this.apiKey + ref_id),
      buyer_sku_code: code,
      customer_no: id,
      ref_id: ref_id,
      //   testing: true,
    };
    console.log({ payload });
    const { data } = await axios.post(
      env.digiflazz.baseURL + "/transaction",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.dir(data, {
      depth: null,
    });
    return data;
  }
}

export default Topup;
