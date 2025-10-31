import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import clsx from "clsx";
import logoWideUrl from "../assets/logo_wide.svg";
import hamburgerIcon from "../assets/icons/Hamburger_menu.svg";
import hamburgerCloseIcon from "../assets/icons/Hamburger_close.svg";
import { useGlobalMenu } from "./GlobalMenu";
import ColorModeSection from "./global-menu/ColorModeSection";
import { useWorkspaceSettings } from "../store/useWorkspaceSettings";

// Primary nav links that shape the main high-level routes.
const navItems = [
  { label: "Pupil Workspace", to: "/pupil" },
  { label: "Teacher Console", to: "/teacher" },
];

const ShellLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const { content: menuContent } = useGlobalMenu();
  const theme = useWorkspaceSettings((state) => state.theme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);

  const isPupilRoute = location.pathname.startsWith("/pupil");

  const combinedMenuContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4 text-sm text-slate-700">
        <ColorModeSection />
        {menuContent}
      </div>
    );
  }, [menuContent]);

  useEffect(() => {
    if (!menuContent) {
      setMenuOpen(false);
    }
  }, [menuContent]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "standard") {
      root.removeAttribute("data-workspace-theme");
    } else {
      root.dataset.workspaceTheme = theme;
    }
    return () => {
      root.removeAttribute("data-workspace-theme");
    };
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menuPanelRef.current?.contains(target) || menuButtonRef.current?.contains(target))) {
        return;
      }
      setMenuOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="shell-root flex min-h-screen flex-col">
      <header className="shell-header shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link
            to="/"
            className="flex items-center"
            aria-label="Go to homepage"
          >
            <img
              src={logoWideUrl}
              alt="WordWise"
              className="h-16 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  "shell-nav-link",
                  location.pathname.startsWith(item.to) && "is-active",
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              ref={menuButtonRef}
              onClick={() => setMenuOpen((open) => !open)}
              className={clsx(
                "global-menu-trigger",
                menuOpen && "is-open",
              )}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close settings menu" : "Open settings menu"}
            >
              <img
                src={menuOpen ? hamburgerCloseIcon : hamburgerIcon}
                alt=""
                className="global-menu-trigger__icon"
              />
            </button>
          </nav>
        </div>
      </header>
      <main
        className={clsx(
          "shell-main",
          isPupilRoute ? "shell-main--pupil" : "shell-main--default",
        )}
      >
        {children}
      </main>
      {menuOpen ? (
        <div className="global-menu-overlay">
          <button
            type="button"
            className="global-menu-backdrop"
            aria-label="Close settings menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="global-menu-panel" ref={menuPanelRef} role="dialog" aria-label="Settings menu">
            {combinedMenuContent}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ShellLayout;




