/**
 * Live data hooks — React Query against the backend API with automatic
 * fallback to the deterministic mock dataset when the API is unreachable.
 */

import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Alert, Dispatch, FireRiskZone, MonitoringNode, AnalyticsSummary } from '../../../../shared/types'
import {
  fetchAlerts,
  fetchNodes,
  fetchAnalyticsSummary,
  fetchDispatches,
  fetchFireRisk,
  fetchResponseStats,
  type ResponseStats,
  normalizeAlert,
  normalizeDispatch,
} from '@/services/api'
import { useSocketEvent } from '@/hooks/useSocket'
import { mockAlerts, mockNodes, mockAnalytics } from '@/services/mockData'

// ---------------------------------------------------------------------------
// useAlerts — live list, prepends socket `alert:new` events
// ---------------------------------------------------------------------------

export function useAlerts(): { alerts: Alert[]; isLive: boolean } {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(200),
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 60_000,
  })

  const onNewAlert = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => {
      const alert = normalizeAlert(raw)
      queryClient.setQueryData<Alert[]>(['alerts'], (prev) =>
        prev ? [alert, ...prev.filter((a) => a.id !== alert.id)] : [alert]
      )
    },
    [queryClient]
  )

  const onUpdatedAlert = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => {
      const alert = normalizeAlert(raw)
      queryClient.setQueryData<Alert[]>(['alerts'], (prev) =>
        prev?.map((a) => (a.id === alert.id ? alert : a))
      )
    },
    [queryClient]
  )

  useSocketEvent('alert:new', onNewAlert)
  useSocketEvent('alert:updated', onUpdatedAlert)

  return {
    alerts: query.data ?? mockAlerts,
    isLive: Boolean(query.data),
  }
}

// ---------------------------------------------------------------------------
// useNodes — live list, updates on node status/heartbeat events
// ---------------------------------------------------------------------------

export function useNodes(): { nodes: MonitoringNode[]; isLive: boolean } {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['nodes'],
    queryFn: fetchNodes,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const onNodeStatus = useCallback(
    (payload: { nodeId: string; status: MonitoringNode['status'] }) => {
      queryClient.setQueryData<MonitoringNode[]>(['nodes'], (prev) =>
        prev?.map((n) => (n.id === payload.nodeId ? { ...n, status: payload.status } : n))
      )
    },
    [queryClient]
  )

  useSocketEvent('node:status', onNodeStatus)

  return {
    nodes: query.data ?? mockNodes,
    isLive: Boolean(query.data),
  }
}

// ---------------------------------------------------------------------------
// useAnalyticsSummary — dashboard KPIs
// ---------------------------------------------------------------------------

export function useAnalyticsSummary(): { summary: AnalyticsSummary; isLive: boolean } {
  const query = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchAnalyticsSummary,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  return {
    summary: query.data ?? mockAnalytics,
    isLive: Boolean(query.data),
  }
}

// ---------------------------------------------------------------------------
// useDispatches — automated ranger response feed
// ---------------------------------------------------------------------------

export function useDispatches(): { dispatches: Dispatch[]; isLive: boolean } {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['dispatches'],
    queryFn: fetchDispatches,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const upsert = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any, prepend: boolean) => {
      const dispatch = normalizeDispatch(raw)
      queryClient.setQueryData<Dispatch[]>(['dispatches'], (prev) => {
        const rest = prev?.filter((d) => d.id !== dispatch.id) ?? []
        return prepend ? [dispatch, ...rest] : [...rest, dispatch].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      })
    },
    [queryClient]
  )

  const onNew = useCallback((raw: unknown) => upsert(raw, true), [upsert])
  const onUpdate = useCallback((raw: unknown) => upsert(raw, false), [upsert])

  useSocketEvent('dispatch:new', onNew)
  useSocketEvent('dispatch:update', onUpdate)

  return {
    dispatches: query.data ?? [],
    isLive: Boolean(query.data),
  }
}

// ---------------------------------------------------------------------------
// useFireRisk — zone-wise fire risk forecast
// ---------------------------------------------------------------------------

export function useFireRisk(): {
  zones: FireRiskZone[]
  generatedAt: string | null
  isLive: boolean
} {
  const query = useQuery({
    queryKey: ['analytics', 'fire-risk'],
    queryFn: fetchFireRisk,
    retry: 1,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  return {
    zones: query.data?.zones ?? [],
    generatedAt: query.data?.generatedAt ?? null,
    isLive: Boolean(query.data),
  }
}

// ---------------------------------------------------------------------------
// useResponseStats — officer response tracking + false-alarm rate
// ---------------------------------------------------------------------------

const EMPTY_RESPONSE_STATS: ResponseStats = {
  totalFeedback: 0,
  falseAlarms: 0,
  genuine: 0,
  falseAlarmRate: 0,
  avgResponseSeconds: null,
  acknowledgedCount: 0,
}

export function useResponseStats(): { stats: ResponseStats; isLive: boolean } {
  const query = useQuery({
    queryKey: ['alerts', 'response-stats'],
    queryFn: fetchResponseStats,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  return {
    stats: query.data ?? EMPTY_RESPONSE_STATS,
    isLive: Boolean(query.data),
  }
}

// ---------------------------------------------------------------------------
// useLiveAlertToasts — page-agnostic notification of new alerts
// ---------------------------------------------------------------------------

export function useLiveAlertListener(onAlert: (alert: Alert) => void): void {
  const handler = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw: any) => onAlert(normalizeAlert(raw)),
    [onAlert]
  )
  useSocketEvent('alert:new', handler)
}

// Warm the socket as soon as the app loads (call once at top level)
export function useRealtimeBootstrap(): void {
  useEffect(() => {
    // getSocket is lazy — import here to avoid a circular import at module scope
    void import('@/hooks/useSocket').then(({ getSocket }) => getSocket())
  }, [])
}
