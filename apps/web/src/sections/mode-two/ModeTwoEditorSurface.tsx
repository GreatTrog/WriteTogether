import { EditorContent, type Editor } from "@tiptap/react";

type ModeTwoEditorSurfaceProps = {
  editor: Editor | null;
  fontSize: number;
  fontFamily: string;
  exportToast: string | null;
  canSpeak: boolean;
  isSpeaking: boolean;
  plainText: string;
  exportState: "idle" | "loading" | "success" | "error";
  onSpeakDraft: () => void;
  onClearDraft: () => void;
  onExportPreview: () => void;
};

const ModeTwoEditorSurface = ({
  editor,
  fontSize,
  fontFamily,
  exportToast,
  canSpeak,
  isSpeaking,
  plainText,
  exportState,
  onSpeakDraft,
  onClearDraft,
  onExportPreview,
}: ModeTwoEditorSurfaceProps) => (
  <div className="mode-two-editor-surface">
    {exportToast ? (
      <div className="mode-two-export-toast" role="status">
        {exportToast}
      </div>
    ) : null}
    <EditorContent
      editor={editor}
      aria-label="Writing area"
      className="mode-two-editor"
      style={{ fontSize: `${fontSize}px`, fontFamily }}
    />
    <div className="mode-two-action-bar">
      <button
        type="button"
        onClick={onSpeakDraft}
        disabled={!canSpeak || !plainText.trim()}
        className={`mode-two-action-button mode-two-action-button--speak${
          !canSpeak || !plainText.trim() ? " is-disabled" : ""
        }`}
      >
        {isSpeaking ? "Stop" : "Read back"}
      </button>
      <button
        type="button"
        onClick={onClearDraft}
        className="mode-two-action-button mode-two-action-button--clear"
      >
        Clear
      </button>
    </div>
  </div>
);

export default ModeTwoEditorSurface;
