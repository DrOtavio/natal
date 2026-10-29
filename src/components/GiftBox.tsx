/** Decorative artwork. API state is owned by RevealPage, never by the animation. */
export function GiftBox({ opening, waiting }: { opening: boolean; waiting: boolean }) {
  return (
    <div className={`gift-scene${opening ? ' is-opening' : ''}${waiting ? ' is-waiting' : ''}`} aria-hidden="true">
      <div className="gift-halo" />
      <svg className="gift-art" viewBox="0 0 240 220" fill="none">
        <defs>
          <linearGradient id="reveal-gift-wine" x1="55" y1="115" x2="180" y2="205" gradientUnits="userSpaceOnUse"><stop stopColor="#a24851" /><stop offset=".55" stopColor="#7a1f2b" /><stop offset="1" stopColor="#4c1825" /></linearGradient>
          <linearGradient id="reveal-gift-gold" x1="95" y1="60" x2="145" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#f3dfaa" /><stop offset=".5" stopColor="#c9a227" /><stop offset="1" stopColor="#e3cc91" /></linearGradient>
          <radialGradient id="reveal-gift-light"><stop stopColor="#edcf7f" stopOpacity=".35" /><stop offset="1" stopColor="#edcf7f" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="120" cy="200" rx="77" ry="9" fill="#061b12" opacity=".3" />
        <g className="gift-rays"><circle cx="120" cy="120" r="105" fill="url(#reveal-gift-light)" />{Array.from({ length: 12 }, (_, i) => <path key={i} d="m116 110 4-95 5 95Z" fill="#e5c878" opacity=".16" transform={`rotate(${i * 30} 120 120)`} />)}</g>
        <g className="gift-particles" fill="#ecd18c">{Array.from({ length: 24 }, (_, i) => {
          const angle = i * Math.PI / 12
          const radius = i % 2 ? 76 : 100
          return <circle key={i} cx={120 + Math.cos(angle) * radius} cy={105 + Math.sin(angle) * radius * .85} r={i % 3 === 0 ? 2.3 : 1.3} />
        })}</g>
        <g className="gift-box"><rect x="58" y="113" width="124" height="83" rx="4" fill="url(#reveal-gift-wine)" stroke="#c8867a" strokeOpacity=".3" /><path d="M58 118h124" stroke="#471923" strokeWidth="4" opacity=".5" /><path d="M111 115h18v81h-18z" fill="url(#reveal-gift-gold)" /><path d="M61 189h47m24 0h47" stroke="#b85c61" strokeOpacity=".25" /></g>
        <g className="gift-lid"><rect x="51" y="99" width="138" height="22" rx="3" fill="#92333f" stroke="#c8867a" strokeOpacity=".35" /><path d="M51 101h138" stroke="#d3847c" strokeOpacity=".3" /><path d="M110 99h20v22h-20z" fill="url(#reveal-gift-gold)" /><path d="M120 99C70 99 67 62 87 66c15 3 33 33 33 33Zm0 0c50 0 53-37 33-33-15 3-33 33-33 33Z" fill="#c9a22715" stroke="url(#reveal-gift-gold)" strokeWidth="4" /><path d="m120 98-26 28m26-28 26 28" stroke="url(#reveal-gift-gold)" strokeWidth="6" strokeLinecap="round" /></g>
        <g stroke="#d9c18a" strokeWidth=".8" opacity=".65"><path d="M40 63v10m-5-5h10M197 79v10m-5-5h10M173 33v8m-4-4h8" /></g>
      </svg>
    </div>
  )
}
