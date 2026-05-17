"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ── SSR-safe Speedometer ─────────────────────────────── */
const ReactSpeedometer = dynamic(() => import("react-d3-speedometer"), {
  ssr: false,
  loading: () => (
    <div className="w-[300px] h-[200px] flex flex-col items-center justify-center text-slate-500 font-medium">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      Loading gauge...
    </div>
  ),
});

/* ── Custom Chart Tooltip ─────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  const col = v > 120 ? "text-rose-500" : v > 80 ? "text-amber-500" : "text-emerald-400";
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-2xl min-w-[150px]">
      <div className="text-xs text-slate-400 mb-2 font-medium tracking-wide uppercase">{label}</div>
      <div className={`text-2xl font-bold font-mono ${col} flex items-baseline gap-1`}>
        {v.toFixed(1)} <span className="text-xs font-medium text-slate-400">km/h</span>
      </div>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────────── */
function StatCard({ label, value, unit, icon, colorClass, bgClass }) {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between gap-4 transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 group-hover:text-slate-300 transition-colors">
          {label}
        </span>
        <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center text-2xl shadow-inner border border-white/5`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className={`font-mono text-4xl font-bold tracking-tight ${colorClass}`}>
          {value}
        </span>
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{unit}</span>
      </div>
    </div>
  );
}

/* ── Section Header ───────────────────────────────────── */
function SectionHeader({ icon, title, badge }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-lg shadow-sm">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{title}</h2>
      </div>
      {badge && (
        <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg uppercase tracking-wider">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function Home() {
  const [speed, setSpeed]             = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory]         = useState([]);
  const [isPaused, setIsPaused]       = useState(false);
  const [stats, setStats]             = useState({ maxSpeed: 0, totalReadings: 0, sumSpeed: 0 });

  const isPausedRef = useRef(isPaused);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8765";
    const ws = new WebSocket(wsUrl);
    ws.onopen  = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (e) => {
      if (isPausedRef.current) return;
      try {
        const d = JSON.parse(e.data);
        if (d.speed == null) return;
        setSpeed(d.speed);
        setHistory((prev) => {
          const next = [...prev, d];
          return next.length > 40 ? next.slice(-40) : next;
        });
        setStats((prev) => ({
          maxSpeed:      Math.max(prev.maxSpeed, d.speed),
          totalReadings: prev.totalReadings + 1,
          sumSpeed:      prev.sumSpeed + d.speed,
        }));
      } catch { /* skip */ }
    };
    return () => ws.close();
  }, []);

  const avgSpeed = stats.totalReadings > 0
    ? (stats.sumSpeed / stats.totalReadings).toFixed(1) : "0.0";

  const chartData = history.map((r) => ({
    time:  new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    speed: parseFloat(r.speed.toFixed(1)),
  }));

  const tableRows = [...history].reverse().slice(0, 8);

  const speedMeta =
    speed > 120 ? { color: "#f43f5e", textClass: "text-rose-500", bgClass: "bg-rose-500/10 border-rose-500/20", label: "HIGH SPEED",   needle: "#f43f5e" }
  : speed > 80  ? { color: "#f59e0b", textClass: "text-amber-500", bgClass: "bg-amber-500/10 border-amber-500/20", label: "MODERATE",     needle: "#f59e0b" }
  :               { color: "#10b981", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10 border-emerald-500/20", label: "OPTIMAL",      needle: "#10b981" };

  return (
    <>
      <div className="bg-mesh"></div>
      
      {/* ════════════ HEADER ════════════ */}
      <header className="relative z-50 glass-panel border-x-0 border-t-0 rounded-none shadow-2xl bg-gray-950/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/20">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 14l4.5-4.5" />
                <circle cx="12" cy="14" r="2" fill="white" />
                <path d="M3.34 16A10 10 0 1 1 20.66 16" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-xl tracking-tight text-white flex items-center gap-1">
                Speedo<span className="text-indigo-400">Track</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 tracking-[0.2em] uppercase mt-0.5">
                Telemetry Dashboard
              </div>
            </div>
          </div>

          {/* Center: Live Speed Pill */}
          <div className="hidden md:flex items-center gap-4 bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-2.5 shadow-inner">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Now</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-white">
                {speed.toFixed(1)}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">km/h</span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-4">
            {/* Live/Offline */}
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border ${isConnected ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:inline-block">
                {isConnected ? "LIVE" : "OFFLINE"}
              </span>
            </div>

            {/* Pause/Resume */}
            <button 
              onClick={() => setIsPaused(p => !p)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border shadow-lg ${
                isPaused 
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30" 
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════ BODY ════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 flex flex-col gap-8 pb-20">

        {/* Paused Notice */}
        {isPaused && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-center gap-3 text-amber-200/90 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-xl">⏸️</span>
            <span className="text-sm font-medium tracking-wide">
              Live feed paused. Click <strong className="text-amber-400">RESUME</strong> to continue tracking.
            </span>
          </div>
        )}

        {/* ── TOP ROW: Speedometer + Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-stretch">

          {/* Speedometer Card */}
          <div className="glass-panel rounded-3xl p-8 flex flex-col relative overflow-hidden group">
            {/* Background glow effect based on speed */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: speedMeta.color }}></div>
            
            <SectionHeader icon="🎯" title="Telemetry Gauge" />
            
            <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] relative z-10">
              <div className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <ReactSpeedometer
                  value={speed}
                  minValue={0}
                  maxValue={160}
                  segments={8}
                  needleColor={speedMeta.needle}
                  startColor="#10b981"
                  endColor="#f43f5e"
                  textColor="#f8fafc"
                  currentValueText={`${speed.toFixed(1)} km/h`}
                  width={340}
                  height={210}
                  ringWidth={30}
                  paddingHorizontal={20}
                  paddingVertical={20}
                />
              </div>

              {/* Status Badge */}
              <div className={`mt-6 px-6 py-2 rounded-full border ${speedMeta.bgClass} flex items-center gap-2 backdrop-blur-md`}>
                <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: speedMeta.color, boxShadow: `0 0 10px ${speedMeta.color}` }}></span>
                <span className={`text-xs font-bold tracking-widest ${speedMeta.textClass}`}>
                  {speedMeta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 content-start">
            <StatCard 
              label="Current Speed" 
              value={speed.toFixed(1)} 
              unit="km/h" 
              icon="📍" 
              colorClass="text-indigo-400" 
              bgClass="bg-indigo-500/20 text-indigo-400" 
            />
            <StatCard 
              label="Max Speed" 
              value={stats.maxSpeed.toFixed(1)} 
              unit="km/h" 
              icon="🚀" 
              colorClass="text-rose-400" 
              bgClass="bg-rose-500/20 text-rose-400" 
            />
            <StatCard 
              label="Average Speed" 
              value={avgSpeed} 
              unit="km/h" 
              icon="📊" 
              colorClass="text-cyan-400" 
              bgClass="bg-cyan-500/20 text-cyan-400" 
            />
            <StatCard 
              label="Data Points" 
              value={stats.totalReadings.toLocaleString()} 
              unit="pts" 
              icon="🗄️" 
              colorClass="text-emerald-400" 
              bgClass="bg-emerald-500/20 text-emerald-400" 
            />
          </div>
        </div>

        {/* ── CHART ── */}
        <div className="glass-panel rounded-3xl p-6 lg:p-8">
          <SectionHeader icon="📈" title="Velocity Trend" badge={`Last ${chartData.length} records`} />
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  stroke="transparent" 
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-outfit)" }} 
                  tickMargin={12}
                />
                <YAxis 
                  stroke="transparent" 
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-mono)" }} 
                  domain={[0, 160]} 
                  ticks={[0, 40, 80, 120, 160]} 
                  tickMargin={12}
                />
                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} />
                <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="speed" 
                  stroke="#818cf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSpeed)" 
                  activeDot={{ r: 6, fill: "#c7d2fe", stroke: "#4f46e5", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="glass-panel rounded-3xl p-6 lg:p-8 overflow-hidden">
          <SectionHeader icon="🗃️" title="Telemetry Logs" badge="Latest 8 entries" />
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-24">ID</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Velocity</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-500 font-medium">
                      Awaiting telemetry data...
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => {
                    const s = row.speed;
                    const col = s > 120 ? "text-rose-400" : s > 80 ? "text-amber-400" : "text-emerald-400";
                    const bg = s > 120 ? "bg-rose-500/10 border-rose-500/20" : s > 80 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20";
                    const lbl = s > 120 ? "HIGH" : s > 80 ? "MODERATE" : "OPTIMAL";
                    const isNew = idx === 0;

                    return (
                      <tr key={row.id} className={`hover:bg-white/[0.02] transition-colors ${isNew ? 'bg-indigo-500/[0.03]' : ''}`}>
                        <td className="py-4 px-4">
                          <span className="font-mono text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md border border-white/5">
                            #{row.id}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-mono text-lg font-bold ${col}`}>{s.toFixed(1)}</span>
                          <span className="text-xs text-slate-500 ml-2 font-semibold">km/h</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-slate-300 font-medium tracking-wide">
                            {new Date(row.created_at).toLocaleTimeString()}
                          </span>
                          {isNew && (
                            <span className="ml-3 text-[9px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                              New
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${bg} text-[10px] font-bold tracking-widest ${col}`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]`}></span>
                            {lbl}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
