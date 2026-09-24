/**
 * Random unique id (RFC 4122 v4 format).
 *
 * `crypto.randomUUID` only exists in secure contexts (https / localhost), so
 * opening the app over plain http on the local network — e.g.
 * `npm run preview -- --host` on a phone — used to break adding a transaction
 * and every toast. Falls back to `crypto.getRandomValues`, which is available
 * everywhere, and finally to Math.random for exotic environments.
 */
export function newId(): string {
  const c: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
