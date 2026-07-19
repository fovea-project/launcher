import * as React from "react";
import type { AuthSession, ConnectionStatus, User } from "@/types/api";
import {
  currentSession,
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  onConnectionStatus,
  setUnauthorizedHandler,
  connectionStatus,
} from "@/lib/api";

interface AppState {
  conn: ConnectionStatus;
  session: AuthSession | null;
  user: User | null;
  /** Becomes true once we've attempted to restore a persisted session. */
  authReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch the profile (e.g. after editing it or becoming a seller). */
  reloadUser: () => Promise<void>;
  /** Optimistically replace the cached user. */
  setUser: (u: User) => void;
}

const AppContext = React.createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [conn, setConn] = React.useState<ConnectionStatus>({
    phase: "starting",
    progress: 0,
    message: "Initializing…",
  });
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);

  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;
    (async () => {
      unlisten = await onConnectionStatus((s) => mounted && setConn(s));
      try {
        const snapshot = await connectionStatus();
        if (mounted) setConn(snapshot);
      } catch {
        /* core not ready yet; events will drive updates */
      }
    })();
    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);

  // Restore a persisted session (JWT held securely in the core) and its profile.
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await currentSession();
        if (!mounted) return;
        setSession(s);
        if (s) {
          const u = await getProfile().catch(() => null);
          if (mounted) setUser(u);
        }
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = React.useCallback(async (username: string, password: string) => {
    const s = await apiLogin(username, password);
    setSession(s);
    const u = await getProfile().catch(() => null);
    setUser(u);
  }, []);

  const logout = React.useCallback(async () => {
    await apiLogout().catch(() => {});
    setSession(null);
    setUser(null);
  }, []);

  // Any API call that returns 401 (expired/rotated token) drops the session and
  // sends the user back to login — so a dead session can't strand them in a
  // blank UI with no way to sign out.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      apiLogout().catch(() => {});
      setSession(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const reloadUser = React.useCallback(async () => {
    const u = await getProfile().catch(() => null);
    setUser(u);
  }, []);

  const value = React.useMemo<AppState>(
    () => ({ conn, session, user, authReady, login, logout, reloadUser, setUser }),
    [conn, session, user, authReady, login, logout, reloadUser],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
