import fs, { readdirSync } from "fs";
import path from "path";
import type Client from "../discord/client.js";
import "../settings.js";

function resolveCommandsDir(): string {
  const candidates = [
    // relatif dari file ini (mis. saat run dari dist/handlers atau src/handlers)
    path.join(__dirname, "../discord/commands"),
    // fallback relatif ke project root
    path.join(process.cwd(), "dist/discord/commands"),
    path.join(process.cwd(), "src/discord/commands"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Commands directory not found. Tried:\n${candidates.join("\n")}`
  );
}

export default async (client: Client): Promise<void> => {
  const commandsDir = resolveCommandsDir();

  const files = readdirSync(commandsDir).filter(
    (f) =>
      (f.endsWith(".js") || f.endsWith(".ts")) &&
      !f.endsWith(".d.ts") &&
      !f.endsWith(".map")
  );

  for (const name of files) {
    const fullPath = path.join(commandsDir, name);
    // ESM-friendly dynamic import (harus URL)
    const mod = await import("file:///" + fullPath);

    const command = mod.default ?? mod.command ?? mod;
    if (!command?.data?.name) continue;

    client.slashCommands.set(command.data.name, command);
    client.slashCommand.push(command.data);
  }
};
