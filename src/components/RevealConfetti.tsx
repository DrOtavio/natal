export function RevealConfetti() {
  return <div className="reveal-confetti" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <span key={index} />)}</div>
}
