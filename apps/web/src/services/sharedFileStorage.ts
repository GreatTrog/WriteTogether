import { supabase } from "./supabaseClient";

type SharedFileBlobRecord = {
  id: string;
  blob: Blob;
  savedAt: string;
  filename?: string;
};

const DB_NAME = "writetogether-shared-files";
const STORE_NAME = "files";
const DB_VERSION = 1;

const isIndexedDbAvailable = () =>
  typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open DB"));
  });

export const saveSharedFileBlob = async (
  id: string,
  blob: Blob,
  filename?: string,
) => {
  try {
    const db = await openDatabase();
    const stored = await new Promise<boolean>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put({
        id,
        blob,
        filename,
        savedAt: new Date().toISOString(),
      } satisfies SharedFileBlobRecord);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
    db.close();
    return stored;
  } catch {
    return false;
  }
};

export const getSharedFileBlob = async (id: string) => {
  try {
    const db = await openDatabase();
    const blob = await new Promise<Blob | null>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        const record = request.result as SharedFileBlobRecord | undefined;
        resolve(record?.blob ?? null);
      };
      request.onerror = () => resolve(null);
    });
    db.close();
    if (blob) {
      return blob;
    }
  } catch {
    // fall through to supabase download
  }

  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from("exports").download(id);
    if (error) {
      console.warn("Supabase storage download failed:", error.message);
      return null;
    }
    return data ?? null;
  } catch {
    return null;
  }
};
