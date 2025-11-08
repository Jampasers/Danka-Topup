import { initDatabase } from "./config/database.js";
import client from "./discord/client.js";

const cl: client = new client();
cl.start().then(async () => {
  await initDatabase();
});
