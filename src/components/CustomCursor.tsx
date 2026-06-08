import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const mouse = useRef({ x: 0, y: 0 })
  const smooth = useRef({ x: 0, y: 0 })
  const raf = useRef(0)

  useEffect(() => {
    if (matchMedia('(hover: none)').matches) return

    const lerp = 0.15
    let isHovering = false

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY

      // Check interactive element under cursor
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const interactive = !!(
        el &&
        (el.matches('a, button, input, textarea, select, [role="button"]') ||
          el.closest('a, button, [role="button"]'))
      )
      if (interactive !== isHovering) {
        isHovering = interactive
        outerRef.current?.classList.toggle('is-hovering', interactive)
        innerRef.current?.classList.toggle('is-hovering', interactive)
      }
    }

    const loop = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * lerp
      smooth.current.y += (mouse.current.y - smooth.current.y) * lerp

      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${smooth.current.x - 16}px, ${smooth.current.y - 16}px)`
      }
      if (innerRef.current) {
        innerRef.current.style.transform = `translate(${mouse.current.x - 3}px, ${mouse.current.y - 3}px)`
      }
      raf.current = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <div ref={outerRef} className="custom-cursor-outer" />
      <div ref={innerRef} className="custom-cursor-inner" />
      <style>{`
        .custom-cursor-outer,
        .custom-cursor-inner {
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 9999;
          border-radius: 9999px;
          will-change: transform;
        }
        .custom-cursor-outer {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(142, 155, 142, 0.4);
          background: transparent;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                      height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-cursor-outer.is-hovering {
          width: 48px;
          height: 48px;
          border-color: #8E9B8E;
        }
        .dark .custom-cursor-outer {
          border-color: rgba(107, 124, 107, 0.5);
        }
        .dark .custom-cursor-outer.is-hovering {
          border-color: #6B7C6B;
        }
        .custom-cursor-inner {
          width: 6px;
          height: 6px;
          background: rgba(142, 155, 142, 0.85);
          transition: background 0.2s ease;
        }
        .custom-cursor-inner.is-hovering {
          background: #8E9B8E;
        }
        .dark .custom-cursor-inner {
          background: rgba(107, 124, 107, 0.85);
        }
        .dark .custom-cursor-inner.is-hovering {
          background: #6B7C6B;
        }
        @media (hover: none) {
          .custom-cursor-outer,
          .custom-cursor-inner {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
