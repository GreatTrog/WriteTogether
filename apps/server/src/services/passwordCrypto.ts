import crypto from "node:crypto";

const keyRaw = process.env.PUPIL_PASSWORD_KEY;
const keyRingRaw = process.env.PUPIL_PASSWORD_KEYS;
const activeKeyIdRaw = process.env.PUPIL_PASSWORD_KEY_ID;

const parseKeyMaterial = (value: string) => {
  const maybeBase64 = Buffer.from(value, "base64");
  if (maybeBase64.length === 32) {
    return maybeBase64;
  }
  const maybeHex = Buffer.from(value, "hex");
  if (maybeHex.length === 32) {
    return maybeHex;
  }
  throw new Error("Key material must be 32 bytes (base64 or hex).");
};

const resolveKeyring = () => {
  const ring = new Map<string, Buffer>();

  if (keyRingRaw) {
    const pairs = keyRingRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    pairs.forEach((entry) => {
      const separator = entry.indexOf(":");
      if (separator < 1 || separator === entry.length - 1) {
        throw new Error(
          "PUPIL_PASSWORD_KEYS must use 'keyId:keyMaterial' comma-separated format.",
        );
      }
      const keyId = entry.slice(0, separator).trim();
      const material = entry.slice(separator + 1).trim();
      if (!keyId) {
        throw new Error("PUPIL_PASSWORD_KEYS contains an empty key ID.");
      }
      ring.set(keyId, parseKeyMaterial(material));
    });
  }

  if (keyRaw) {
    // Backward-compatible default key ID for single-key deployments.
    ring.set("default", parseKeyMaterial(keyRaw));
  }

  if (ring.size === 0) {
    throw new Error(
      "PUPIL_PASSWORD_KEY or PUPIL_PASSWORD_KEYS is required.",
    );
  }

  const activeKeyId = activeKeyIdRaw?.trim() || "default";
  const activeKey = ring.get(activeKeyId);
  if (!activeKey) {
    throw new Error(
      `PUPIL_PASSWORD_KEY_ID '${activeKeyId}' is not present in PUPIL_PASSWORD_KEYS.`,
    );
  }

  return {
    activeKeyId,
    activeKey,
    ring,
  };
};

const ALGO = "aes-256-gcm";

export const encryptPassword = (plaintext: string) => {
  const { activeKeyId, activeKey } = resolveKeyring();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, activeKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    activeKeyId,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

export const decryptPassword = (encoded: string) => {
  const { ring, activeKey } = resolveKeyring();
  const parts = encoded.split(".");
  if (parts.length !== 3 && parts.length !== 4) {
    throw new Error("Invalid encrypted password.");
  }
  const hasKeyId = parts.length === 4;
  const keyId = hasKeyId ? parts[0] : "default";
  const ivB64 = hasKeyId ? parts[1] : parts[0];
  const tagB64 = hasKeyId ? parts[2] : parts[1];
  const dataB64 = hasKeyId ? parts[3] : parts[2];
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted password.");
  }
  const key = ring.get(keyId) ?? (hasKeyId ? null : activeKey);
  if (!key) {
    throw new Error(`Unknown password key ID '${keyId}'.`);
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
