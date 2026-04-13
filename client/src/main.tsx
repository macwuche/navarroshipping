import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { AuthContext, useAuthProvider } from "./hooks/useAuth"
import { WsContext, useWsProvider } from "./hooks/useWebSocket"
import "./index.css"

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

function WsProvider({ children }: { children: React.ReactNode }) {
  const ws = useWsProvider()
  return <WsContext.Provider value={ws}>{children}</WsContext.Provider>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <WsProvider>
        <App />
      </WsProvider>
    </AuthProvider>
  </React.StrictMode>
)
