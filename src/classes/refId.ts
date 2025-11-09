const str = "abcdefghijklmnopqrstuvwxyz";
const num = "1234567890";
const chars = str + num + str.toUpperCase();

export function createRefId(length: number): string {
  let raw = "";

  for (let i = 0; i < length; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }

  return raw.match(/.{1,5}/g)?.join("-") ?? raw;
}
