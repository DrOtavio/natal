/** A small decorative layer: only transforms and opacity are animated. */
export function FestiveLights() {
  return <div className="festive-lights" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
}
