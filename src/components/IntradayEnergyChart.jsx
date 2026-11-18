import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Zap } from 'lucide-react';

// Pin chat-bubble bulat biru Logym + ikon barbel putih yang menunjuk tepat ke titik jam latihan
const WorkoutBubblePin = ({ cx, cy, count = 1, isDark }) => {
  const bubbleY = cy - 22;
  const ringStroke = isDark ? '#0f172a' : '#ffffff';
  return (
    <g pointerEvents="none">
      {/* Titik jangkar di garis kurva */}
      <circle cx={cx} cy={cy} r={3.5} fill="#3b82f6" stroke={ringStroke} strokeWidth={1.75} />
      {/* Ekor chat bubble menunjuk ke titik kurva */}
      <polygon
        points={`${cx - 4},${bubbleY + 8} ${cx + 4},${bubbleY + 8} ${cx},${cy - 5}`}
        fill="#2563eb"
      />
      {/* Lingkaran chat bubble biru Logym */}
      <circle cx={cx} cy={bubbleY} r={10.5} fill="#2563eb" stroke={ringStroke} strokeWidth={1.75} />
      {/* Ikon barbel putih crisp (terpusat di cx, bubbleY) */}
      <g
        transform={`translate(${cx - 6}, ${bubbleY - 6}) scale(0.5)`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 6.5h11" />
        <path d="M6.5 17.5h11" />
        <path d="M3 10v4" />
        <path d="M21 10v4" />
        <rect x="5" y="7" width="3" height="10" rx="1" fill="#ffffff" stroke="none" />
        <rect x="16" y="7" width="3" height="10" rx="1" fill="#ffffff" stroke="none" />
        <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.8" />
      </g>
      {count > 1 && (
        <g>
          <circle cx={cx + 8.5} cy={bubbleY - 8.5} r={5.5} fill="#0ea5e9" stroke={ringStroke} strokeWidth={1.25} />
          <text
            x={cx + 8.5}
            y={bubbleY - 5.8}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7.5"
            fontWeight="900"
          >
            {count}
          </text>
        </g>
      )}
    </g>
  );
};

// Pin chat-bubble kecil warna amber untuk konsumsi kafein Lomeal (kopi/matcha/pre-workout)
const CaffeineBubblePin = ({ cx, cy, offsetY = 0, isDark }) => {
  const bubbleY = cy - 22 - offsetY;
  const ringStroke = isDark ? '#0f172a' : '#ffffff';
  return (
    <g pointerEvents="none">
      {offsetY === 0 && (
        <>
          <circle cx={cx} cy={cy} r={3.5} fill="#f59e0b" stroke={ringStroke} strokeWidth={1.75} />
          <polygon
            points={`${cx - 3.5},${bubbleY + 7.5} ${cx + 3.5},${bubbleY + 7.5} ${cx},${cy - 5}`}
            fill="#f59e0b"
          />
        </>
      )}
      <circle cx={cx} cy={bubbleY} r={9.5} fill="#f59e0b" stroke={ringStroke} strokeWidth={1.6} />
      <g
        transform={`translate(${cx - 5.2}, ${bubbleY - 5.2}) scale(0.43)`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      </g>
    </g>
  );
};

const IntradayEnergyChart = ({
  t,
  theme,
  readiness,
  isToday = true,
  language = 'id',
}) => {
  const isDark = theme === 'dark';
  const curve = readiness?.curve;
  const points = curve?.points || [];

  if (!curve || curve.status === 'unknown' || points.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center">
        <Zap size={24} className={`mb-3 opacity-25 ${t.textMain}`} />
        <span className={`text-sm font-bold ${t.textMuted}`}>
          Kurva energi per jam belum tersedia
        </span>
        <span className={`text-xs mt-1 opacity-75 max-w-xs ${t.textMuted}`}>
          Sinkronkan data tidur dari smartwatch atau catat durasi tidur semalam untuk memetakan energi sepanjang hari.
        </span>
      </div>
    );
  }

  const nowHour = new Date().getHours();
  const currentLabel = `${String(nowHour).padStart(2, '0')}:00`;
  const hasCurrentMarker = isToday && points.some((p) => p.hour === nowHour);
  const hasAnyCaffeine = points.some((p) => p.caffeineBoost > 0);

  const lineStroke = isDark ? '#38bdf8' : '#0284c7';
  const baseLineStroke = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.55)';
  const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0]?.payload;
    if (!p) return null;

    let statusText = 'Butuh Pemulihan';
    let statusColor = 'text-rose-400';
    if (p.score >= 80) {
      statusText = 'Prima';
      statusColor = 'text-emerald-400';
    } else if (p.score >= 60) {
      statusText = 'Moderat';
      statusColor = 'text-sky-400';
    }

    return (
      <div
        className={`rounded-xl border px-3 py-2.5 shadow-xl text-xs ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-4 pb-1.5 mb-1.5 border-b border-slate-500/20">
          <span className="font-bold opacity-80">Jam {p.label}</span>
          <span className={`font-black ${statusColor}`}>{statusText}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-75">Skor Energi</span>
          <span className="font-black text-sm tabular-nums">{p.score} / 100</span>
        </div>
        {Array.isArray(p.workoutEvents) && p.workoutEvents.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-500/20 space-y-0.5">
            {p.workoutEvents.map((w, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 text-blue-400 font-bold">
                <span className="truncate max-w-[140px]">{w.name}</span>
                <span className="tabular-nums opacity-90">{w.timeStr || p.label}</span>
              </div>
            ))}
          </div>
        )}
        {p.caffeineBoost > 0 && (
          <>
            <div className="flex items-center justify-between gap-4 mt-1 opacity-75">
              <span>Alami (tanpa kafein)</span>
              <span className="font-bold tabular-nums">{p.baseScore}</span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-1 text-amber-400 font-bold">
              <span>{p.caffeineSource || 'Kafein'}</span>
              <span className="tabular-nums">+{p.caffeineBoost}</span>
            </div>
          </>
        )}
        {p.workoutDrain > 0 && (!p.workoutEvents || p.workoutEvents.length === 0) && (
          <div className="flex items-center justify-between gap-4 mt-1 text-sky-400/90 font-bold">
            <span>Lelah Latihan</span>
            <span className="tabular-nums">-{p.workoutDrain}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header Legend Ringkas */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span className={t.textMain}>Energi Per Jam</span>
          </div>
          {hasAnyCaffeine && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-slate-400 inline-block" />
              <span className={t.textMuted}>Tanpa Kafein</span>
            </div>
          )}
        </div>
      </div>

      {/* Kurva Line / Area Intraday */}
      <div className="w-full h-56 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 36, right: 22, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="intradayEnergyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineStroke} stopOpacity={0.35} />
                <stop offset="95%" stopColor={lineStroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={26}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: axisColor, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: lineStroke, strokeWidth: 1, strokeDasharray: '4 4' }} />

            {hasCurrentMarker && (
              <ReferenceLine
                x={currentLabel}
                stroke={isDark ? '#34d399' : '#059669'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: 'Sekarang',
                  position: 'top',
                  fill: isDark ? '#34d399' : '#059669',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}

            {hasAnyCaffeine && (
              <Line
                type="monotone"
                dataKey="baseScore"
                stroke={baseLineStroke}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}

            <Area
              type="monotone"
              dataKey="score"
              stroke={lineStroke}
              strokeWidth={2.75}
              fill="url(#intradayEnergyFill)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy || !payload) return null;
                const hasWorkout = Array.isArray(payload.workoutEvents) && payload.workoutEvents.length > 0;
                const hasCaffeine = Array.isArray(payload.caffeineMoments) && payload.caffeineMoments.length > 0;
                const isNowDot = isToday && payload.hour === nowHour;

                if (!hasWorkout && !hasCaffeine && !isNowDot) return null;

                return (
                  <g key={`dot-${payload.hour}`}>
                    {isNowDot && !hasWorkout && !hasCaffeine && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#10b981"
                        stroke={isDark ? '#0f172a' : '#ffffff'}
                        strokeWidth={2}
                      />
                    )}
                    {hasWorkout && (
                      <WorkoutBubblePin
                        cx={cx}
                        cy={cy}
                        count={payload.workoutEvents.length}
                        isDark={isDark}
                      />
                    )}
                    {hasCaffeine && (
                      <CaffeineBubblePin
                        cx={cx}
                        cy={cy}
                        offsetY={hasWorkout ? 22 : 0}
                        isDark={isDark}
                      />
                    )}
                  </g>
                );
              }}
              activeDot={{ r: 5, fill: lineStroke, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={400}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Ringkasan 3 Metrik Kunci */}
      <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-dashed border-slate-500/20 text-center">
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${t.textMuted}`}>Bangun Tidur</span>
          <span className={`text-lg font-black tabular-nums ${t.textMain}`}>{curve.morningScore}</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${t.textMuted}`}>
            {isToday ? 'Saat Ini' : 'Rata-rata'}
          </span>
          <span className="text-lg font-black tabular-nums text-sky-400">
            {isToday ? readiness.score : curve.avgScore}
          </span>
        </div>
        <div className="flex flex-col">
          <span className={`text-xs font-bold ${t.textMuted}`}>Puncak</span>
          <span className="text-lg font-black tabular-nums text-emerald-400">{curve.peakScore}</span>
        </div>
      </div>
    </div>
  );
};

export default IntradayEnergyChart;
