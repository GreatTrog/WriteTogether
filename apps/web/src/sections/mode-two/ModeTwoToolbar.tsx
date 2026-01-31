import { type Editor } from "@tiptap/react";
import VoiceRecorderControls from "../../components/VoiceRecorderControls";
import iconBold from "../../assets/icons/Bold.svg";
import iconItalic from "../../assets/icons/Italics.svg";
import iconUnderline from "../../assets/icons/Underline.svg";
import iconFontDecrease from "../../assets/icons/Font_size_down.svg";
import iconFontIncrease from "../../assets/icons/Font_size_up.svg";
import iconListBullets from "../../assets/icons/Bullets.svg";
import iconListNumbered from "../../assets/icons/Numbered_Bullets.svg";
import iconUndo from "../../assets/icons/Undo.svg";
import iconRedo from "../../assets/icons/Redo.svg";

type ModeTwoToolbarProps = {
  editor: Editor | null;
  fontFamily: string;
  fontOptions: string[];
  onFontChange: (value: string) => void;
  onToggleMark: (mark: "bold" | "italic" | "underline") => void;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  onApplyList: (ordered: boolean) => void;
};

const ModeTwoToolbar = ({
  editor,
  fontFamily,
  fontOptions,
  onFontChange,
  onToggleMark,
  onDecreaseFont,
  onIncreaseFont,
  onApplyList,
}: ModeTwoToolbarProps) => {
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;

  return (
    <div className="mode-two-toolbar">
      <select
        value={fontFamily}
        onChange={(event) => onFontChange(event.target.value)}
        className="mode-two-select mode-two-toolbar-select"
      >
        {fontOptions.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => editor?.chain().focus().undo().run()}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
      >
        <img src={iconUndo} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={() => editor?.chain().focus().redo().run()}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
      >
        <img src={iconRedo} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={() => onToggleMark("bold")}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Bold"
        aria-label="Bold"
        disabled={!editor}
      >
        <img src={iconBold} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={() => onToggleMark("italic")}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Italic"
        aria-label="Italic"
        disabled={!editor}
      >
        <img src={iconItalic} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={() => onToggleMark("underline")}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Underline"
        aria-label="Underline"
        disabled={!editor}
      >
        <img src={iconUnderline} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={onDecreaseFont}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Decrease font size"
        aria-label="Decrease font size"
        disabled={!editor}
      >
        <img src={iconFontDecrease} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={onIncreaseFont}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Increase font size"
        aria-label="Increase font size"
        disabled={!editor}
      >
        <img src={iconFontIncrease} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={() => onApplyList(false)}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Bulleted list"
        aria-label="Bulleted list"
        disabled={!editor}
      >
        <img src={iconListBullets} alt="" className="mode-two-toolbar-icon" />
      </button>
      <button
        type="button"
        onClick={() => onApplyList(true)}
        onMouseDown={(event) => event.preventDefault()}
        className="mode-two-toolbar-button"
        title="Numbered list"
        aria-label="Numbered list"
        disabled={!editor}
      >
        <img src={iconListNumbered} alt="" className="mode-two-toolbar-icon" />
      </button>
      <VoiceRecorderControls
        orientation="inline"
        hideStatus
        showButtonLabels={false}
        useDefaultButtonStyles={false}
        buttonClassName="mode-two-toolbar-button"
        iconClassName="mode-two-toolbar-icon"
      />
    </div>
  );
};

export default ModeTwoToolbar;
