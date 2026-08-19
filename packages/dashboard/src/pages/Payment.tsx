import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, CreditCard, Shield, CheckCircle2, Lock,
  User, Mail, Phone, MapPin,
} from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹49,999',
    period: '/year',
    desc: 'Single sanctuary, up to 10 nodes',
    features: ['10 LoRa sensor nodes', 'Basic alert dashboard', 'Email support', 'Monthly report'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹1,49,999',
    period: '/year',
    desc: 'Multi-zone, up to 30 nodes',
    features: ['30 LoRa sensor nodes', 'Advanced analytics', 'Priority SMS alerts', 'Dedicated support', 'Ranger app'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Full deployment, unlimited scale',
    features: ['Unlimited nodes', 'Custom integrations', '24×7 on-site support', 'SLA guarantee', 'White-label options'],
  },
]

export function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan') || 'professional'

  const [selectedPlan, setSelectedPlan] = useState(planParam)
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success'>('details')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organisation: '',
    message: '',
  })
  const [card, setCard] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const updateCard = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
    if (field === 'number') val = val.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
    if (field === 'expiry') val = val.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
    if (field === 'cvv') val = val.replace(/\D/g, '').slice(0, 4)
    setCard(prev => ({ ...prev, [field]: val }))
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep('processing')

    await new Promise(r => setTimeout(r, 2200))

    setStep('success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const plan = PLANS.find(p => p.id === selectedPlan) || PLANS[1]

  return (
    <div className="min-h-screen bg-slate-dark py-10">
      <div className="mx-auto max-w-5xl px-4">
        <button
          onClick={() => (step === 'details' ? navigate(-1) : setStep('payment'))}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-muted transition-colors hover:text-slate-text"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 'details' ? 'Back' : step === 'payment' ? 'Back to details' : ''}
        </button>

        {step === 'details' && (
          <div className="app-surface rounded-2xl p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-light/15 ring-2 ring-forest-light/30">
                <CreditCard className="h-6 w-6 text-forest-light" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-text">Choose Your Plan</h1>
                <p className="text-sm text-slate-muted">Select a deployment package that fits your protected area</p>
              </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {PLANS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`rounded-xl border p-5 text-left transition-all ${
                    selectedPlan === p.id
                      ? 'border-forest-light bg-forest-light/10 ring-2 ring-forest-light/40'
                      : 'border-white/10 bg-slate-surface hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-text">{p.name}</p>
                  <p className="mt-1 text-lg font-bold text-forest-light">{p.price}<span className="text-xs font-normal text-slate-muted">{p.period}</span></p>
                  <p className="mt-1 text-xs text-slate-muted">{p.desc}</p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-muted">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-forest-light" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-text">
                    <User className="h-3.5 w-3.5 text-slate-muted" /> Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Ranger in charge"
                    className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-text">
                    <Mail className="h-3.5 w-3.5 text-slate-muted" /> Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="ranger@forest.gov"
                    className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-text">
                    <Phone className="h-3.5 w-3.5 text-slate-muted" /> Phone *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-text">
                    <MapPin className="h-3.5 w-3.5 text-slate-muted" /> Organisation
                  </label>
                  <input
                    type="text"
                    value={form.organisation}
                    onChange={update('organisation')}
                    placeholder="Forest Dept / NGO"
                    className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-text">Special requirements (optional)</label>
                <textarea
                  value={form.message}
                  onChange={update('message')}
                  rows={3}
                  placeholder="Terrain details, custom sensors, integration needs..."
                  className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-forest-light px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300"
              >
                Continue to payment
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            </form>
          </div>
        )}

        {step === 'payment' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="app-surface rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-text">Payment Details</h2>
              <p className="mt-1 text-sm text-slate-muted">This is a demo. Use any card details.</p>

              <form onSubmit={handlePayment} className="mt-6 flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-text">Card Number *</label>
                  <input
                    type="text"
                    value={card.number}
                    onChange={updateCard('number')}
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-text">Cardholder Name *</label>
                  <input
                    type="text"
                    value={card.name}
                    onChange={updateCard('name')}
                    placeholder="Ranger Commander"
                    className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-text">Expiry *</label>
                    <input
                      type="text"
                      value={card.expiry}
                      onChange={updateCard('expiry')}
                      placeholder="MM/YY"
                      className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-text">CVV *</label>
                    <input
                      type="text"
                      value={card.cvv}
                      onChange={updateCard('cvv')}
                      placeholder="123"
                      className="w-full rounded-lg border border-white/10 bg-slate-surface px-4 py-2.5 text-sm text-slate-text placeholder:text-slate-muted/60 focus:border-forest-light/40 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-forest-light px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300"
                >
                  <Lock className="h-4 w-4" />
                  Pay {plan.price}
                </button>
              </form>
            </div>

            <div className="app-surface rounded-2xl p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-muted">Order Summary</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-text">{plan.name} Plan</span>
                <span className="text-sm font-bold text-forest-light">{plan.price}{plan.period}</span>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-muted">Subtotal</span>
                  <span className="text-sm text-slate-text">{plan.price}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-muted">Tax (18% GST)</span>
                  <span className="text-sm text-slate-text">
                    {plan.price === 'Custom' ? '—' : `₹${Math.round(parseInt(plan.price.replace(/[^\d]/g, '')) * 0.18).toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-semibold text-slate-text">Total</span>
                <span className="text-base font-bold text-forest-light">
                  {plan.price === 'Custom' ? 'Custom' : `₹${(parseInt(plan.price.replace(/[^\d]/g, '')) * 1.18).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="mt-6 flex items-center gap-4 text-xs text-slate-muted">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> SSL Secured</span>
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Encrypted</span>
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="app-surface flex flex-col items-center justify-center rounded-2xl p-12">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-forest-light/20 border-t-forest-light" />
            <p className="mt-6 text-lg font-semibold text-slate-text">Processing payment…</p>
            <p className="mt-2 text-sm text-slate-muted">Please do not close this window</p>
          </div>
        )}

        {step === 'success' && (
          <div className="app-surface flex flex-col items-center justify-center rounded-2xl p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-text">Payment Successful!</h2>
            <p className="mt-2 max-w-md text-sm text-slate-muted">
              Thank you for choosing JungleSathi. Your order for the <span className="font-semibold text-slate-text">{plan.name}</span> plan has been confirmed.
              A confirmation email has been sent to <span className="font-semibold text-slate-text">{form.email || 'your email'}</span>.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 rounded-lg bg-forest-light px-6 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-text transition-colors hover:bg-white/5"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
