import { useEffect, useRef, type ReactNode } from 'react'

/** Content stays visible with reduced motion or without IntersectionObserver. */
export function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!element || motion.matches || !('IntersectionObserver' in window)) return
    if (element.getBoundingClientRect().top < window.innerHeight - 32) return

    element.classList.add('reveal-waiting')
    const show = () => {
      element.classList.remove('reveal-waiting')
      observer.disconnect()
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) show()
    }, { threshold: 0, rootMargin: '0px 0px -32px 0px' })
    const onMotionChange = () => { if (motion.matches) show() }
    observer.observe(element)
    motion.addEventListener('change', onMotionChange)
    element.addEventListener('focusin', show)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', onMotionChange)
      element.removeEventListener('focusin', show)
      element.classList.remove('reveal-waiting')
    }
  }, [])

  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>
}
