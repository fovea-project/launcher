import { Navigate, Outlet, Route, HashRouter, Routes } from "react-router-dom";
import { AppProvider, useApp } from "@/store/app-context";
import { Layout } from "@/components/Layout";
import { Splash } from "@/screens/Splash";
import { Login } from "@/screens/Login";
import { Catalog } from "@/screens/Catalog";
import { ProductPage } from "@/screens/ProductPage";
import { SellerStore } from "@/screens/SellerStore";
import { UserProfile } from "@/screens/UserProfile";
import { Library } from "@/screens/Library";
import { Settings } from "@/screens/Settings";
import { Profile } from "@/screens/Profile";
import { SellerDashboard } from "@/screens/SellerDashboard";
import { ProductEditor } from "@/screens/ProductEditor";
import { Chat } from "@/screens/Chat";
import { Messages } from "@/screens/Messages";
import { WalletScreen } from "@/screens/Wallet";

/** Gate the whole app behind a ready backend connection. */
function ConnectionGate({ children }: { children: React.ReactNode }) {
  const { conn } = useApp();
  if (conn.phase !== "ready") return <Splash />;
  return <>{children}</>;
}

/** Require an authenticated session for the main app shell. */
function RequireAuth() {
  const { session, authReady } = useApp();
  if (!authReady) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}


function Router() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/sellers/:id" element={<SellerStore />} />
            <Route path="/users/:id" element={<UserProfile />} />
            <Route path="/library" element={<Library />} />
            <Route path="/wallet" element={<WalletScreen />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Messages />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            {/* Selling is open to any signed-in user — a store is created
                implicitly on the first listing (no upfront store setup). */}
            <Route path="/sell" element={<SellerDashboard />} />
            <Route path="/sell/new" element={<ProductEditor />} />
            <Route path="/sell/:id/edit" element={<ProductEditor />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="h-screen overflow-hidden">
        <ConnectionGate>
          <Router />
        </ConnectionGate>
      </div>
    </AppProvider>
  );
}
