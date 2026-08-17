/**
 * Activity bridge (spec #16, #18) — pipes live socket events into the
 * notification center and the audit log so both stay current without any
 * page having to wire its own listeners. Mounted once in Layout.
 */

import { useCallback, useRef } from 'react'
import { useSocketEvent } from '@/hooks/useSocket'
import { pushNotification, addAudit } from '@/services/activityStore'
import type { Alert, Dispatch, MonitoringNode } from '../../../../shared/types'

export function useActivityBridge(): void {
  // Track alert statuses so we only audit genuine transitions
  const statusRef = useRef(new Map<string, string>())

  useSocketEvent<Alert>('alert:new', useCallback((alert: Alert) => {
    addAudit('System', `Node generated ${alert.severity} ${alert.type} alert`, alert.id.slice(-6))
    if (alert.severity === 'critical' || alert.severity === 'high') {
      pushNotification({
        kind: 'alert',
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        title: `${alert.severity === 'critical' ? 'Critical' : 'High'} ${alert.type} alert`,
        body: alert.description ?? 'New detection from the mesh.',
        link: '/alerts',
      })
    }
    statusRef.current.set(alert.id, alert.status)
  }, []))

  useSocketEvent<Alert>('alert:updated', useCallback((alert: Alert) => {
    const prev = statusRef.current.get(alert.id)
    if (prev && prev !== alert.status) {
      addAudit('System', `Alert status changed ${prev} → ${alert.status}`, alert.id.slice(-6))
      if (alert.incidentId && prev !== alert.status && alert.status === 'acknowledged') {
        pushNotification({
          kind: 'incident',
          severity: 'info',
          title: `Incident ${alert.incidentId} acknowledged`,
          body: 'An officer acknowledged the correlated incident.',
          link: '/incidents',
        })
      }
    }
    if (alert.verificationStatus === 'confirmed' && prev === undefined) {
      addAudit('System', 'Second node corroborated detection', alert.incidentId ?? alert.id.slice(-6))
    }
    statusRef.current.set(alert.id, alert.status)
  }, []))

  useSocketEvent<Dispatch>('dispatch:new', useCallback((d: Dispatch) => {
    addAudit('System', `Ranger ${d.team} dispatched to ${d.zone}`, d.incidentId ?? d.id.slice(-6))
    pushNotification({
      kind: 'response',
      severity: 'info',
      title: `${d.team} dispatched`,
      body: `Heading to ${d.zone} — ETA ${d.etaMinutes} min.`,
      link: '/dispatch',
    })
  }, []))

  useSocketEvent<Dispatch>('dispatch:update', useCallback((d: Dispatch) => {
    addAudit(`Ranger ${d.team}`, `Marked ${d.status.toUpperCase()}`, d.zone)
    if (d.status === 'resolved') {
      pushNotification({
        kind: 'response',
        severity: 'info',
        title: `${d.team} resolved the incident`,
        body: `Response in ${d.zone} closed.`,
        link: '/dispatch',
      })
    }
  }, []))

  useSocketEvent<MonitoringNode>('node:status', useCallback((node: MonitoringNode) => {
    if (node.status === 'offline') {
      addAudit('System', `Node ${node.name} went OFFLINE`, node.zone)
      pushNotification({
        kind: 'node',
        severity: 'warning',
        title: `Node offline: ${node.name}`,
        body: `${node.zone} — last seen ${new Date(node.lastSeen).toLocaleTimeString()}.`,
        link: '/nodes',
      })
    }
  }, []))
}
