import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react"

export type WsMessage =
  | { type: "user:new"; user: { id: number; name: string; email: string; role: string; createdAt: string } }
  | { type: "shipment:updated"; shipment: any }

type Listener = (msg: WsMessage) => void

interface WsContextValue {
  subscribe: (listener: Listener) => () => void
}

export const WsContext = createContext<WsContextValue | null>(null)

/**
 * Maintains ONE WebSocket connection for the whole app.
 * Fans out messages to all subscribers. Auto-reconnects with backoff.
 */
export function useWsProvider(): WsContextValue {
  const listenersRef = useRef<Set<Listener>>(new Set())

  useEffect(() => {
    let ws: WebSocket
    let delay = 1000
    let dead = false
    let timer: ReturnType<typeof setTimeout>

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

      ws.onopen = () => { delay = 1000 }

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as WsMessage
          listenersRef.current.forEach((fn) => fn(data))
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!dead) {
          timer = setTimeout(() => { delay = Math.min(delay * 2, 30000); connect() }, delay)
        }
      }
    }

    connect()

    return () => {
      dead = true
      clearTimeout(timer)
      ws?.close()
    }
  }, [])

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  return { subscribe }
}

/**
 * Subscribe to WebSocket messages from any component.
 * Uses the single shared connection from WsProvider.
 */
export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const ctx = useContext(WsContext)
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    if (!ctx) return
    return ctx.subscribe((msg) => handlerRef.current(msg))
  }, [ctx])
}
