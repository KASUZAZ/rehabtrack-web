'use client'

export default function LiveChart({ values }: { values: number[] }) {
  const width = 620
  const height = 180
  const data = values.length ? values.slice(-40) : [0]
  const min = Math.min(...data, 0)
  const max = Math.max(...data, 100)
  const range = Math.max(max - min, 1)
  const points = data.map((value, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Live movement angle chart">
        <line x1="0" y1="45" x2={width} y2="45" className="grid-line" />
        <line x1="0" y1="90" x2={width} y2="90" className="grid-line" />
        <line x1="0" y1="135" x2={width} y2="135" className="grid-line" />
        <polyline points={points} className="chart-line" fill="none" />
      </svg>
    </div>
  )
}
