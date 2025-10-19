import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";

export type WorkspaceTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type WorkspaceLayoutProps = {
  canvas: ReactNode;
    tabs: WorkspaceTab[];
    headerAccessory?: ReactNode;
    bottomAccessory?: ReactNode;
  hideTabList?: boolean;
};

// Shared canvas layout handles chrome around both pupil writing modes.
const WorkspaceLayout = ({
  canvas,
  tabs,
  headerAccessory,
  bottomAccessory,
  hideTabList = false,
}: WorkspaceLayoutProps) => {
  const [openTab, setOpenTab] = useState(() => tabs[0]?.id ?? "");

  useEffect(() => {
    if (tabs.length === 0) {
      setOpenTab("");
      return;
    }
    if (!tabs.find((tab) => tab.id === openTab)) {
      setOpenTab(tabs[0].id);
    }
  }, [tabs, openTab]);

  const currentTab = tabs.find((tab) => tab.id === openTab) ?? tabs[0];

  return (
    <div className="workspace-frame">
      <div className={clsx("workspace-content", hideTabList && "workspace-content--compact")}> 
        <section className="workspace-canvas">{canvas}</section>
        {!hideTabList ? (
          <div className="workspace-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpenTab(tab.id)}
                className={clsx(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                  tab.id === openTab
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                )}
                aria-label={tab.label || tab.id}
                title={tab.label || tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
        {headerAccessory ? (
          <div className={clsx("workspace-header", hideTabList && "workspace-header--compact")}>{headerAccessory}</div>
        ) : null}
        <div className={clsx("workspace-body", hideTabList && "workspace-body--compact")}>
          {currentTab?.content}
        </div>
        {bottomAccessory ? <div className="workspace-footer">{bottomAccessory}</div> : null}
      </div>
    </div>
  );
};

export default WorkspaceLayout;


