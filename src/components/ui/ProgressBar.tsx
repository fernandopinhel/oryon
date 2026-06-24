import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: number   // 0–100
  className?: string
}

// Largura dinâmica via ref imperativa — evita inline style no JSX
export default function ProgressBar({ value, className }: Props) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${Math.max(0, Math.min(100, value))}%`
    }
  }, [value])

  return (
    <div className={cn('h-2 bg-muted rounded-full overflow-hidden', className)}>
      <div
        ref={barRef}
        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
      />
    </div>
  )
}
