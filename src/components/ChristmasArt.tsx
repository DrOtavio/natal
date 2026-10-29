/** Logo oficial da família em destaque, com aura e animação apenas decorativas. */
export function ChristmasArt() {
  return (
    <div className="christmas-art family-emblem" aria-hidden="true">
      <div className="emblem-aura emblem-aura-green" />
      <div className="emblem-aura emblem-aura-wine" />
      <div className="emblem-aura emblem-aura-gold" />
      <div className="emblem-orbit emblem-orbit-outer" />
      <div className="emblem-orbit emblem-orbit-inner" />
      <div className="emblem-logo-wrap">
        <img
          src="/logo-natal-familia-oliveira.webp"
          className="emblem-logo"
          width="1254"
          height="1254"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <span className="emblem-star emblem-star-one">✦</span>
      <span className="emblem-star emblem-star-two">✧</span>
      <span className="emblem-star emblem-star-three">✦</span>
      <span className="emblem-star emblem-star-four">✧</span>
      <div className="emblem-ground-glow" />
    </div>
  )
}
