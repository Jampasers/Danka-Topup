import balCheck from "./classes/balCheck.js";
import priceCheck from "./classes/priceCheck.js";
import { env } from "./config/env.js";
import type { IBalCheck } from "./interfaces/balCheck.js";
import type { IProductResponse } from "./interfaces/product.js";

(async () => {
  const balClass = new priceCheck(
    env.digiflazz.apiKeyDev,
    env.digiflazz.username
  );
  const balData: IProductResponse = await balClass.run("ML44");
  console.dir(balData.data[0], {
    depth: null,
  });
})();
