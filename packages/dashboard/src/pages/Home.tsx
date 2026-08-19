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
  Radio,
  BellRing,
  ShieldCheck,
  ArrowRight,
  Newspaper,
  Lightbulb,
  Activity,
  MapPin,
  Camera,
  Siren,
  Flame,
  Footprints,
  Binoculars,
  CreditCard,
  CheckCircle2,
  Phone,
  Mail,
  MapPinned,
  Globe2,
  Shield,
  Wifi,
  Users,
} from 'lucide-react'
import { HeroBackdrop } from '@/components/home/HeroBackdrop'
import { ChatWidget } from '@/components/home/ChatWidget'

const NAV = [
  { label: { en: 'Overview', hi: 'अवलोकन' }, to: '/dashboard' },
  { label: { en: 'Live Alerts', hi: 'लाइव अलर्ट' }, to: '/alerts' },
  { label: { en: 'Patrol Map', hi: 'पैट्रोल मानचित्र' }, to: '/map' },
  { label: { en: 'Sensor Network', hi: 'सेंसर नेटवर्क' }, to: '/nodes' },
  { label: { en: 'Reports', hi: 'रिपोर्ट' }, to: '/analytics' },
]

const NEWS = [
  {
    id: 'n1',
    tag: { en: 'Wildlife', hi: 'वन्यजीव' },
    title: {
      en: 'Elephant herd spotted near Buffer Zone-3 boundary',
      hi: 'बफर ज़ोन-3 सीमा के पास हाथी का झुंड देखा गया',
    },
    time: '12 min ago',
    icon: Footprints,
  },
  {
    id: 'n2',
    tag: { en: 'Alert', hi: 'अलर्ट' },
    title: {
      en: 'Gunshot detected by Node Watchtower Alpha',
      hi: 'नोड वॉचटावर अल्फा द्वारा गनशॉट का पता चला',
    },
    time: '34 min ago',
    icon: Siren,
  },
  {
    id: 'n3',
    tag: { en: 'Environment', hi: 'पर्यावरण' },
    title: {
      en: 'Dry spell continues — fire risk raised to HIGH',
      hi: 'सूखा काल जारी है — आग का खतरा उच्च रखा गया',
    },
    time: '1 hr ago',
    icon: Flame,
  },
  {
    id: 'n4',
    tag: { en: 'Patrol', hi: 'पैट्रोल' },
    title: {
      en: 'Ranger team Alpha cleared Sector 7 trail',
      hi: 'रेंजर टीम अल्फा ने सेक्टर 7 के मार्ग को साफ़ किया',
    },
    time: '2 hrs ago',
    icon: Binoculars,
  },
]

const SUGGESTED_ACTIONS = [
  {
    id: 'a1',
    priority: 'high',
    title: 'Deploy patrol to Buffer Zone-3',
    reason: 'Elephant movement + fence breach alert',
    icon: MapPin,
  },
  {
    id: 'a2',
    priority: 'high',
    title: 'Inspect Watchtower Alpha camera',
    reason: 'Gunshot audio flagged, visual pending',
    icon: Camera,
  },
  {
    id: 'a3',
    priority: 'medium',
    title: 'Increase sensor polling in Core Zone',
    reason: 'Low battery on Canopy Sensor C1',
    icon: Activity,
  },
  {
    id: 'a4',
    priority: 'low',
    title: 'Review firebreaks along western ridge',
    reason: 'Rising temperature + dry grass alerts',
    icon: Flame,
  },
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

const SERVICES = [
  {
    icon: Shield,
    title: 'Protected Area Monitoring',
    desc: '24×7 wildlife surveillance for sanctuaries, reserves and community forests.',
    features: ['24×7 live monitoring', 'Mobile + web dashboard', 'Monthly report'],
  },
  {
    icon: Wifi,
    title: 'Sensor Network Deployment',
    desc: 'End-to-end LoRa node installation, configuration and maintenance.',
    features: ['Up to 50 sensor nodes', 'LoRa gateway setup', '1 year maintenance'],
  },
  {
    icon: Users,
    title: 'Ranger Training & Support',
    desc: 'Hands-on training for patrol teams plus ongoing technical support.',
    features: ['5-day on-ground training', 'Certification', '6 months support'],
  },
  {
    icon: BellRing,
    title: 'Emergency Response Alerts',
    desc: 'Instant escalation to forest department, police and medical teams.',
    features: ['SMS + call alerts', 'SOS routing', '24×7 escalation'],
  },
  {
    icon: Globe2,
    title: 'Multi-Site Management',
    desc: 'Centralised dashboard for monitoring multiple protected areas.',
    features: ['Unlimited sites', 'Role-based access', 'Central analytics'],
  },
  {
    icon: CreditCard,
    title: 'Consultancy & Audits',
    desc: 'Wildlife corridor assessment, security audits and policy guidance.',
    features: ['Site assessment', 'Security audit report', 'Policy recommendation'],
  },
]

export function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [language, setLanguage] = useState<'en' | 'hi'>('en')

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
            <button
              type="button"
              onClick={() => setLanguage(lang => lang === 'en' ? 'hi' : 'en')}
              className="home-util inline-flex items-center gap-1.5"
              aria-label="Switch language"
            >
              {language === 'en' ? 'हिंदी' : 'English'}
            </button>
<Link to="/auth/login" className="home-util inline-flex items-center gap-1.5">
  <User className="h-3.5 w-3.5" aria-hidden="true" />
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

      {/* ── Hero theme section ──────────────────────────────────── */}
      <section className="relative border-t border-white/5 bg-[#040a06]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
          <p className="home-eyebrow">Wildlife Expeditions</p>
          <h2 className="mt-3 font-['Bebas_Neue'] text-[clamp(2.4rem,5.8vw,4.6rem)] leading-[0.95] tracking-wide text-[#f6c445]">
            NATURE TOURS
          </h2>
          <p className="mt-3 max-w-xl text-[.9375rem] leading-relaxed text-[#c9d6c4]/80">
            Scout routes, night walks, scenic feedback loops and allied patrols across protected
            corridors — all from one live console.
          </p>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 pb-16 sm:pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Wildlife Expeditions',
                body: 'Track elephant herds, big cats and native birdlife through sensor-verified sightings.',
                img: 'https://picsum.photos/seed/jungle1/640/420',
              },
              {
                title: 'Nature Tours',
                body: 'Guided patrol routes through core zones — optimized by real-time alert scoring.',
                img: 'https://picsum.photos/seed/jungle2/640/420',
              },
              {
                title: 'Scenic Feedback',
                body: 'Visual and audio evidence from the field, scored and routed to ranger teams instantly.',
                img: 'https://picsum.photos/seed/jungle3/640/420',
              },
            ].map(card => (
              <div
                key={card.title}
                className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-colors hover:border-[#f6c445]/25"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={card.img}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#040a06]/80 via-[#040a06]/20 to-transparent" />
                </div>
                <div className="p-5">
                  <h3 className="text-[.9375rem] font-semibold text-[#f3efe2]">{card.title}</h3>
                  <p className="mt-1.5 text-[.8125rem] leading-relaxed text-[#c9d6c4]/75">{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* allied strip */}
        <div className="border-t border-white/5 bg-[#050b07]">
          <div className="mx-auto max-w-[1200px] px-6 py-10 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[#f6c445]">
                Midnight Guest & Allied
              </p>
              <h3 className="mt-2 font-['Bebas_Neue'] text-[clamp(1.8rem,4vw,3rem)] leading-[0.95] tracking-wide text-[#f3efe2]">
                NIGHT PATROL NETWORK
              </h3>
              <p className="mt-2 max-w-xl text-[.8125rem] leading-relaxed text-[#c9d6c4]/75">
                Low-light cameras and acoustic sensors keep watch when visibility drops —
                allied units receive scored alerts in under 10 seconds.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#f6c445]/40 bg-[#f6c445]/10 px-4 py-2 text-[.8125rem] font-semibold text-[#f6c445] transition-colors hover:bg-[#f6c445]/15 sm:mt-0"
            >
              Explore patrol modes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

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

      {/* ── Services ──────────────────────────────────────────────── */}
      <section className="relative border-t border-white/5 bg-[#050b07] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="sm:flex sm:items-end sm:justify-between sm:gap-6">
            <div>
              <p className="home-eyebrow">Services</p>
              <h2 className="home-h2 mt-3">Protect your wild — with us</h2>
              <p className="mt-3 max-w-xl text-[.9375rem] leading-relaxed text-[#c9d6c4]/80">
                From sensor networks to emergency response, we build and operate the full stack
                of wildlife protection for sanctuaries, reserves and community forests.
              </p>
            </div>
            <Link
              to="/payment"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#f6c445]/40 bg-[#f6c445]/10 px-5 py-2.5 text-[.8125rem] font-semibold text-[#f6c445] transition-colors hover:bg-[#f6c445]/15 sm:mt-0"
            >
              Get a quote
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(service => (
              <div
                key={service.title}
                className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 transition-colors hover:border-[#f6c445]/25"
              >
                <span className="home-pillar-icon">
                  <service.icon className="h-[1.4rem] w-[1.4rem]" aria-hidden="true" />
                </span>
                <h3 className="home-h3 mt-5">{service.title}</h3>
                <p className="mt-2.5 text-[.9375rem] leading-relaxed text-[#c9d6c4]/75">{service.desc}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {service.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-[.8125rem] text-[#c9d6c4]/80">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f6c445]" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
          <Link
            to="/payment"
            className="inline-flex items-center gap-2 rounded-full bg-[#f6c445] px-8 py-3 text-[.8125rem] font-bold uppercase tracking-widest text-[#07100b] transition-colors hover:bg-[#ffd873]"
          >
            Buy now
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#040a06] px-6 pt-16 pb-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <p className="home-wordmark !text-[1.5rem]">JungleSathi</p>
              <p className="mt-2 text-[.8125rem] leading-relaxed text-[#c9d6c4]/70">
                Wildlife protection infrastructure for the 21st century — sensors, alerts and rangers, unified.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[.75rem] text-[#c9d6c4]/55">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                Trusted by forest departments and conservation NGOs
              </div>
            </div>

            {/* Services */}
            <div>
              <p className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[#f6c445]">
                Services
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-[.8125rem] text-[#c9d6c4]/75">
                {SERVICES.map(service => (
                  <li key={service.title}>{service.title}</li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[#f6c445]">
                Contact
              </p>
              <ul className="mt-3 flex flex-col gap-2.5 text-[.8125rem] text-[#c9d6c4]/75">
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                  himanshukumarsaw23@gmail.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                  +91 9113701427
                </li>
                <li className="flex items-center gap-2">
                  <MapPinned className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                  New Delhi, India
                </li>
              </ul>
            </div>

            {/* Payments */}
            <div>
              <p className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[#f6c445]">
                Payments
              </p>
              <p className="mt-3 text-[.8125rem] leading-relaxed text-[#c9d6c4]/75">
                We accept bank transfers, UPI, and major credit/debit cards. Invoices are issued on request.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[.6875rem] text-[#c9d6c4]/60">
                <span className="rounded-md border border-white/[0.08] px-2 py-1">VISA</span>
                <span className="rounded-md border border-white/[0.08] px-2 py-1">Mastercard</span>
                <span className="rounded-md border border-white/[0.08] px-2 py-1">UPI</span>
                <span className="rounded-md border border-white/[0.08] px-2 py-1">Wire</span>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[.75rem] text-[#c9d6c4]/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                Secure checkout · GST invoices available
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/[0.06] pt-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <p className="text-[.75rem] text-[#c9d6c4]/50">
              © {new Date().getFullYear()} JungleSathi Forest Guard. All rights reserved.
            </p>
            <nav className="mt-3 flex flex-wrap items-center gap-4 text-[.75rem] text-[#c9d6c4]/55 sm:mt-0">
              <Link to="/" className="transition-colors hover:text-[#f6c445]">Home</Link>
              <Link to="/dashboard" className="transition-colors hover:text-[#f6c445]">Dashboard</Link>
              <Link to="/alerts" className="transition-colors hover:text-[#f6c445]">Alerts</Link>
              <Link to="/map" className="transition-colors hover:text-[#f6c445]">Map</Link>
              <span>Privacy</span>
              <span>Terms</span>
            </nav>
          </div>
        </div>
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
        className={`fixed left-0 top-0 z-[100] h-screen w-[min(92vw,380px)] border-r border-white/10 bg-[#070f0a] transition-transform duration-300 sm:w-[min(88vw,360px)] ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
            <span className="home-wordmark !text-[1.5rem]">JungleSathi</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="home-icon-btn"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <nav className="flex flex-col">
              {NAV.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="home-drawer-link"
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {item.label[language]}
                </Link>
              ))}
            </nav>

            <div className="my-6 h-px bg-white/[0.06]" />

            {/* ── News ─────────────────────────────────────────── */}
            <section aria-labelledby="drawer-news-heading">
              <div className="flex items-center gap-2">
                <Newspaper className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                <h2 id="drawer-news-heading" className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[#f6c445]">
                  Forest & Wildlife News
                </h2>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {NEWS.map(item => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 transition-colors hover:border-[#f6c445]/30 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[.6875rem] font-semibold uppercase tracking-widest text-[#c9d6c4]">
                        {item.tag[language]}
                      </span>
                      <span className="text-[.6875rem] text-[#c9d6c4]/60">{item.time}</span>
                    </div>
                    <p className="mt-1.5 text-[.8125rem] leading-snug text-[#f3efe2]">{item.title[language]}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="my-6 h-px bg-white/[0.06]" />

            {/* ── Suggested actions ───────────────────────────── */}
            <section aria-labelledby="drawer-actions-heading">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                <h2 id="drawer-actions-heading" className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[#f6c445]">
                  Suggested Actions
                </h2>
              </div>
              <p className="mt-1 text-[.75rem] text-[#c9d6c4]/70">
                Based on current alerts, movement and events.
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {SUGGESTED_ACTIONS.map(action => {
                  const priorityStyles =
                    action.priority === 'high'
                      ? 'border-[#f37269]/35 bg-[#f37269]/[0.08]'
                      : action.priority === 'medium'
                        ? 'border-[#f0af45]/35 bg-[#f0af45]/[0.08]'
                        : 'border-white/[0.07] bg-white/[0.03]'

                  return (
                    <div
                      key={action.id}
                      className={`rounded-lg border ${priorityStyles} p-3 transition-colors hover:border-[#f6c445]/30`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                          <action.icon className="h-3.5 w-3.5 text-[#f6c445]" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[.8125rem] font-semibold text-[#f3efe2]">{action.title}</p>
                          <p className="mt-0.5 text-[.75rem] leading-snug text-[#c9d6c4]/75">{action.reason}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-6 py-4 text-[.75rem] text-[#c9d6c4]/55">
            <p className="font-semibold text-[#f3efe2]">JungleSathi Forest Guard</p>
            <p className="mt-0.5">Protected corridor monitoring</p>
          </div>
        </div>
      </aside>

      <ChatWidget />
    </div>
  )
}
