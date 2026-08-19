/**
 * Home — public landing page for JungleSathi.
 *
 * Deliberately outside the dashboard shell (no sidebar/topbar): dark jungle
 * hero, centred serif wordmark, gold display headline, gold pill CTA, and a
 * green help bubble — the console lives at /dashboard.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu,
  X,
  Search,
  User,
  ChevronDown,
  MessageSquare,
  Radio,
  BellRing,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { HeroBackdrop } from '@/components/home/HeroBackdrop'

const NAV = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Live Alerts', to: '/alerts' },
  { label: 'Patrol Map', to: '/map' },
  { label: 'Sensor Network', to: '/nodes' },
  { label: 'Reports', to: '/analytics' },
]

const PILLARS = [
  {
    icon: Radio,
    title: 'Sensor network',
    body: 'Solar LoRa nodes watch the corridors where the forest has no eyes — no cell coverage required.',
  },
  {
    icon: BellRing,
    title: 'Alerts in seconds',
    body: 'On-device acoustic and vision models flag gunshots, chainsaws and fence breaches the moment they happen.',
  },
  {
    icon: ShieldCheck,
    title: 'Rangers dispatched',
    body: 'Every alert is scored, mapped and routed to the nearest patrol with the evidence already attached.',
  },
]

export function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)

  // Close the drawer on Escape, matching the dashboard sidebar's behaviour
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="home-root min-h-screen bg-[#040a06] text-[#f3efe2]">
      {/* ── Utility bar ──────────────────────────────────────────── */}
      <div className="relative z-30 bg-[#050b07] text-[.8125rem]">
        <div className="mx-auto flex h-9 max-w-[1600px] items-center gap-5 px-4 sm:px-6">
          <div className="ml-auto flex items-center gap-4 sm:gap-5">
            <button type="button" className="home-util inline-flex items-center gap-1.5">
              English
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <Link to="/dashboard" className="home-util inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Ranger login</span>
            </Link>
            <Link to="/alerts" className="home-util inline-flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="relative isolate min-h-[clamp(560px,88vh,940px)] overflow-hidden">
        <HeroBackdrop />

        {/* Masthead over the scene */}
        <div className="relative z-20 mx-auto flex max-w-[1600px] items-center px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="home-icon-btn"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-center leading-none"
            aria-label="JungleSathi home"
          >
            <span className="home-wordmark">JungleSathi</span>
            <span className="home-wordmark-sub">Forest Guard</span>
          </Link>

          <Link to="/dashboard" className="home-cta ml-auto">
            Live console
          </Link>
        </div>

        {/* Headline */}
        <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col items-center px-6 pb-24 pt-[clamp(3rem,14vh,8rem)] text-center">
          <h1 className="home-display">Guard the Wild</h1>
          <p className="home-tagline">For the forest, its wildlife and the rangers who walk it</p>

          <Link to="/dashboard" className="home-hero-link group mt-9">
            Enter the live console
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Live strip anchored to the hero base. Width is capped so the fixed
            help bubble in the corner can't sit on top of the last figure. */}
        <dl className="absolute inset-x-0 bottom-0 z-10 mx-auto grid max-w-[1040px] grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 px-6 py-5 text-center backdrop-blur-[2px] sm:grid-cols-4">
          {[
            ['Nodes on watch', '10'],
            ['Hectares covered', '4,200'],
            ['Median alert time', '8s'],
            ['Uptime', '99.4%'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[.6875rem] font-semibold uppercase tracking-[.14em] text-[#c9d6c4]/70">
                {label}
              </dt>
              <dd className="home-stat">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── Pillars ──────────────────────────────────────────────── */}
      <section className="relative border-t border-white/5 bg-[#040a06] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px]">
          <p className="home-eyebrow">How it works</p>
          <h2 className="home-h2 mt-3">Eyes where the forest has none</h2>

          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <span className="home-pillar-icon">
                  <Icon className="h-[1.4rem] w-[1.4rem]" aria-hidden="true" />
                </span>
                <h3 className="home-h3 mt-5">{title}</h3>
                <p className="mt-2.5 text-[.9375rem] leading-relaxed text-[#c9d6c4]/75">{body}</p>
              </div>
            ))}
          </div>

          <Link to="/dashboard" className="home-cta mt-16 inline-flex">
            Open the dashboard
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-[#c9d6c4]/45">
        JungleSathi Forest Guard — wildlife monitoring for protected corridors
      </footer>

      {/* ── Slide-in menu ────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px]"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Site menu"
        aria-hidden={!menuOpen}
        className={`fixed left-0 top-0 z-[100] h-screen w-[min(88vw,340px)] border-r border-white/10 bg-[#070f0a] px-7 py-6 transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="home-wordmark !text-[1.35rem]">JungleSathi</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="home-icon-btn"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-9 flex flex-col">
          {NAV.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="home-drawer-link"
              tabIndex={menuOpen ? 0 : -1}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Help bubble ──────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="home-chat">
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Dismiss message"
              className="absolute right-2 top-1.5 text-white/70 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            How may we help you today?
          </div>
        )}
        <button
          type="button"
          onClick={() => setChatOpen(v => !v)}
          aria-label={chatOpen ? 'Hide help message' : 'Show help message'}
          className="home-chat-fab"
        >
          <MessageSquare className="h-[1.35rem] w-[1.35rem]" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
