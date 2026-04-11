import { useEffect } from "react"
import { Route, Switch, useLocation } from "wouter"
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
} from "@/pages"
import { useAuth } from "@/hooks/useAuth"

// Redirects unauthenticated users to /user/login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) setLocation("/user/login")
  }, [user, isLoading, setLocation])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) return null
  return <>{children}</>
}

function RedirectToLogin() {
  const [, setLocation] = useLocation()
  useEffect(() => { setLocation("/user/login") }, [setLocation])
  return null
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
        {/* ── Auth pages ── */}
        <Route path="/user/login">
          <AuthLayout><LoginPage /></AuthLayout>
        </Route>

        <Route path="/user/signup">
          <AuthLayout><UserSignupPage /></AuthLayout>
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

        <Route path="/admin/shipments">
          <ProtectedRoute>{adminWrap(<ShipmentsPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/settings">
          <ProtectedRoute>{adminWrap(<SettingsPage />)}</ProtectedRoute>
        </Route>

        {/* ── Public tracking (works without login) ── */}
        <Route path="/tracking/:trackingNumber?">
          {adminWrap(<TrackPage />)}
        </Route>

        {/* ── Fallback ── */}
        <Route><RedirectToLogin /></Route>
      </Switch>
      <Toaster />
    </>
  )
}

export default App
