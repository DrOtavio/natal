export function ChristmasArt() {
  return (
    <div className="christmas-art" aria-hidden="true">
      <div className="art-arch" />
      <span className="art-caption">CELEBRAR É ESTAR PERTO</span>
      <svg viewBox="0 0 520 550" className="tree-art" fill="none">
        <defs>
          <linearGradient id="tree-deep" x1="140" y1="190" x2="380" y2="470" gradientUnits="userSpaceOnUse"><stop stopColor="#48745b" /><stop offset=".47" stopColor="#214d38" /><stop offset="1" stopColor="#0e2b20" /></linearGradient>
          <linearGradient id="tree-light" x1="200" y1="140" x2="310" y2="430" gradientUnits="userSpaceOnUse"><stop stopColor="#729079" /><stop offset=".5" stopColor="#375f46" /><stop offset="1" stopColor="#173d2b" /></linearGradient>
          <linearGradient id="art-gold" x1="190" y1="90" x2="310" y2="470" gradientUnits="userSpaceOnUse"><stop stopColor="#f3dfaa" /><stop offset=".35" stopColor="#c9a227" /><stop offset=".7" stopColor="#e1c781" /><stop offset="1" stopColor="#96702a" /></linearGradient>
          <linearGradient id="gift-wine" x1="100" y1="422" x2="200" y2="510" gradientUnits="userSpaceOnUse"><stop stopColor="#a14a51" /><stop offset=".6" stopColor="#7a1f2b" /><stop offset="1" stopColor="#4c1420" /></linearGradient>
          <linearGradient id="gift-cream" x1="320" y1="450" x2="390" y2="513" gradientUnits="userSpaceOnUse"><stop stopColor="#f7f3ea" /><stop offset="1" stopColor="#c1af89" /></linearGradient>
          <radialGradient id="bauble-wine" cx=".3" cy=".22" r=".8"><stop stopColor="#d58c84" /><stop offset=".3" stopColor="#963440" /><stop offset="1" stopColor="#581421" /></radialGradient>
          <radialGradient id="bauble-gold" cx=".3" cy=".25" r=".8"><stop stopColor="#fff1ca" /><stop offset=".4" stopColor="#d6b457" /><stop offset="1" stopColor="#87672e" /></radialGradient>
          <radialGradient id="art-halo"><stop stopColor="#d4b76b" stopOpacity=".2" /><stop offset="1" stopColor="#d4b76b" stopOpacity="0" /></radialGradient>
          <filter id="art-soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" /></filter>
          <g id="pine-spray" strokeLinecap="round"><path d="M0 0 67-25" stroke="#97a783" strokeWidth="1.2" /><path d="m10-4 2-15m6 12 4-17m5 14 5-19m5 16 7-18m3 14 8-15M12-4l13 7m-3-11 16 7m-7-10 17 5m-6-9 15 4" stroke="#5e8263" strokeWidth="1.5" /></g>
        </defs>
        <ellipse cx="265" cy="487" rx="180" ry="25" fill="#071b13" opacity=".35" />
        <circle cx="260" cy="255" r="220" fill="url(#art-halo)" />
        <g opacity=".45" stroke="#c9a227" strokeWidth=".7"><path d="M91 398c-23-73-13-154 31-215M430 399c22-73 12-154-31-215" /><path d="m94 358-17-20m17 20 13-28m-18-8-17-19m17 19 14-24m-13-13-13-18m13 18 18-18m-13-17-9-18m9 18 19-16m310 108 17-20m-17 20-13-28m18-8 17-19m-17 19-14-24m13-13 13-18m-13 18-18-18m13-17 9-18m-9 18-19-16" /></g>
        <path d="M248 433h25v54h-25z" fill="#806443" />
        <path d="m260 105-65 103 20-3-63 95 28-4-65 99 34-6-54 65c65-6 99 10 165 1 66 9 100-7 165-1l-54-65 34 6-65-99 28 4-63-95 20 3Z" fill="url(#tree-deep)" />
        <path d="m260 110-31 102 18-4-49 95 24-7-48 93 27-6-39 64c38 5 60 4 98 1 26 4 53 1 82-1l-42-64 22 4-43-91 20 6-34-94 15 4Z" fill="url(#tree-light)" opacity=".8" />
        <g opacity=".7"><use href="#pine-spray" transform="translate(231 204) rotate(-18)" /><use href="#pine-spray" transform="translate(270 247) rotate(192)" /><use href="#pine-spray" transform="translate(192 297) rotate(-14)" /><use href="#pine-spray" transform="translate(305 332) rotate(190)" /><use href="#pine-spray" transform="translate(155 383) rotate(-16)" /><use href="#pine-spray" transform="translate(347 414) rotate(195)" /><use href="#pine-spray" transform="translate(220 400) rotate(-35)" /><use href="#pine-spray" transform="translate(281 175) rotate(190)" /></g>
        <g stroke="url(#art-gold)" strokeWidth="2"><path d="M219 200c15 13 39 20 77 19M189 273c28 21 74 31 141 28M152 369c53 28 122 42 217 28" /><path d="M220 201c18 32 41 43 96 62M189 275c31 48 83 67 158 83" opacity=".5" strokeWidth=".8" /></g>
        <g fill="url(#bauble-wine)"><circle cx="241" cy="225" r="12" /><circle cx="293" cy="314" r="17" /><circle cx="186" cy="380" r="18" /><circle cx="317" cy="429" r="13" /></g>
        <g stroke="#e2c780" strokeWidth="1"><path d="M241 209v5m52 80v3m-107 62v3m131 51v4" /></g>
        <g fill="url(#bauble-gold)"><circle cx="286" cy="247" r="9" /><circle cx="213" cy="313" r="11" /><circle cx="273" cy="390" r="10" /><circle cx="349" cy="374" r="8" /><circle cx="233" cy="439" r="8" /></g>
        <g fill="#f8e5ad"><circle cx="252" cy="180" r="2.5" /><circle cx="274" cy="208" r="2" /><circle cx="216" cy="260" r="2.5" /><circle cx="311" cy="280" r="2" /><circle cx="252" cy="304" r="2.5" /><circle cx="184" cy="342" r="2" /><circle cx="313" cy="356" r="2.5" /><circle cx="241" cy="370" r="2.5" /><circle cx="362" cy="418" r="2" /><circle cx="153" cy="422" r="2.5" /><circle cx="278" cy="441" r="2" /></g>
        <g fill="#e9ca7c" filter="url(#art-soft-glow)" opacity=".6"><circle cx="252" cy="180" r="5" /><circle cx="216" cy="260" r="5" /><circle cx="252" cy="304" r="5" /><circle cx="313" cy="356" r="5" /><circle cx="153" cy="422" r="5" /><circle cx="362" cy="418" r="5" /></g>
        <circle className="tree-star-halo" cx="260" cy="96" r="43" fill="url(#art-halo)" />
        <path d="m260 70 7.5 16.3 18 2.2-13.2 12.3 3.7 17.7-16-8.9-16 8.9 3.7-17.7-13.2-12.3 18-2.2Z" fill="url(#art-gold)" stroke="#f2dfb1" strokeWidth=".7" />
        <g transform="rotate(-6 161 467)"><rect x="109" y="444" width="103" height="63" rx="3" fill="url(#gift-wine)" /><path d="M148 444h13v63h-13z" fill="url(#art-gold)" /><rect x="105" y="436" width="111" height="14" rx="2" fill="#8d3440" /><path d="M148 436h13v14h-13z" fill="#e5cb8d" /><path d="M154 437c-43 1-42-30-23-23 11 4 23 23 23 23Zm0 0c42-2 40-32 22-24-10 4-22 24-22 24Z" stroke="#d4b66f" strokeWidth="3" /><path d="m154 439-19 29m19-29 23 26" stroke="#d4b66f" strokeWidth="5" /></g>
        <g transform="rotate(5 352 482)"><rect x="310" y="463" width="88" height="48" rx="2" fill="url(#gift-cream)" /><path d="M348 463h10v48h-10z" fill="#7a1f2b" /><rect x="306" y="455" width="96" height="13" rx="2" fill="#e6d9bd" /><path d="M348 455h10v13h-10z" fill="#8c3440" /><path d="M353 455c-32 1-34-24-19-19 9 3 19 19 19 19Zm0 0c33-1 31-25 17-19-8 3-17 19-17 19Z" stroke="#8c3440" strokeWidth="3" /></g>
        <rect x="224" y="469" width="66" height="43" rx="2" fill="#1a4331" stroke="#5d7858" strokeWidth=".6" /><path d="M253 469h8v43h-8zM224 481h66v5h-66z" fill="url(#art-gold)" /><path d="M257 469c-27 0-24-18-14-14l14 14c26-1 23-19 12-14Z" stroke="#d6b876" strokeWidth="2" />
        <g stroke="#d4b76b" strokeWidth=".8"><path d="M125 143v14m-7-7h14M393 225v14m-7-7h14M364 121v10m-5-5h10M105 303v10m-5-5h10" /></g>
        <g fill="#dfc58a"><circle cx="154" cy="199" r="1.5" /><circle cx="376" cy="173" r="1.5" /><circle cx="408" cy="321" r="2" /><circle cx="133" cy="248" r="1" /><circle cx="344" cy="101" r="1" /></g>
      </svg>
      <div className="art-keepsake"><span className="art-keepsake-star">✧</span><div><span>Uma tradição feita de afeto</span><p>Muitos motivos para sorrir.</p></div></div>
    </div>
  )
}
