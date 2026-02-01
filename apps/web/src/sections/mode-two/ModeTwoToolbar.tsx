import { type Editor } from "@tiptap/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import VoiceRecorderControls from "../../components/VoiceRecorderControls";
import { Mode2Icons } from "../../assets/icons/mode2ToolbarIcons";

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
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const selectRef = useRef<HTMLDivElement | null>(null);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);
  const voiceControlsRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>());
  const itemWidthsRef = useRef(new Map<string, number>());
  const [overflowKeys, setOverflowKeys] = useState<string[]>([]);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const renderIcon = useCallback(
    (name: keyof typeof Mode2Icons) => (
      <span
        className="mode-two-toolbar-icon"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: Mode2Icons[name] }}
      />
    ),
    [],
  );

  const toolbarItems = useMemo(
    () => [
      {
        key: "undo",
        render: (
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Undo"
            aria-label="Undo"
            disabled={!canUndo}
          >
            {renderIcon("undo")}
          </button>
        ),
      },
      {
        key: "redo",
        render: (
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Redo"
            aria-label="Redo"
            disabled={!canRedo}
          >
            {renderIcon("redo")}
          </button>
        ),
      },
      {
        key: "bold",
        render: (
          <button
            type="button"
            onClick={() => onToggleMark("bold")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Bold"
            aria-label="Bold"
            disabled={!editor}
          >
            {renderIcon("bold")}
          </button>
        ),
      },
      {
        key: "italic",
        render: (
          <button
            type="button"
            onClick={() => onToggleMark("italic")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Italic"
            aria-label="Italic"
            disabled={!editor}
          >
            {renderIcon("italic")}
          </button>
        ),
      },
      {
        key: "underline",
        render: (
          <button
            type="button"
            onClick={() => onToggleMark("underline")}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Underline"
            aria-label="Underline"
            disabled={!editor}
          >
            {renderIcon("underline")}
          </button>
        ),
      },
      {
        key: "font-size-down",
        render: (
          <button
            type="button"
            onClick={onDecreaseFont}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Decrease font size"
            aria-label="Decrease font size"
            disabled={!editor}
          >
            {renderIcon("fontSizeDown")}
          </button>
        ),
      },
      {
        key: "font-size-up",
        render: (
          <button
            type="button"
            onClick={onIncreaseFont}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Increase font size"
            aria-label="Increase font size"
            disabled={!editor}
          >
            {renderIcon("fontSizeUp")}
          </button>
        ),
      },
      {
        key: "bulleted-list",
        render: (
          <button
            type="button"
            onClick={() => onApplyList(false)}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Bulleted list"
            aria-label="Bulleted list"
            disabled={!editor}
          >
            {renderIcon("bulletedList")}
          </button>
        ),
      },
      {
        key: "numbered-list",
        render: (
          <button
            type="button"
            onClick={() => onApplyList(true)}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button"
            title="Numbered list"
            aria-label="Numbered list"
            disabled={!editor}
          >
            {renderIcon("numberedList")}
          </button>
        ),
      },
    ],
    [
      canRedo,
      canUndo,
      editor,
      onApplyList,
      onDecreaseFont,
      onIncreaseFont,
      onToggleMark,
      renderIcon,
    ],
  );

  const setItemRef = useCallback(
    (key: string) => (node: HTMLDivElement | null) => {
      itemRefs.current.set(key, node);
    },
    [],
  );

  const measureItemWidths = useCallback(() => {
    toolbarItems.forEach((item) => {
      const node = itemRefs.current.get(item.key);
      if (!node) {
        return;
      }
      const width = node.getBoundingClientRect().width;
      if (width > 0) {
        itemWidthsRef.current.set(item.key, width);
      }
    });
  }, [toolbarItems]);

  const computeOverflow = useCallback(() => {
    const toolbarEl = toolbarRef.current;
    if (!toolbarEl) {
      return;
    }

    measureItemWidths();
    const styles = getComputedStyle(toolbarEl);
    const gapValue = styles.columnGap || styles.gap;
    const gap = Number.parseFloat(gapValue || "0");
    const paddingX =
      Number.parseFloat(styles.paddingLeft || "0") +
      Number.parseFloat(styles.paddingRight || "0");
    const toolbarWidth = toolbarEl.clientWidth;
    const selectWidth = selectRef.current?.getBoundingClientRect().width ?? 0;
    const voiceWidth = voiceControlsRef.current?.getBoundingClientRect().width ?? 0;

    const itemWidths = toolbarItems.map((item) =>
      itemWidthsRef.current.get(item.key) ?? 0,
    );
    const totalItemsWidth =
      itemWidths.reduce((sum, width) => sum + width, 0) +
      gap * Math.max(0, toolbarItems.length - 1);
    const availableWithoutOverflow =
      toolbarWidth - paddingX - selectWidth - voiceWidth - gap * 2;

    if (totalItemsWidth <= availableWithoutOverflow) {
      setOverflowKeys([]);
      return;
    }

    const overflowButtonWidth =
      overflowButtonRef.current?.getBoundingClientRect().width ?? 40;
    const available =
      toolbarWidth -
      paddingX -
      selectWidth -
      voiceWidth -
      gap * 3 -
      overflowButtonWidth;
    let used = 0;
    const nextOverflow: string[] = [];

    toolbarItems.forEach((item, index) => {
      const width = itemWidths[index] ?? 0;
      const nextUsed = used === 0 ? width : used + gap + width;
      if (nextUsed <= available) {
        used = nextUsed;
      } else {
        nextOverflow.push(item.key);
      }
    });

    setOverflowKeys(nextOverflow);
  }, [measureItemWidths, toolbarItems]);

  useLayoutEffect(() => {
    computeOverflow();
  }, [computeOverflow, fontFamily, fontOptions]);

  useEffect(() => {
    if (!toolbarRef.current) {
      return;
    }
    const observer = new ResizeObserver(() => computeOverflow());
    observer.observe(toolbarRef.current);
    return () => observer.disconnect();
  }, [computeOverflow]);

  useEffect(() => {
    if (overflowKeys.length === 0) {
      setOverflowOpen(false);
    }
  }, [overflowKeys.length]);

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (
        toolbarRef.current?.contains(target) ||
        overflowButtonRef.current?.contains(target)
      ) {
        return;
      }
      setOverflowOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [overflowOpen]);

  return (
    <div className="mode-two-toolbar" ref={toolbarRef}>
      <div ref={selectRef}>
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
      </div>
      <div className="mode-two-toolbar-actions">
        {toolbarItems.map((item) => (
          <div
            key={item.key}
            ref={setItemRef(item.key)}
            className={
              overflowKeys.includes(item.key)
                ? "mode-two-toolbar-item mode-two-toolbar-item--hidden"
                : "mode-two-toolbar-item"
            }
          >
            {item.render}
          </div>
        ))}
      </div>
      {overflowKeys.length > 0 ? (
        <div className="mode-two-toolbar-overflow">
          <button
            type="button"
            ref={overflowButtonRef}
            onClick={() => setOverflowOpen((open) => !open)}
            onMouseDown={(event) => event.preventDefault()}
            className="mode-two-toolbar-button mode-two-toolbar-overflow-button"
            title="More"
            aria-label="More toolbar actions"
            aria-expanded={overflowOpen}
          >
            {renderIcon("more")}
          </button>
          {overflowOpen ? (
            <div className="mode-two-toolbar-overflow-panel" role="menu">
              {toolbarItems
                .filter((item) => overflowKeys.includes(item.key))
                .map((item) => (
                  <div key={item.key} className="mode-two-toolbar-overflow-item">
                    {item.render}
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          ref={overflowButtonRef}
          className="mode-two-toolbar-overflow-measure"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      <div ref={voiceControlsRef} className="mode-two-toolbar-voice">
        <VoiceRecorderControls
          orientation="inline"
          hideStatus
          showButtonLabels={false}
          useDefaultButtonStyles={false}
          buttonClassName="mode-two-toolbar-button"
          iconClassName="mode-two-toolbar-icon"
        />
      </div>
    </div>
  );
};

export default ModeTwoToolbar;
