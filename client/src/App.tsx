import { useEffect } from "react"
import { Route, Switch, useLocation } from "wouter"
import { Toaster } from "@/components/ui/toast"
import { Layout, AuthLayout } from "@/components/layout"
import { LoginPage, DashboardPage, ShipmentsPage, CreateShipmentPage, TrackPage, SettingsPage } from "@/pages"
import { useAuth } from "@/hooks/useAuth"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/user/login")
    }
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

  const wrap = (children: React.ReactNode) => (
    <Layout user={user ?? undefined} onLogout={logout}>
      {children}
    </Layout>
  )

  return (
    <>
      <Switch>
        <Route path="/user/login">
          <AuthLayout><LoginPage /></AuthLayout>
        </Route>

        <Route path="/admin/dashboard">
          <ProtectedRoute>{wrap(<DashboardPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/shipments/new">
          <ProtectedRoute>{wrap(<CreateShipmentPage />)}</ProtectedRoute>
        </Route>

        <Route path="/admin/shipments">
          <ProtectedRoute>{wrap(<ShipmentsPage />)}</ProtectedRoute>
        </Route>

        <Route path="/tracking/:trackingNumber?">
          {wrap(<TrackPage />)}
        </Route>

        <Route path="/admin/settings">
          <ProtectedRoute>{wrap(<SettingsPage />)}</ProtectedRoute>
        </Route>

        <Route><RedirectToLogin /></Route>
      </Switch>
      <Toaster />
    </>
  )
}

export default App
