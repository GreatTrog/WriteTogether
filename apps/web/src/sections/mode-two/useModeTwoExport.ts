import { useCallback, useEffect, useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import htmlToPdfmake from "html-to-pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { saveSharedFileBlob } from "../../services/sharedFileStorage";
import { createId } from "../../utils/createId";
import { type ExportState } from "./types";
import { type SharedFileRecord } from "../../store/useTeacherStore";
import { supabase } from "../../services/supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// pdfMake requires the virtual file system to load fonts in the browser bundle.
const pdfMakeWithVfs = pdfMake as typeof pdfMake & { vfs?: Record<string, string> };
const pdfFontsVfs = pdfFonts as unknown as Record<string, string>;
pdfMakeWithVfs.vfs = pdfFontsVfs;

type FilePickerWindow = Window &
  typeof globalThis & {
    showSaveFilePicker?: (
      options?: {
        suggestedName?: string;
        types?: Array<{
          description?: string;
          accept: Record<string, string[]>;
        }>;
      },
    ) => Promise<{
      name: string;
      createWritable: () => Promise<{
        write: (data: Blob | BufferSource | string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

const usernameStorageKey = "writetogether-current-username";
const defaultUsername = "Preview Pupil";

const resolveUsername = () => {
  if (typeof window === "undefined") {
    return defaultUsername;
  }
  try {
    const stored = window.localStorage.getItem(usernameStorageKey);
    if (!stored) {
      return defaultUsername;
    }
    return stored.trim() || defaultUsername;
  } catch {
    return defaultUsername;
  }
};

const resolvePupilLogin = async () => {
  if (!supabase) {
    return null;
  }
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return null;
  }
  const role = user.user_metadata?.role;
  if (role !== "pupil") {
    return null;
  }
  const pupilId = user.user_metadata?.pupil_id ?? null;
  if (!pupilId) {
    return null;
  }
  const metaUsername = user.user_metadata?.username;
  if (typeof metaUsername === "string" && metaUsername.trim()) {
    return {
      pupilId,
      username: metaUsername.trim(),
    };
  }
  const { data, error } = await supabase
    .from("pupils")
    .select("username")
    .eq("id", pupilId)
    .single();
  if (error) {
    console.warn("Unable to resolve pupil username:", error.message);
    return { pupilId, username: null };
  }
  return {
    pupilId,
    username: data?.username ?? null,
  };
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const formatExportTimestamp = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.readAsDataURL(blob);
  });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sanitizeForPdf = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.body.querySelectorAll("*").forEach((element) => {
    element.removeAttribute("style");
  });
  return doc.body.innerHTML || "";
};

const generatePdfBlob = (definition: TDocumentDefinitions) =>
  new Promise<Blob>((resolve, reject) => {
    try {
      const generator = pdfMake.createPdf(definition);
      generator.getBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to produce PDF blob"));
        }
      });
    } catch (error) {
      reject(error);
    }
  });

const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
};

type UseModeTwoExportOptions = {
  editor: Editor | null;
  draftHtml: string;
  plainText: string;
  addSharedFile: (entry: Omit<SharedFileRecord, "id">) => void;
};

type UseModeTwoExportResult = {
  exportState: ExportState;
  exportMessage: string;
  exportToast: string | null;
  handleExportPreview: () => Promise<void>;
};

const resolveTeacherProfileId = async () => {
  if (!supabase) {
    return null;
  }
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return null;
  }
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("auth_user_id", userId)
    .single();
  if (error) {
    console.warn("Unable to resolve teacher profile:", error.message);
    return null;
  }
  return data?.id ?? null;
};

const uploadExportToSupabase = async (
  profileId: string,
  filename: string,
  blob: Blob,
) => {
  if (!supabase) {
    return null;
  }
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${profileId}/${safeName}`;
  const { error } = await supabase.storage
    .from("exports")
    .upload(storagePath, blob, {
      upsert: true,
      contentType: "application/pdf",
    });
  if (error) {
    console.warn("Supabase storage upload failed:", error.message);
    return null;
  }
  return storagePath;
};

const persistSharedFileRecord = async (
  payload: {
    owner_id: string;
    filename: string;
    username: string;
    saved_at: string;
    location: string;
    size_bytes: number;
    word_count: number;
    storage_key: string | null;
  },
) => {
  if (!supabase) {
    return false;
  }
  const { error } = await supabase.from("shared_files").insert(payload);
  if (error) {
    console.warn("Supabase metadata insert failed:", error.message);
    return false;
  }
  return true;
};

const useModeTwoExport = ({
  editor,
  draftHtml,
  plainText,
  addSharedFile,
}: UseModeTwoExportOptions): UseModeTwoExportResult => {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportMessage, setExportMessage] = useState<string>("");
  const [exportToast, setExportToast] = useState<string | null>(null);
  const exportToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (exportToastTimerRef.current !== null) {
        window.clearTimeout(exportToastTimerRef.current);
        exportToastTimerRef.current = null;
      }
    };
  }, []);

  const handleExportPreview = useCallback(async () => {
    if (!plainText.trim()) {
      return;
    }

    setExportState("loading");
    setExportMessage("");

    let shouldRefocus = false;

    try {
      const now = new Date();
      const typedWindow = window as FilePickerWindow;
      let resolvedFilename = "";
      let fileHandle: Awaited<ReturnType<NonNullable<FilePickerWindow["showSaveFilePicker"]>>> | null =
        null;

      const pupilLogin = await resolvePupilLogin();
      if (pupilLogin?.pupilId) {
        const safeUsername = pupilLogin.username
          ? slugify(pupilLogin.username) || "pupil"
          : "pupil";
        const baseName = `${safeUsername}_${formatExportTimestamp(now)}`;
        resolvedFilename = `${baseName}.pdf`;
      } else {
        const fallbackSeed = now
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .replace("Z", "");
        const suggestedName = `ModeTwo_${fallbackSeed}.pdf`;

        if (typedWindow.showSaveFilePicker) {
          try {
            fileHandle = await typedWindow.showSaveFilePicker({
              suggestedName,
              types: [
                {
                  description: "PDF document",
                  accept: { "application/pdf": [".pdf"] },
                },
              ],
            });
            const handleNameRaw = fileHandle.name;
            const handleName = handleNameRaw.toLowerCase().endsWith(".pdf")
              ? handleNameRaw
              : `${handleNameRaw}.pdf`;
            resolvedFilename = handleName;
          } catch (pickerError) {
            const isAbort =
              pickerError instanceof DOMException && pickerError.name === "AbortError";
            if (isAbort) {
              setExportState("idle");
              setExportMessage("Export cancelled.");
              return;
            }
          }
        } else {
          const promptName = window.prompt("Name your export file:", "My writing");
          if (!promptName) {
            setExportState("idle");
            setExportMessage("Export cancelled.");
            return;
          }
          const slug = slugify(promptName) || "my-writing";
          resolvedFilename = `${slug}.pdf`;
        }
      }

      if (!resolvedFilename) {
        setExportState("idle");
        setExportMessage("Export cancelled.");
        return;
      }

      shouldRefocus = editor?.isFocused ?? false;
      editor?.commands.blur();

      const username = resolveUsername();
      const horizontalMargin = 48;
      const verticalMargin = 48;
      const exportHtml = (editor?.getHTML() ?? draftHtml).trim();
      const trimmedContent = plainText.trim();
      const fallbackHtml =
        trimmedContent
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("") || "<p>&nbsp;</p>";
      const sanitizedHtml = sanitizeForPdf(exportHtml || fallbackHtml);
      const pdfContentNodes = htmlToPdfmake(`<div>${sanitizedHtml}</div>`, { window });
      const bodyContent = Array.isArray(pdfContentNodes)
        ? pdfContentNodes
        : [pdfContentNodes];
      const wordCount = trimmedContent.split(/\s+/).length;
      const headingTitle = resolvedFilename.replace(/\.pdf$/i, "");

      const docDefinition: TDocumentDefinitions = {
        info: {
          title: headingTitle,
          author: username,
        },
        pageMargins: [horizontalMargin, verticalMargin, horizontalMargin, verticalMargin],
        defaultStyle: {
          fontSize: 11,
          lineHeight: 1.5,
        },
        styles: {
          exportTitle: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 8],
          },
          exportMetaGroup: {
            margin: [0, 0, 0, 12],
          },
          exportMeta: {
            fontSize: 10,
            color: "#475569",
            margin: [0, 0, 0, 2],
          },
          exportFooter: {
            fontSize: 9,
            color: "#64748b",
          },
        },
        content: [
          { text: headingTitle, style: "exportTitle" },
          {
            stack: [
              { text: `Author: ${username}`, style: "exportMeta" },
              { text: `Saved: ${now.toLocaleString()}`, style: "exportMeta" },
              { text: `Word count: ${wordCount}`, style: "exportMeta" },
            ],
            style: "exportMetaGroup",
          },
          { text: "", margin: [0, 4, 0, 4] },
          ...bodyContent,
        ],
        footer: (currentPage, pageCount) => ({
          margin: [horizontalMargin, 12, horizontalMargin, 0],
          columns: [
            { text: "", width: "*" },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: "right",
              style: "exportFooter",
            },
          ],
        }),
      };

      const pdfBlob = await generatePdfBlob(docDefinition);
      let savedLocation = "Browser download";
      if (fileHandle) {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          savedLocation = `File picker (${resolvedFilename})`;
        } catch {
          setExportState("error");
          setExportMessage("We couldn't save the PDF. Please try again.");
          return;
        }
      } else {
        try {
          downloadBlob(pdfBlob, resolvedFilename);
        } catch {
          setExportState("error");
          setExportMessage("We couldn't save the PDF. Please try again.");
          return;
        }
      }

      const teacherProfileId = await resolveTeacherProfileId();
      let storedInDb = false;
      let storageKey: string | null = null;
      let sharedRecord: Omit<SharedFileRecord, "id"> | null = null;

      if (pupilLogin?.pupilId) {
        try {
          const { data: sessionData } = await supabase!.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) {
            throw new Error("Missing pupil session token.");
          }
          const pdfBase64 = await blobToBase64(pdfBlob);
          const response = await fetch(`${apiBaseUrl}/api/exports/submit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              filename: resolvedFilename,
              pdf_base64: pdfBase64,
              word_count: wordCount,
              saved_at: now.toISOString(),
              size_bytes: pdfBlob.size,
            }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Unable to submit export.");
          }
          const result = await response.json();
          storageKey = result.storageKey ?? null;
          storedInDb = Boolean(storageKey);
          if (storedInDb) {
            sharedRecord = {
              filename: result.filename ?? resolvedFilename,
              username: result.username ?? username,
              savedAt: result.savedAt ?? now.toISOString(),
              location: result.location ?? "Submitted by pupil",
              sizeBytes: result.sizeBytes ?? pdfBlob.size,
              wordCount: result.wordCount ?? wordCount,
              storageKey,
            };
          }
        } catch (error) {
          console.warn(
            "Pupil export submit failed:",
            error instanceof Error ? error.message : error,
          );
        }
      } else if (teacherProfileId) {
        const storagePath = await uploadExportToSupabase(
          teacherProfileId,
          resolvedFilename,
          pdfBlob,
        );
        if (storagePath) {
          storageKey = storagePath;
          storedInDb = await persistSharedFileRecord({
            owner_id: teacherProfileId,
            filename: resolvedFilename,
            username,
            saved_at: now.toISOString(),
            location: savedLocation,
            size_bytes: pdfBlob.size,
            word_count: wordCount,
            storage_key: storageKey,
          });
          if (storedInDb) {
            sharedRecord = {
              filename: resolvedFilename,
              username,
              savedAt: now.toISOString(),
              location: savedLocation,
              sizeBytes: pdfBlob.size,
              wordCount,
              storageKey,
            };
          }
        }
      }

      if (!storedInDb) {
        const localStorageKey = createId();
        const storedLocally = await saveSharedFileBlob(
          localStorageKey,
          pdfBlob,
          resolvedFilename,
        );
        storageKey = storedLocally ? localStorageKey : null;
      }

      if (sharedRecord) {
        addSharedFile(sharedRecord);
      }

      setExportState("success");
      setExportMessage(`Saved ${resolvedFilename}.`);
      if (exportToastTimerRef.current !== null) {
        window.clearTimeout(exportToastTimerRef.current);
        exportToastTimerRef.current = null;
      }
      setExportToast(
        storedInDb
          ? "File exported and shared with your teacher."
          : "File exported locally. Ask your teacher to request a re-export.",
      );
      exportToastTimerRef.current = window.setTimeout(() => {
        setExportToast(null);
        exportToastTimerRef.current = null;
      }, 3500);
    } catch (error) {
      console.error(error);
      setExportState("error");
      setExportMessage("Export failed. Please try again.");
    } finally {
      if (shouldRefocus) {
        window.setTimeout(() => {
          editor?.commands.focus("end");
        }, 50);
      }
    }
  }, [addSharedFile, draftHtml, editor, plainText]);

  return {
    exportState,
    exportMessage,
    exportToast,
    handleExportPreview,
  };
};

export default useModeTwoExport;
