import crypto from "node:crypto";

const keyRaw = process.env.PUPIL_PASSWORD_KEY;

const resolveKey = () => {
  if (!keyRaw) {
    throw new Error("PUPIL_PASSWORD_KEY is missing.");
  }
  const maybeBase64 = Buffer.from(keyRaw, "base64");
  if (maybeBase64.length === 32) {
    return maybeBase64;
  }
  const maybeHex = Buffer.from(keyRaw, "hex");
  if (maybeHex.length === 32) {
    return maybeHex;
  }
  throw new Error("PUPIL_PASSWORD_KEY must be 32 bytes (base64 or hex).");
};

const ALGO = "aes-256-gcm";

export const encryptPassword = (plaintext: string) => {
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

export const decryptPassword = (encoded: string) => {
  const key = resolveKey();
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted password.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
