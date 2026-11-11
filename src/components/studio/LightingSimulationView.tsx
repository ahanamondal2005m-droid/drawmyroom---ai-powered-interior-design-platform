import React, { useState } from 'react';
import { Project, LightingConfig, LuminaireFixture } from '../../types';
import { Sun, Moon, Compass, Wand2 } from 'lucide-react';
import * as api from '../../services/api';

interface LightingSimulationViewProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const LightingSimulationView: React.FC<LightingSimulationViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToTab,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'heatmap' | 'raytraced' | 'realistic'>('heatmap');
  const [isBalancingAi, setIsBalancingAi] = useState(false);
  const [aiBalanceFeedback, setAiBalanceFeedback] = useState<string | null>(null);

  const cfg = project.lightingConfig;

  // Handle Diurnal Time Slider
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    // Adjust solar altitude based on time
    let altitude = 42;
    let orientation = 135.4;
    let daylightLum = 1720;

    if (hours >= 6 && hours <= 18) {
      const sunProgress = (minutes - 360) / 720; // 0 at 6am, 1 at 6pm
      altitude = Math.round(Math.sin(sunProgress * Math.PI) * 65);
      orientation = Math.round(90 + sunProgress * 180);
      daylightLum = Math.round(Math.sin(sunProgress * Math.PI) * 2200);
    } else {
      altitude = 0;
      daylightLum = 0;
    }

    onUpdateProject({
      lightingConfig: {
        ...cfg,
        diurnalTime: formatted,
        altitudeDeg: altitude,
        solarOrientationDeg: orientation,
        daylightLumens: daylightLum,
        allocatedLumens: daylightLum + cfg.artificialLumens,
      },
    });
  };

  // Convert "HH:MM" to minutes for slider
  const [hoursStr, minsStr] = cfg.diurnalTime.split(':');
  const currentMinutes = parseInt(hoursStr, 10) * 60 + parseInt(minsStr, 10);

  // Local Luminaire Auto-Balance (photometric + circadian computation)
  const handleAutoBalanceAI = async () => {
    setIsBalancingAi(true);
    setAiBalanceFeedback(null);

    try {
      const data = await api.balanceLighting({
        timeOfDay: cfg.diurnalTime,
        targetLumens: cfg.totalLumenBudget,
        currentFixtures: cfg.activeLuminaires,
        roomSqFt: project.dimensions.lengthFt * project.dimensions.widthFt,
      });

      if (data.success && data.lightingBalance) {
        const b = data.lightingBalance;
        setAiBalanceFeedback(b.actionSummary);

        onUpdateProject({
          lightingConfig: {
            ...cfg,
            allocatedLumens: b.adjustedTargetLumens || 3450,
            circadianScorePercent: b.circadianScore || 96,
          },
        });
      }
    } catch (err) {
      console.error('Error balancing lighting with local engine:', err);
    } finally {
      setIsBalancingAi(false);
    }
  };

  const allocatedPercent = Math.min(100, Math.round((cfg.allocatedLumens / cfg.totalLumenBudget) * 100));

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto gap-4">
      {/* Top Header & Simulation Engine Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#181C24] border border-[#28303F] rounded-xl p-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#06B6D4]">
            <span>SIMULATION ENGINE ACTIVE</span>
            <span className="text-slate-500">•</span>
            <span>SolCalc Core v2.4</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">Radiance IES-LM-83 Compliant</span>
            <span className="text-slate-500">•</span>
            <span>Preset: Nordic Sunset</span>
          </div>
          <h1 className="text-xl font-bold font-mono text-white mt-0.5">
            Photometric Lighting & Solar Simulation
          </h1>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#14171D] p-1 rounded-lg border border-[#28303F]">
            <button
              onClick={() => setActiveViewTab('heatmap')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeViewTab === 'heatmap'
                  ? 'bg-[#E5855E] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lux Heatmap
            </button>
            <button
              onClick={() => setActiveViewTab('raytraced')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeViewTab === 'raytraced'
                  ? 'bg-[#E5855E] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raytraced Shadows
            </button>
            <button
              onClick={() => setActiveViewTab('realistic')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeViewTab === 'realistic'
                  ? 'bg-[#E5855E] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Realistic 3D Lux
            </button>
          </div>
        </div>
      </div>

      {/* Main Simulation Workspace Grid */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4">
        {/* Left Column: Solar & Daylight Controls */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
          {/* 1. Solar & Daylight Card */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                <Sun className="w-4 h-4 text-[#F59E0B]" />
                <span>SOLAR & DAYLIGHT</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#06B6D4]/20 text-[#06B6D4] font-bold rounded">
                LIVE PBR
              </span>
            </div>

            {/* Compass Dial Simulation */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              <div className="relative w-36 h-36 rounded-full border-2 border-[#28303F] flex items-center justify-center bg-[#14171D]">
                {/* Compass Marks */}
                <span className="absolute top-1 text-[9px] font-mono text-slate-500 font-bold">N</span>
                <span className="absolute bottom-1 text-[9px] font-mono text-slate-500 font-bold">S</span>
                <span className="absolute left-1.5 text-[9px] font-mono text-slate-500 font-bold">W</span>
                <span className="absolute right-1.5 text-[9px] font-mono text-slate-500 font-bold">E</span>

                {/* Sun Position Indicator Needle */}
                <div
                  className="absolute w-full h-full pointer-events-none transition-transform duration-300"
                  style={{ transform: `rotate(${cfg.solarOrientationDeg}deg)` }}
                >
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#F59E0B] shadow-[0_0_12px_#F59E0B]"></div>
                    <div className="w-0.5 h-12 bg-gradient-to-b from-[#F59E0B] to-transparent"></div>
                  </div>
                </div>

                {/* Center Altitude Callout */}
                <div className="text-center">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">ALTITUDE</div>
                  <div className="text-lg font-bold font-mono text-white">{cfg.altitudeDeg}°</div>
                </div>
              </div>

              <div className="text-xs font-mono text-[#06B6D4] font-semibold mt-2">
                SOLAR ORIENTATION: SE {cfg.solarOrientationDeg}°
              </div>
            </div>

            {/* Direct DNI & Zenith Lux */}
            <div className="grid grid-cols-2 gap-2 bg-[#14171D] p-2.5 rounded-lg border border-[#28303F] font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block">DIRECT DNI</span>
                <span className="text-xs font-bold text-white mt-0.5 block">{cfg.directDni} W/m²</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">ZENITH LUX</span>
                <span className="text-xs font-bold text-[#06B6D4] mt-0.5 block">
                  {cfg.zenithLux.toLocaleString()} lx
                </span>
              </div>
            </div>
          </div>

          {/* 2. Diurnal Cycle Slider */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">DIURNAL CYCLE</span>
              <span className="text-[#F59E0B] font-bold">
                {cfg.diurnalTime} {parseInt(hoursStr, 10) >= 16 ? 'Golden Hour' : 'Daylight'}
              </span>
            </div>

            <input
              type="range"
              min="360" // 06:00
              max="1320" // 22:00
              step="15"
              value={currentMinutes}
              onChange={handleTimeChange}
              className="w-full accent-[#E5855E] cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>06:00 AM</span>
              <span className="text-white font-bold">12:00 NOON</span>
              <span>22:00 PM</span>
            </div>
          </div>

          {/* 3. Fenestration Profile */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-2.5 shadow-md">
            <div className="text-xs font-mono font-bold text-slate-200">FENESTRATION PROFILE</div>

            <div className="flex flex-col gap-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Casement Aperture</span>
                <span className="text-white font-bold">
                  {cfg.casementWidthFt.toFixed(1)} × {cfg.casementHeightFt.toFixed(1)} ft
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Window-to-Wall Ratio</span>
                <span className="text-[#06B6D4] font-bold">{cfg.windowToWallRatio}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Glazing Spec (SHGC)</span>
                <span className="text-white">{cfg.glazingSpec}</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#28303F] pt-2">
                <span className="text-slate-300">Linen Drape Diffusion</span>
                <input
                  type="checkbox"
                  checked={cfg.linenDrapeDiffusion}
                  onChange={(e) =>
                    onUpdateProject({
                      lightingConfig: { ...cfg, linenDrapeDiffusion: e.target.checked },
                    })
                  }
                  className="accent-[#06B6D4] w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Live Lux Heatmap & Contours */}
        <div className="flex-1 flex flex-col bg-[#14171D] rounded-xl border border-[#28303F] overflow-hidden min-h-[480px] relative shadow-lg">
          {/* Top Status */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 bg-[#181C24]/90 backdrop-blur border border-[#28303F] rounded-lg text-xs font-mono text-slate-300 pointer-events-auto">
              Lux Contours: <span className="text-[#06B6D4] font-bold">Radiance Ray-Casting 1:1</span>
            </div>

            <div className="px-3 py-1.5 bg-[#181C24]/90 backdrop-blur border border-[#28303F] rounded-lg text-xs font-mono text-slate-300 pointer-events-auto">
              Peak: <span className="text-[#F59E0B] font-bold">642 lx (Task Zone)</span>
            </div>
          </div>

          {/* Canvas Render Heatmap Area */}
          <div className="flex-1 relative flex items-center justify-center p-6 bg-[#0E1116] overflow-hidden">
            <div className="relative w-full max-w-xl aspect-[1.3/1] bg-[#14171D] border border-[#28303F] rounded-xl overflow-hidden shadow-2xl p-4 flex items-center justify-center">
              {/* Daylight Window Sweep Gradient */}
              <div
                className="absolute inset-x-12 top-0 h-44 pointer-events-none opacity-40 blur-2xl transition-opacity duration-300"
                style={{
                  background:
                    cfg.altitudeDeg > 10
                      ? 'radial-gradient(ellipse at top, #06B6D4 0%, #F59E0B 40%, transparent 80%)'
                      : 'radial-gradient(ellipse at top, #1E293B 0%, transparent 60%)',
                }}
              />

              {/* Top Window Aperture indicator */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-[#06B6D4] rounded-b shadow-[0_0_12px_#06B6D4]" />

              {/* Interactive Heatmap Contour Circles */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Luminaire Glow Over Sofa */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-44 rounded-full bg-[#F59E0B]/20 blur-xl pointer-events-none" />

                {/* Sofa Outline */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-20 border border-slate-600 rounded-lg bg-[#242A36]/60 flex items-center justify-center font-mono text-[10px] text-slate-400">
                  SOFA LOUNGE
                </div>

                {/* Coffee table */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-24 h-12 border border-slate-600 rounded bg-[#242A36]/70 mt-6 flex items-center justify-center font-mono text-[9px] text-slate-400">
                  TABLE
                </div>

                {/* Callout Marker 1: Task Peak (642 lx) */}
                <div className="absolute top-1/4 right-1/3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B] animate-ping" />
                  <div className="px-2 py-1 bg-black/90 border border-[#F59E0B] rounded text-[10px] font-mono text-[#F59E0B] font-bold shadow-lg whitespace-nowrap">
                    642 lx (Task Peak)
                  </div>
                </div>

                {/* Callout Marker 2: Glare-Free (UGR 12) */}
                <div className="absolute bottom-1/4 left-1/4 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                  <div className="px-2 py-1 bg-black/90 border border-[#06B6D4] rounded text-[10px] font-mono text-[#06B6D4] font-bold shadow-lg whitespace-nowrap">
                    UGR 12 GLARE-FREE (TV Safe &lt;19 UGR)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photometric Spectrum Bar (Matching Screenshot 6 footer) */}
          <div className="px-4 py-3 bg-[#181C24] border-t border-[#28303F] flex flex-col gap-2 font-mono">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>PHOTOMETRIC SPECTRUM</span>
              <span>Min: 80 lx — Max: 750 lx</span>
            </div>

            {/* Gradient Spectrum Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-[#14171D] via-[#06B6D4] via-[#F59E0B] to-[#E5855E] opacity-90 shadow-inner" />

            <div className="grid grid-cols-4 text-center text-[9px] text-slate-400 pt-1">
              <div>&lt;100 lx (Ambient)</div>
              <div className="text-[#06B6D4]">250 lx (General)</div>
              <div className="text-[#F59E0B]">450 lx (Workplane)</div>
              <div className="text-[#E5855E]">650+ lx (Reading Task)</div>
            </div>
          </div>
        </div>

        {/* Right Column: Photometrics & Circadian Health */}
        <div className="w-full xl:w-84 shrink-0 flex flex-col gap-4">
          {/* 1. Photometrics & IES Budget */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">PHOTOMETRICS & IES</span>
              <span className="text-[10px] font-mono text-[#06B6D4]">3 FIXTURES</span>
            </div>

            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">TOTAL LUMEN BUDGET</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black font-mono text-white">
                  {cfg.allocatedLumens.toLocaleString()} lm
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Target: {cfg.totalLumenBudget.toLocaleString()} lm
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">
                {allocatedPercent}% Allocated
              </span>
            </div>

            {/* Daylight vs Artificial Split */}
            <div className="grid grid-cols-2 gap-2 bg-[#14171D] p-2.5 rounded-lg border border-[#28303F] font-mono text-xs">
              <div>
                <span className="text-[9px] text-slate-400 block">DAYLIGHT</span>
                <span className="text-white font-bold">{cfg.daylightLumens.toLocaleString()} lm</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">ARTIFICIAL</span>
                <span className="text-[#06B6D4] font-bold">{cfg.artificialLumens.toLocaleString()} lm</span>
              </div>
            </div>
          </div>

          {/* 2. Active Luminaires List */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="text-xs font-mono font-bold text-slate-200">ACTIVE LUMINAIRES (CRI Ra &gt; 95)</div>

            <div className="flex flex-col gap-2">
              {cfg.activeLuminaires.map((lum) => (
                <div
                  key={lum.id}
                  className="p-2.5 bg-[#14171D] border border-[#28303F] rounded-lg flex items-center justify-between font-mono"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{lum.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {lum.type} • {lum.cct} {lum.powerWatts}W
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#06B6D4]">{lum.lumens} lm</span>
                    <span className="text-[9px] text-emerald-400 block">{lum.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Circadian Cycle Health */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">CIRCADIAN CYCLE HEALTH</span>
              <Moon className="w-4 h-4 text-[#06B6D4]" />
            </div>

            <div className="flex items-center gap-4">
              {/* Ring Indicator */}
              <div className="relative w-16 h-16 rounded-full border-4 border-[#06B6D4] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold font-mono text-white">
                  {cfg.circadianScorePercent}%
                </span>
              </div>

              <div>
                <div className="text-xs font-bold font-mono text-white">Evening Compliant</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Melanopic Lux suppresses under 65 lx to support sleep rhythm.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#14171D] p-2 rounded border border-[#28303F] font-mono text-[10px]">
              <div>
                <span className="text-slate-400 block">CS (STIMULUS)</span>
                <span className="text-white font-bold">0.08 (Rest)</span>
              </div>
              <div>
                <span className="text-slate-400 block">BLUE PEAK (480nm)</span>
                <span className="text-emerald-400 font-bold">-82% Attenuated</span>
              </div>
            </div>
          </div>

          {/* AI Auto-Balance Lumens Action */}
          <button
            onClick={handleAutoBalanceAI}
            disabled={isBalancingAi}
            className="w-full py-3 bg-[#E5855E] hover:bg-[#D2714A] disabled:opacity-50 text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg mt-auto"
          >
            {isBalancingAi ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Balancing Lux (Local Engine)...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Auto-Balance Lumens (Local Engine)</span>
              </>
            )}
          </button>
          {aiBalanceFeedback && (
            <div className="p-2.5 bg-[#06B6D4]/10 border border-[#06B6D4]/30 rounded-lg text-[10px] font-mono text-[#06B6D4]">
              {aiBalanceFeedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
