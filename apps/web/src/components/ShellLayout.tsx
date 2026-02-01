import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import clsx from "clsx";
import logoWideUrl from "../assets/logo_wide.svg";
import { Mode2Icons } from "../assets/icons/mode2ToolbarIcons";
import { useGlobalMenu } from "./GlobalMenu";
import ColorModeSection from "./global-menu/ColorModeSection";
import { useWorkspaceSettings } from "../store/useWorkspaceSettings";
import useSupabaseSession from "../hooks/useSupabaseSession";
import { supabase } from "../services/supabaseClient";

// Primary nav links that shape the main high-level routes.
const navItems = [
  { label: "Pupil Workspace", to: "/pupil" },
  { label: "Teacher Console", to: "/teacher" },
];

const ShellLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { content: menuContent } = useGlobalMenu();
  const theme = useWorkspaceSettings((state) => state.theme);
  const { session, user } = useSupabaseSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);

  const isPupilRoute = location.pathname.startsWith("/pupil");
  const role = user?.user_metadata?.role;
  const isPupilUser = role === "pupil";
  const isTeacherUser = role === "teacher" || role === "admin";
  const visibleNavItems =
    user && !isTeacherUser
      ? navItems.filter((item) => item.to !== "/teacher")
      : isPupilUser
        ? navItems.filter((item) => item.to !== "/teacher")
        : navItems;

  const handleTeacherLogin = async () => {
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      return;
    }
    setAuthError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/teacher`,
      },
    });
  };

  const handlePupilLogin = () => {
    setAuthError(null);
    navigate("/pupil");
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setAuthError(null);
    await supabase.auth.signOut();
  };

  const combinedMenuContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4 text-sm text-slate-700">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {session ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Signed in
              </div>
              <div className="text-sm font-medium text-slate-800">
                {user?.email ?? "User"}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Login
              </div>
              <button
                type="button"
                onClick={handlePupilLogin}
                className="w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Pupil login
              </button>
              <button
                type="button"
                onClick={handleTeacherLogin}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Teacher login
              </button>
              {authError ? (
                <p className="text-xs text-rose-600">{authError}</p>
              ) : null}
            </div>
          )}
        </div>
        <ColorModeSection />
        {menuContent}
      </div>
    );
  }, [authError, handlePupilLogin, handleSignOut, handleTeacherLogin, menuContent, session, user?.email]);

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
              alt="WriteTogether"
              className="h-16 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {visibleNavItems.map((item) => (
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
              <span
                className="global-menu-trigger__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html: menuOpen ? Mode2Icons.hamburgerClose : Mode2Icons.hamburger,
                }}
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




