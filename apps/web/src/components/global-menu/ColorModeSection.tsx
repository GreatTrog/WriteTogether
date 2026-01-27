import { themeOptions, useWorkspaceSettings, type WorkspaceTheme } from "../../store/useWorkspaceSettings";

type ColorModeSectionProps = {
  variant?: "default" | "mode-two";
};

const ColorModeSection = ({ variant = "default" }: ColorModeSectionProps) => {
  const theme = useWorkspaceSettings((state) => state.theme);
  const setTheme = useWorkspaceSettings((state) => state.setTheme);

  if (variant === "mode-two") {
    return (
      <label className="mode-two-topic-label">
        Colour mode
        <select
          value={theme}
          onChange={(event) => setTheme(event.target.value as WorkspaceTheme)}
          className="mode-two-select"
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--app-text-muted)" }}>
        Colour mode
      </p>
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value as WorkspaceTheme)}
        className="w-full rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: "var(--app-control-border)",
          backgroundColor: "var(--app-panel)",
          color: "var(--app-text-primary)",
        }}
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ColorModeSection;


