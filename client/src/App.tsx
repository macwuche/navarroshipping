import { Route, Switch, Redirect } from "wouter"
import { Toaster } from "@/components/ui/toast"
import { Layout, AuthLayout, UserLayout } from "@/components/layout"
import {
  LoginPage,
  DashboardPage,
  ShipmentsPage,
  CreateShipmentPage,
  TrackPage,
  SettingsPage,
  UserSignupPage,
  UserDashboardPage,
  UsersPage,
  UserProfilePage,
  EditShipmentPage,
} from "@/pages"
import { useAuth } from "@/hooks/useAuth"

// Redirects unauthenticated users to /user/login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) return <Redirect to="/user/login" />
  return <>{children}</>
}

function App() {
  const { user, logout } = useAuth()

  // Admin layout (with sidebar)
  const adminWrap = (children: React.ReactNode) => (
    <Layout user={user ?? undefined} onLogout={logout}>
      {children}
    </Layout>
  )

  // User layout (clean top-nav only)
  const userWrap = (children: React.ReactNode) => (
    <UserLayout
      user={user ? { name: user.name, email: user.email, role: user.role } : undefined}
      onLogout={logout}
    >
      {children}
    </UserLayout>
  )

  return (
    <>
      <Switch>
        {/* ── Auth pages — redirect to dashboard if already logged in ── */}
        <Route path="/user/login">
          {user
            ? <Redirect to={user.role === "admin" || user.role === "staff" ? "/admin/dashboard" : "/user/dashboard"} />
            : <AuthLayout><LoginPage /></AuthLayout>}
        </Route>

        <Route path="/user/signup">
          {user
            ? <Redirect to="/user/dashboard" />
            : <AuthLayout><UserSignupPage /></AuthLayout>}
        </Route>

        {/* ── User dashboard ── */}
        <Route path="/user/dashboard">
          <ProtectedRoute>{userWrap(<UserDashboardPage />)}</ProtectedRoute>
        </Route>

        {/* ── Admin pages ── */}
        <Route path="/admin/dashboard">
          <ProtectedRoute>{adminWrap(<DashboardPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/shipments/new">
          <ProtectedRoute>{adminWrap(<CreateShipmentPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/shipments/:id/edit">
          <ProtectedRoute>{adminWrap(<EditShipmentPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/shipments">
          <ProtectedRoute>{adminWrap(<ShipmentsPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/settings">
          <ProtectedRoute>{adminWrap(<SettingsPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/users">
          <ProtectedRoute>{adminWrap(<UsersPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/users/:id">
          <ProtectedRoute>{adminWrap(<UserProfilePage />)}</ProtectedRoute>
        </Route>

        {/* ── Public tracking ── */}
        <Route path="/tracking/:trackingNumber?">
          {userWrap(<TrackPage />)}
        </Route>

        {/* ── Fallback ── */}
        <Route><Redirect to="/user/login" /></Route>
      </Switch>
      <Toaster />
    </>
  )
}

export default App
