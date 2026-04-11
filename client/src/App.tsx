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
      setLocation("/login")
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
  useEffect(() => { setLocation("/login") }, [setLocation])
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
        <Route path="/login">
          <AuthLayout><LoginPage /></AuthLayout>
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute>{wrap(<DashboardPage />)}</ProtectedRoute>
        </Route>

        <Route path="/shipments/new">
          <ProtectedRoute>{wrap(<CreateShipmentPage />)}</ProtectedRoute>
        </Route>

        <Route path="/shipments">
          <ProtectedRoute>{wrap(<ShipmentsPage />)}</ProtectedRoute>
        </Route>

        <Route path="/track/:trackingNumber?">
          {wrap(<TrackPage />)}
        </Route>

        <Route path="/settings">
          <ProtectedRoute>{wrap(<SettingsPage />)}</ProtectedRoute>
        </Route>

        <Route><RedirectToLogin /></Route>
      </Switch>
      <Toaster />
    </>
  )
}

export default App
