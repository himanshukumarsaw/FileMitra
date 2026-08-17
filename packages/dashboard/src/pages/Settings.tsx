export function Settings() {
  // LAN URL judges/phones use to open the mobile node app
  const phoneUrl = `${window.location.protocol}//${window.location.hostname}:5173/node`

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-text">Settings</h1>
        <p className="text-sm text-slate-muted">System configuration</p>
      </div>

      {/* Mobile node deployment card */}
      <div className="max-w-xl rounded-xl border border-white/5 bg-[#1E293B] p-5 shadow-lg shadow-black/20">
        <h2 className="text-base font-semibold text-slate-text">Mobile Node Deployment</h2>
        <p className="mt-1 text-sm text-slate-muted">
          Turn any smartphone into a Forest Guard sensor node: microphone-based Edge AI
          (gunshot / chainsaw / fire detection), GPS location, and LoRa uplink to the gateway.
        </p>
        <div className="mt-4 rounded-lg bg-black/30 p-3 font-mono text-sm text-emerald-400">
          {phoneUrl}
        </div>
        <p className="mt-2 text-xs text-slate-muted">
          Open this URL on a phone connected to the same Wi-Fi network. Allow microphone and
          location access, then arm the mic or use the manual test triggers. The phone must be
          served over HTTPS (or localhost) for microphone access.
        </p>
        <a
          href="/node"
          className="mt-4 inline-block rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/30"
        >
          Open Node App on this device
        </a>
      </div>
    </div>
  )
}
