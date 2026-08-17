/**
 * Role-based access (spec #19) — lightweight demo-grade role switch.
 * The active role gates command actions across the command center.
 */

import { createContext, useContext, useState, type ReactNode } from 'react'

export type Role = 'admin' | 'officer' | 'ranger' | 'analyst'

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Full system control' },
  { id: 'officer', label: 'Forest Officer', description: 'Command, dispatch and resolve' },
  { id: 'ranger', label: 'Ranger', description: 'Field response and status updates' },
  { id: 'analyst', label: 'Analyst', description: 'Read-only monitoring and reports' },
]

export type Permission =
  | 'alert.acknowledge'
  | 'alert.dispatch'
  | 'alert.escalate'
  | 'alert.feedback'
  | 'incident.resolve'
  | 'node.manage'
  | 'export.reports'
  | 'role.switch'

const GRANTS: Record<Role, Permission[]> = {
  admin: [
    'alert.acknowledge', 'alert.dispatch', 'alert.escalate', 'alert.feedback',
    'incident.resolve', 'node.manage', 'export.reports', 'role.switch',
  ],
  officer: [
    'alert.acknowledge', 'alert.dispatch', 'alert.escalate', 'alert.feedback',
    'incident.resolve', 'node.manage', 'export.reports',
  ],
  ranger: ['alert.acknowledge', 'alert.feedback'],
  analyst: ['export.reports'],
}

interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
  can: (permission: Permission) => boolean
  roleLabel: string
}

const RoleContext = createContext<RoleContextValue | null>(null)
const ROLE_KEY = 'fg2.role.v1'

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const saved = localStorage.getItem(ROLE_KEY)
    return (ROLES.find((r) => r.id === saved)?.id ?? 'admin') as Role
  })

  const setRole = (next: Role) => {
    setRoleState(next)
    localStorage.setItem(ROLE_KEY, next)
  }

  const can = (permission: Permission) => GRANTS[role].includes(permission)
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role

  return (
    <RoleContext.Provider value={{ role, setRole, can, roleLabel }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside RoleProvider')
  return ctx
}
