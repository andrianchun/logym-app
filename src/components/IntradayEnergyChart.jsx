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
import { Zap, Coffee, Dumbbell } from 'lucide-react';

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
  const hasAnyWorkout = points.some((p) => p.workoutDrain > 0);

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
        {p.workoutDrain > 0 && (
          <div className="flex items-center justify-between gap-4 mt-1 text-rose-400 font-bold">
            <span>Beban Latihan</span>
            <span className="tabular-nums">-{p.workoutDrain}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header Legend Ringkas */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
        <div className="flex items-center gap-2 text-xs">
          {hasAnyCaffeine && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/25">
              <Coffee size={12} /> Lomeal
            </span>
          )}
          {hasAnyWorkout && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold border border-rose-500/25">
              <Dumbbell size={12} /> Sesi
            </span>
          )}
        </div>
      </div>

      {/* Kurva Line / Area Intraday */}
      <div className="w-full h-52 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 14, right: 10, left: -24, bottom: 0 }}>
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
              minTickGap={24}
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
                if (payload.eventType === 'caffeine') {
                  return (
                    <circle
                      key={`caf-${payload.hour}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill="#f59e0b"
                      stroke={isDark ? '#0f172a' : '#ffffff'}
                      strokeWidth={2}
                    />
                  );
                }
                if (isToday && payload.hour === nowHour) {
                  return (
                    <circle
                      key={`now-${payload.hour}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#10b981"
                      stroke={isDark ? '#0f172a' : '#ffffff'}
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              }}
              activeDot={{ r: 5, fill: lineStroke, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={450}
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
