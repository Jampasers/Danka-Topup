import fs, { readdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type Client from "../discord/client.js";
import "../settings.js";

function resolveEventsDir(): string {
  const candidates = [
    // relatif dari file ini (saat run dari dist/handlers atau src/handlers)
    path.join(__dirname, "../discord/events"),
    // fallback relatif ke project root
    path.join(process.cwd(), "dist/discord/events"),
    path.join(process.cwd(), "src/discord/events"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Events directory not found. Tried:\n${candidates.join("\n")}`
  );
}

type EventModule = {
  name?: string;
  once?: boolean;
  run?: (client: Client, ...args: any[]) => Promise<void> | void;
  execute?: (client: Client, ...args: any[]) => Promise<void> | void;
  default?: any;
};

export default async (client: Client): Promise<void> => {
  const eventsDir = resolveEventsDir();

  const files = readdirSync(eventsDir).filter(
    (f) =>
      (f.endsWith(".js") || f.endsWith(".ts")) &&
      !f.endsWith(".d.ts") &&
      !f.endsWith(".map")
  );

  for (const name of files) {
    const fullPath = path.join(eventsDir, name);

    // ESM-friendly dynamic import (aman di Windows/Unix)
    const mod = (await import(pathToFileURL(fullPath).href)) as EventModule;

    const event: EventModule =
      (mod.default as EventModule) ?? (mod as EventModule);

    if (!event?.name) continue;

    const handler = async (...args: any[]) => {
      try {
        if (typeof event.run === "function") {
          await event.run(client, ...args);
        } else if (typeof event.execute === "function") {
          await event.execute(client, ...args);
        } else {
          // tidak ada runner yang dikenali
          // eslint-disable-next-line no-console
          console.warn(`[events] ${event.name} tidak punya run/execute`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[events] error on ${event.name}:`, error);
      }
    };

    if (event.once) {
      client.once(event.name, handler);
    } else {
      client.on(event.name, handler);
    }
  }
};
