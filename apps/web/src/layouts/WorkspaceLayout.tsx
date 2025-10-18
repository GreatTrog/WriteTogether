import { useEffect, useState } from "react";
import clsx from "clsx";

export type WorkspaceTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type WorkspaceLayoutProps = {
  leftMenu: React.ReactNode;
  canvas: React.ReactNode;
  tabs: WorkspaceTab[];
  headerAccessory?: React.ReactNode;
  bottomAccessory?: React.ReactNode;
  hideTabList?: boolean;
};

const WorkspaceLayout = ({
  leftMenu,
  canvas,
  tabs,
  headerAccessory,
  bottomAccessory,
  hideTabList = false,
}: WorkspaceLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
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
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <aside
        className={clsx(
          "relative z-10 flex h-full flex-col bg-slate-50 transition-all duration-200",
          collapsed ? "w-0 border-r-0" : "w-64 border-r border-slate-200",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand controls" : "Collapse controls"}
          className={clsx(
            "absolute -right-3 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900",
            collapsed && "pointer-events-auto",
          )}
        >
          <span className={clsx("transition", collapsed ? "rotate-180" : "")}>
            &gt;
          </span>
        </button>
        <div
          className={clsx(
            "flex-1 overflow-hidden p-4",
            collapsed && "pointer-events-none opacity-0",
          )}
        >
          <div className="h-full overflow-auto pr-2">{leftMenu}</div>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={clsx(
            "grid min-h-0 flex-1",
            hideTabList
              ? "grid-rows-[auto_auto]"
              : "grid-rows-[auto_minmax(220px,1fr)]",
          )}
        >
          <div className="overflow-auto border-b border-slate-200 px-6 py-5">
            {canvas}
          </div>
          <div className="flex flex-col overflow-hidden border-t border-slate-200">
            {!hideTabList ? (
              <div className="flex flex-nowrap gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-3">
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
              <div
                className={clsx(
                  "px-4 py-3",
                  hideTabList ? "border-b border-slate-200 bg-slate-50" : "",
                )}
              >
                {headerAccessory}
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-4">
              <div className="min-h-0 flex-1 overflow-hidden">
                {currentTab?.content}
              </div>
              {bottomAccessory && (
                <div className="flex-none border-t border-dashed border-slate-200 pt-3">
                  {bottomAccessory}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
