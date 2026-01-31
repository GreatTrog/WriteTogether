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
  draftsEnabled: boolean;
  draftOptions: Array<{
    id: string;
    title: string;
    updatedAt: string;
  }>;
  activeDraftId: string | null;
  draftTitle: string;
  draftStatus: string | null;
  onSelectDraft: (id: string) => void;
  onCreateDraft: () => void;
  onRenameDraft: () => void;
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
  draftsEnabled,
  draftOptions,
  activeDraftId,
  draftTitle,
  draftStatus,
  onSelectDraft,
  onCreateDraft,
  onRenameDraft,
}: ModeTwoEditorSurfaceProps) => (
  <div className="mode-two-editor-surface">
    {exportToast ? (
      <div className="mode-two-export-toast" role="status">
        {exportToast}
      </div>
    ) : null}
    {draftsEnabled ? (
      <div className="mode-two-draft-bar">
        <div className="mode-two-draft-bar__left">
          <label className="mode-two-draft-label" htmlFor="mode-two-draft-picker">
            Draft
          </label>
          <select
            id="mode-two-draft-picker"
            className="mode-two-select mode-two-draft-select"
            value={activeDraftId ?? ""}
            onChange={(event) => onSelectDraft(event.target.value)}
          >
            {draftOptions.map((draft) => (
              <option key={draft.id} value={draft.id}>
                {draft.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mode-two-draft-button"
            onClick={onCreateDraft}
          >
            New
          </button>
          <button
            type="button"
            className="mode-two-draft-button"
            onClick={onRenameDraft}
            disabled={!activeDraftId}
          >
            Rename
          </button>
        </div>
        <div className="mode-two-draft-bar__right">
          <span className="mode-two-draft-title">{draftTitle}</span>
          {draftStatus ? (
            <span className="mode-two-draft-status">{draftStatus}</span>
          ) : null}
        </div>
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
      <button
        type="button"
        onClick={onExportPreview}
        disabled={exportState === "loading" || !plainText.trim()}
        className={`mode-two-action-button mode-two-action-button--export${
          exportState === "loading" || !plainText.trim() ? " is-disabled" : ""
        }`}
      >
        {exportState === "loading" ? "Exporting..." : "Export preview"}
      </button>
    </div>
  </div>
);

export default ModeTwoEditorSurface;
