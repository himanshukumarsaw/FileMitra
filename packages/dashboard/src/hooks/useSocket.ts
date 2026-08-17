/**
 * Socket.IO realtime connection to the backend (same-origin via Vite proxy).
 * Provides connection status and event subscription hooks.
 */

import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/** Singleton socket shared across the app */
export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

/** True while the realtime connection is established */
export function useConnectionStatus(): boolean {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const s = getSocket()
    setConnected(s.connected)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [])

  return connected
}

/** Subscribe to a socket event for the lifetime of the component */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
  useEffect(() => {
    const s = getSocket()
    const listener = (payload: T) => handler(payload)
    s.on(event, listener)
    return () => {
      s.off(event, listener)
    }
  }, [event, handler])
}
