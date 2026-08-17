/**
 * Global search (spec #17) — searches across alerts, incidents, nodes,
 * species, zones and response teams from the TopBar input.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Bell, Radio, Crosshair, Siren, PawPrint, MapPin, CornerDownLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlerts, useNodes, useDispatches } from '@/hooks/useLiveData'
import { groupIncidents } from '@/services/intel'

interface SearchHit {
  key: string
  group: 'Alerts' | 'Incidents' | 'Nodes' | 'Species' | 'Zones' | 'Response Teams'
  icon: typeof Bell
  label: string
  detail: string
  link: string
}

const GROUP_ICON = {
  Alerts: Bell,
  Incidents: Crosshair,
  Nodes: Radio,
  Species: PawPrint,
  Zones: MapPin,
  'Response Teams': Siren,
} as const

const MAX_PER_GROUP = 4

export function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { alerts } = useAlerts()
  const { nodes } = useNodes()
  const { dispatches } = useDispatches()

  const incidents = useMemo(() => groupIncidents(alerts), [alerts])

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const out: SearchHit[] = []
    const push = (hit: Omit<SearchHit, 'key'>) => out.push({ ...hit, key: `${hit.group}-${hit.label}-${out.length}` })

    for (const a of alerts) {
      const hay = `${a.type} ${a.severity} ${a.soundType ?? ''} ${a.species ?? ''} ${a.description ?? ''}`.toLowerCase()
      if (hay.includes(q)) {
        push({
          group: 'Alerts',
          icon: Bell,
          label: `${a.soundType ?? a.type} · ${a.severity}`,
          detail: a.description ?? a.id.slice(-6),
          link: '/alerts',
        })
      }
    }
    for (const inc of incidents) {
      const hay = `${inc.id} ${inc.types.join(' ')} ${inc.alerts.map((x) => x.soundType ?? '').join(' ')}`.toLowerCase()
      if (hay.includes(q)) {
        push({
          group: 'Incidents',
          icon: Crosshair,
          label: `Incident ${inc.id}`,
          detail: `${inc.alerts.length} alerts · ${inc.nodeCount} nodes · ${inc.severity}`,
          link: '/incidents',
        })
      }
    }
    for (const n of nodes) {
      const hay = `${n.name} ${n.zone} ${n.status} ${n.hardwareModel}`.toLowerCase()
      if (hay.includes(q)) {
        push({
          group: 'Nodes',
          icon: Radio,
          label: n.name,
          detail: `${n.zone} · ${n.status}`,
          link: '/nodes',
        })
      }
    }
    // Species — distinct animal species matching the query
    const species = new Set<string>()
    for (const a of alerts) {
      if (a.type === 'animal' && a.species && a.species.toLowerCase().includes(q)) species.add(a.species)
    }
    for (const s of species) {
      const count = alerts.filter((a) => a.species === s).length
      push({
        group: 'Species',
        icon: PawPrint,
        label: s,
        detail: `${count} detection${count !== 1 ? 's' : ''}`,
        link: '/analytics',
      })
    }
    // Zones — distinct node zones
    const zones = new Set<string>()
    for (const n of nodes) if (n.zone.toLowerCase().includes(q)) zones.add(n.zone)
    for (const z of zones) {
      const count = nodes.filter((n) => n.zone === z).length
      push({
        group: 'Zones',
        icon: MapPin,
        label: z,
        detail: `${count} node${count !== 1 ? 's' : ''}`,
        link: '/map',
      })
    }
    for (const d of dispatches) {
      const hay = `${d.team} ${d.zone} ${d.status} ${d.alertType}`.toLowerCase()
      if (hay.includes(q)) {
        push({
          group: 'Response Teams',
          icon: Siren,
          label: d.team,
          detail: `${d.zone} · ${d.status}`,
          link: '/dispatch',
        })
      }
    }
    return out
  }, [query, alerts, incidents, nodes, dispatches])

  const grouped = useMemo(() => {
    const map = new Map<SearchHit['group'], SearchHit[]>()
    for (const h of hits) {
      const list = map.get(h.group) ?? []
      if (list.length < MAX_PER_GROUP) list.push(h)
      map.set(h.group, list)
    }
    return [...map.entries()]
  }, [hits])

  const totals = useMemo(() => {
    const count = (g: SearchHit['group']) => hits.filter((h) => h.group === g).length
    return {
      alerts: count('Alerts'),
      incidents: count('Incidents'),
      nodes: count('Nodes'),
      teams: count('Response Teams'),
    }
  }, [hits])

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  const go = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    navigate(hit.link)
  }

  return (
    <div ref={rootRef} className="relative max-w-md flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-muted" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search alerts, nodes, species, teams…  ( / )"
        aria-label="Global search"
        className="h-9 w-full rounded-lg border border-slate-surface bg-slate-surface/50 pl-9 pr-4 text-sm text-slate-text placeholder:text-slate-muted focus:border-forest-light focus:outline-none focus:ring-1 focus:ring-forest-light/50"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 top-11 z-[1200] w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-slate-dark shadow-2xl shadow-black/50">
          {/* Summary line */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-white/5 px-4 py-2.5 text-[11px] text-slate-muted">
            <span>{totals.alerts} alerts</span>
            <span>{totals.incidents} incidents</span>
            <span>{totals.nodes} nodes</span>
            <span>{totals.teams} teams</span>
          </div>

          {grouped.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-slate-muted">
              No results for “{query.trim()}”.
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto py-1">
            {grouped.map(([group, items]) => {
              const GroupIcon = GROUP_ICON[group]
              return (
                <div key={group}>
                  <div className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-muted">
                    <GroupIcon size={11} />
                    {group}
                  </div>
                  {items.map((hit) => (
                    <button
                      key={hit.key}
                      onClick={() => go(hit)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.04]'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium capitalize text-slate-text">{hit.label}</div>
                        <div className="truncate text-[11px] text-slate-muted">{hit.detail}</div>
                      </div>
                      <CornerDownLeft size={12} className="shrink-0 text-slate-muted/50" />
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
