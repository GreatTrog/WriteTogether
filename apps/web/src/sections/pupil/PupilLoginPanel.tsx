import { useEffect, useRef, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { linkPupilByEmail } from "../../services/pupilAuthApi";
import useSupabaseSession from "../../hooks/useSupabaseSession";

const PUPIL_EMAIL_DOMAIN = "pupil.writetogether.local";

const resolvePupilEmail = (username: string) =>
  `${username.toLowerCase()}@${PUPIL_EMAIL_DOMAIN}`;

const PupilLoginPanel = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session, loading: sessionLoading } = useSupabaseSession();
  const linkedEmailRef = useRef<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/pupil`,
      },
    });
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const email = user?.email;
    if (!email || linkedEmailRef.current === email) {
      return;
    }
    linkedEmailRef.current = email;
    linkPupilByEmail(email).catch((linkError) => {
      console.warn(linkError);
    });
  }, [user?.email]);

  const handlePasswordSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (!username.trim() || !password) {
      setError("Enter a username and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const email = resolvePupilEmail(username.trim());
    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    try {
      const userEmail = data.user?.email;
      if (userEmail) {
        await linkPupilByEmail(userEmail);
      }
    } catch (linkError) {
      console.warn(linkError);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 text-sm text-[color:var(--app-text-muted)] shadow-sm">
        Loading login...
      </div>
    );
  }

  if (session) {
    return (
      <div className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[color:var(--app-text-primary)]">Pupil login</h2>
        <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
          Signed in as {user?.email ?? "pupil"}.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 rounded-md border border-[color:var(--app-border)] px-3 py-2 text-sm font-semibold text-[color:var(--app-text-muted)] transition hover:bg-[color:var(--app-control-hover-bg)]"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[color:var(--app-text-primary)]">Pupil login</h2>
      <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
        Sign in with Google or use your class username and password.
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="wt-button-primary rounded-md px-4 py-2 text-sm font-semibold transition hover:opacity-90"
        >
          Sign in with Google
        </button>
      </div>
      <div className="mt-6 border-t border-[color:var(--app-border)] pt-4">
        <form onSubmit={handlePasswordSignIn} className="grid gap-3">
          <label className="text-xs font-medium text-[color:var(--app-text-muted)]">
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. pupil.d"
              className="mt-1 w-full rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-3 py-2 text-sm text-[color:var(--app-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--app-control-border)]"
            />
          </label>
          <label className="text-xs font-medium text-[color:var(--app-text-muted)]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="mt-1 w-full rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-3 py-2 text-sm text-[color:var(--app-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--app-control-border)]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="wt-button-secondary rounded-md px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      ) : null}
    </div>
  );
};

export default PupilLoginPanel;
