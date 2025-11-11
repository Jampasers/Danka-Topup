import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import type client from "../client.js";
import createEmbed from "../../classes/createEmbed.js";
import { db } from "../../config/database.js";
import type { RowDataPacket } from "mysql2";

// Struktur data baris DB
type Row = RowDataPacket & {
  product_code: string;
  product_brand: string | null;
  product_name: string | null;
  price: number | string;
};

const data = new SlashCommandBuilder()
  .setName("check-price")
  .setDescription("Check and update product prices from Digiflazz")
  .addStringOption((opt) =>
    opt.setName("code").setDescription("Product SKU code")
  )
  .addNumberOption((opt) =>
    opt
      .setName("limit")
      .setDescription("Show limit")
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addStringOption((opt) =>
    opt
      .setName("brand")
      .setDescription("Game name (fallback untuk INSERT baru)")
      .addChoices(
        { name: "Mobile Legends", value: "MOBILE LEGENDS" },
        { name: "Free Fire", value: "FREE FIRE" },
        { name: "PUBG Mobile", value: "PUBG MOBILE" },
        { name: "Valorant", value: "VALORANT" },
        { name: "Honor of Kings", value: "HONOR OF KINGS" },
        { name: "Call of Duty Mobile", value: "CALL OF DUTY MOBILE" }
      )
  )
  .toJSON();

function formatIDR(n: number | string) {
  const num = typeof n === "string" ? Number(n) : n;
  return Number(num).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isWDP(name?: string | null, code?: string | null) {
  const s = (name || "") + " " + (code || "");
  const upper = s.toUpperCase();
  // deteksi umum WDP
  return (
    upper.includes("WDP") ||
    upper.includes("WEEKLY DIAMOND PASS") ||
    upper.includes("WEEKLY PASS") ||
    upper.includes("WEEKLY")
  );
}

// Helper kategori Free Fire berdasar kode
function ffCategoryByCode(code?: string | null): "FFW" | "FFB" | "FF" {
  const c = (code || "").toUpperCase();
  if (c.startsWith("FFW")) return "FFW";
  if (c.startsWith("FFB")) return "FFB";
  // default ke FF jika memang FF biasa (atau tidak ada prefix spesifik)
  return "FF";
}

function chunk<T>(arr: T[], size = 25): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildFields(rows: Row[]) {
  return rows.map((r) => ({
    name: `${r.product_name ?? "-"} — ${formatIDR(r.price)}`,
    value: `Code: \`${r.product_code}\`${
      r.product_brand ? `\nGame: ${r.product_brand}` : ""
    }`,
    inline: true,
  }));
}

function makeEmbedsForGroup(
  title: string,
  rows: Row[],
  color = 0x2b6cb0 // biru lembut
): EmbedBuilder[] {
  const fields = buildFields(rows);
  const pages = chunk(fields, 25);
  return pages.map((fieldsPage, idx) =>
    new EmbedBuilder()
      .setColor(color)
      .setTitle(
        pages.length > 1 ? `${title} (Page ${idx + 1}/${pages.length})` : title
      )
      .addFields(fieldsPage)
      .setTimestamp(new Date())
  );
}

export default {
  data,
  run: async (client: client, interaction: ChatInputCommandInteraction) => {
    const { options } = interaction;
    const productCode = options.getString("code");
    const limit = options.getNumber("limit") ?? null;
    const brandOpt = options.getString("brand") || null;
    const normBrand = (s?: string | null) => (s || "").trim().toUpperCase();

    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }

      // Mode single SKU: tampilkan ringkas satu embed
      if (productCode) {
        const [rows] = await db.query<Row[]>(
          `
          SELECT price, product_code, product_brand, product_name
          FROM admins
          WHERE product_code = ?
          LIMIT 1
        `,
          [productCode]
        );

        const data = rows.length ? rows[0] : null;
        if (!data) {
          return interaction.editReply({
            embeds: [new createEmbed().run(interaction, "Code ora nemu")],
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x2b6cb0)
          .setTitle("Detail Harga")
          .addFields(
            { name: "Name", value: data.product_name ?? "-", inline: true },
            { name: "Game", value: data.product_brand ?? "-", inline: true },
            { name: "Code", value: `\`${data.product_code}\``, inline: true },
            { name: "Price", value: formatIDR(data.price), inline: true }
          )
          .setTimestamp(new Date());

        return interaction.editReply({ embeds: [embed] });
      }

      // Validasi: jika limit dipilih, brand wajib ada
      if (limit && !brandOpt) {
        return interaction.editReply({
          embeds: [
            new createEmbed().run(
              interaction,
              "Kalo check pake limit, pilih brand ny juga"
            ),
          ],
        });
      }

      // Susun SQL dasar: terurut harga ASC
      const params: any[] = [];
      let sql = `
        SELECT price, product_code, product_brand, product_name
        FROM admins
      `;

      // Filter brand bila ada
      const chosenBrand = normBrand(brandOpt);
      if (chosenBrand) {
        sql += ` WHERE UPPER(product_brand) = ? `;
        params.push(chosenBrand);
      }

      sql += ` ORDER BY CAST(price AS DECIMAL(18,2)) ASC `;

      if (limit) {
        sql += ` LIMIT ?`;
        params.push(limit);
      }

      const [rows] = await db.query<Row[]>(sql, params);

      // Jika brand diminta tapi tidak ada baris -> "Blm ada, sabar"
      if (chosenBrand && (!rows || rows.length === 0)) {
        return interaction.editReply({
          embeds: [new createEmbed().run(interaction, "sex, blm ada")],
        });
      }

      if (!rows?.length) {
        return interaction.editReply({
          embeds: [new createEmbed().run(interaction, "Gkda data")],
        });
      }

      // ==== Grup per brand (satu brand per batch embed) ====
      // Jika brand sudah dipilih, kita hanya proses brand itu; kalau tidak, semua brand.
      const brands = chosenBrand
        ? [chosenBrand]
        : Array.from(
            new Set(rows.map((r) => normBrand(r.product_brand) || "UNKNOWN"))
          ).sort();

      // Kumpulkan rows per brand
      const brandMap = new Map<string, Row[]>();
      for (const b of brands) brandMap.set(b, []);
      for (const r of rows) {
        const b = normBrand(r.product_brand) || "UNKNOWN";
        if (!chosenBrand || b === chosenBrand) {
          brandMap.get(b)?.push(r);
        }
      }

      const allEmbeds: EmbedBuilder[] = [];

      for (const b of brands) {
        const dataRows = brandMap.get(b) || [];
        if (!dataRows.length) continue;

        if (b === "MOBILE LEGENDS") {
          // Pecah Diamonds vs WDP
          const mlDiamonds = dataRows.filter(
            (r) => !isWDP(r.product_name, r.product_code)
          );
          const mlWdp = dataRows.filter((r) =>
            isWDP(r.product_name, r.product_code)
          );

          mlDiamonds.sort((a, b) => Number(a.price) - Number(b.price));
          mlWdp.sort((a, b) => Number(a.price) - Number(b.price));

          const mlDiamondsEmbeds = makeEmbedsForGroup(
            "Mobile Legends — Diamonds",
            mlDiamonds
          );
          const mlWdpEmbeds = makeEmbedsForGroup(
            "Mobile Legends — Weekly Diamond Pass",
            mlWdp
          );

          allEmbeds.push(...mlDiamondsEmbeds, ...mlWdpEmbeds);
        } else if (b === "FREE FIRE") {
          // Pecah FF, FFW, FFB berdasarkan prefix code
          const ff = dataRows.filter(
            (r) => ffCategoryByCode(r.product_code) === "FF"
          );
          const ffw = dataRows.filter(
            (r) => ffCategoryByCode(r.product_code) === "FFW"
          );
          const ffb = dataRows.filter(
            (r) => ffCategoryByCode(r.product_code) === "FFB"
          );

          ff.sort((a, b) => Number(a.price) - Number(b.price));
          ffw.sort((a, b) => Number(a.price) - Number(b.price));
          ffb.sort((a, b) => Number(a.price) - Number(b.price));

          const ffEmbeds = makeEmbedsForGroup("Free Fire — Diamonds", ff);
          const ffwEmbeds = makeEmbedsForGroup("Free Fire — Weekly Pass", ffw);
          const ffbEmbeds = makeEmbedsForGroup("Free Fire — Monthly Pass", ffb);

          allEmbeds.push(...ffEmbeds, ...ffwEmbeds, ...ffbEmbeds);
        } else {
          // Brand lain: satu grup saja
          const ascRows = [...dataRows].sort(
            (a, b) => Number(a.price) - Number(b.price)
          );
          const embeds = makeEmbedsForGroup(b, ascRows);
          allEmbeds.push(...embeds);
        }
      }

      // Jika setelah filter brand tidak ada data -> "Blm ada, sabar"
      if (!allEmbeds.length && chosenBrand) {
        return interaction.editReply({ content: "Blm ada, sabar" });
      }

      // Discord maksimal 10 embeds per message — kirim bertahap
      const maxPerMessage = 10;
      for (let i = 0; i < allEmbeds.length; i += maxPerMessage) {
        const batch = allEmbeds.slice(i, i + maxPerMessage);
        if (i === 0) {
          await interaction.editReply({ embeds: batch });
        } else {
          await interaction.followUp({ embeds: batch });
        }
      }
    } catch (error) {
      console.error("❌ Error while checking price:", error);
      await interaction.editReply({
        embeds: [
          new createEmbed().run(
            interaction,
            "❌ Gagal memeriksa harga produk. Cek log server."
          ),
        ],
      });
    }
  },
};
