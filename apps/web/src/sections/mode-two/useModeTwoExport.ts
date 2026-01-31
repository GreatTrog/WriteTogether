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
      const defaultNameSeed = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .replace("Z", "");
      const suggestedName = `ModeTwo_${defaultNameSeed}.pdf`;
      const typedWindow = window as FilePickerWindow;
      let resolvedFilename = suggestedName;
      let fileHandle: Awaited<ReturnType<NonNullable<FilePickerWindow["showSaveFilePicker"]>>> | null =
        null;

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

      const storageKey = createId();
      const storedInDb = await saveSharedFileBlob(
        storageKey,
        pdfBlob,
        resolvedFilename,
      );

      addSharedFile({
        filename: resolvedFilename,
        username,
        savedAt: now.toISOString(),
        location: savedLocation,
        sizeBytes: pdfBlob.size,
        wordCount,
        storageKey: storedInDb ? storageKey : null,
      });

      setExportState("success");
      setExportMessage(`Saved and shared ${resolvedFilename}.`);
      if (exportToastTimerRef.current !== null) {
        window.clearTimeout(exportToastTimerRef.current);
        exportToastTimerRef.current = null;
      }
      setExportToast(
        storedInDb
          ? "File exported and a copy sent to your teacher."
          : "File exported. Ask your teacher to request a re-export if needed.",
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
