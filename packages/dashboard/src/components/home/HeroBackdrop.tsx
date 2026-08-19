/**
 * HeroBackdrop — full-bleed photographic backdrop for the landing hero.
 *
 * The source photo is a bright, sunlit aerial of rainforest canopy, so it is
 * layered under several scrims before any type sits on it: a green-black
 * multiply tint to pull it toward the dark jungle palette, top/bottom linear
 * scrims for the masthead and stats strip, and a vignette to focus the centre.
 * Without these the gold headline would sit on mid-green highlights and fail
 * contrast.
 */

import jungleHero from '@/assets/jungle-hero.jpg'

export function HeroBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <img
        src={jungleHero}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full scale-105 object-cover object-center"
      />

      {/* Pull the sunlit photo toward the dark jungle palette */}
      <div className="absolute inset-0 bg-[#04140b] opacity-[.52] mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02110a]/85 via-[#04140b]/35 to-[#010805]/92" />

      {/* Focus the centre where the headline sits */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 68% 62% at 50% 46%, transparent 0%, rgb(1 8 5 / .34) 62%, rgb(1 8 5 / .82) 100%)',
        }}
      />
    </div>
  )
}
