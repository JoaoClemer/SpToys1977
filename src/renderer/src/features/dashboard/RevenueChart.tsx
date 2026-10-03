import { useState } from 'react'
import type { MonthlyRevenue } from '../../../../shared/api'
import { compactCents, formatCents, monthLong, monthShort } from '../../lib/format'

const W = 640
const H = 220
const PAD = { top: 20, right: 8, bottom: 26, left: 64 }
const BAR_MAX = 24

function niceStep(max: number, ticks = 4): number {
  const raw = max / ticks
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

/** Colunas de faturamento mensal: série única, sem legenda; tooltip por coluna. */
export function RevenueChart({ data }: { data: MonthlyRevenue[] }): React.JSX.Element {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.revenue), 0)
  const step = max > 0 ? niceStep(max) : 10000
  const top = Math.max(step * Math.ceil(max / step), step)
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / data.length
  const barW = Math.min(BAR_MAX, slot * 0.6)
  const y = (v: number): number => PAD.top + plotH - (v / top) * plotH
  const last = data.length - 1

  const hovered = hover != null ? data[hover] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Faturamento dos últimos 12 meses"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#e7e5e4"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-stone-400 text-[11px]"
            >
              {compactCents(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2
          const h = Math.max(0, y(0) - y(d.revenue))
          const r = Math.min(4, h)
          const x0 = cx - barW / 2
          const yTop = y(0) - h
          // 4px arredondado no topo, reto na base
          const path =
            h > 0
              ? `M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${y(0)} Z`
              : ''
          return (
            <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
              />
              {path && (
                <path
                  d={path}
                  fill="var(--color-chart)"
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                className={
                  i === last
                    ? 'fill-stone-700 text-[11px] font-semibold'
                    : 'fill-stone-400 text-[11px]'
                }
              >
                {monthShort(d.month)}
              </text>
              {i === last && d.revenue > 0 && (
                <text
                  x={cx}
                  y={yTop - 6}
                  textAnchor="middle"
                  className="fill-stone-700 text-[11px] font-medium"
                >
                  {compactCents(d.revenue)}
                </text>
              )}
            </g>
          )
        })}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(0)}
          y2={y(0)}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
      </svg>
      {hovered && hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md bg-stone-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
          style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%` }}
        >
          <div className="font-medium first-letter:uppercase">{monthLong(hovered.month)}</div>
          <div className="tabular">
            {formatCents(hovered.revenue)} · {hovered.sales} venda(s)
          </div>
        </div>
      )}
    </div>
  )
}

export function RevenueTable({ data }: { data: MonthlyRevenue[] }): React.JSX.Element {
  return (
    <table className="tabular w-full text-sm">
      <thead className="text-left text-xs text-stone-500">
        <tr>
          <th className="py-1 font-medium">Mês</th>
          <th className="py-1 text-right font-medium">Vendas</th>
          <th className="py-1 text-right font-medium">Faturamento</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {[...data].reverse().map((d) => (
          <tr key={d.month}>
            <td className="py-1 first-letter:uppercase">{monthLong(d.month)}</td>
            <td className="py-1 text-right">{d.sales}</td>
            <td className="py-1 text-right">{formatCents(d.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
