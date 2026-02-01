export type SharedFileRecord = {
  id: string;
  filename: string;
  username: string;
  savedAt: string;
  location: string;
  sizeBytes: number;
  wordCount: number;
  storageKey?: string | null;
};
