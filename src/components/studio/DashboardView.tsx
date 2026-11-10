import React from 'react';
import { Project } from '../../types';
import {
  Layers,
  Box,
  UploadCloud,
  DollarSign,
  Sun,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Plus,
  Users,
  Compass,
} from 'lucide-react';

interface DashboardViewProps {
  project: Project;
  onNavigateToTab: (tabId: string) => void;
  onOpenNewProjectModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  onNavigateToTab,
  onOpenNewProjectModal,
}) => {
  const currencySymbol = project.budget.currency === 'INR' ? '₹' : '$';
  const floorArea = project.dimensions.lengthFt * project.dimensions.widthFt;
  const committedPercent = Math.round((project.budget.committed / project.budget.totalCap) * 100);

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto gap-6 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#181C24] via-[#1C222D] to-[#14171D] border border-[#28303F] rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#E5855E]/10 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[#06B6D4] mb-2">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <span>ACTIVE WORKSPACE • ARCHITECTURAL STUDIO</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold font-mono text-white tracking-tight">
            Welcome to DrawMyRoom Studio
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Active Project: <span className="text-white font-bold">{project.name}</span> ({project.roomType}). Transform your hand-drawn sketch into an interactive 3D space with verified 36-inch walkways, PBR materials, and real-time BoQ pricing.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => onNavigateToTab('spatial')}
              className="px-5 py-2.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
            >
              <Box className="w-4 h-4" />
              <span>Launch 2D/3D Spatial Editor</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewProjectModal}
              className="px-4 py-2.5 bg-[#242A36] hover:bg-[#2A313E] border border-[#28303F] text-white text-xs font-mono rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#06B6D4]" />
              <span>New Room Project</span>
            </button>
          </div>
        </div>

        {/* Project Quick Spec Card */}
        <div className="relative z-10 bg-[#14171D]/90 backdrop-blur border border-[#28303F] rounded-xl p-4 flex flex-col gap-2 min-w-[240px]">
          <div className="text-[10px] font-mono text-slate-400 uppercase">PROJECT METRICS</div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-300">Dimensions</span>
            <span className="text-xs font-bold text-white">
              {project.dimensions.lengthFt}' × {project.dimensions.widthFt}'
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-300">Floor Area</span>
            <span className="text-xs font-bold text-[#06B6D4]">{floorArea} sq ft</span>
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-300">Budget Usage</span>
            <span className="text-xs font-bold text-[#F59E0B]">{committedPercent}%</span>
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-xs text-slate-300">Objects Placed</span>
            <span className="text-xs font-bold text-emerald-400">{project.placedObjects.length} Pieces</span>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Studio Suite Cards */}
      <div>
        <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
          WORKSPACE MODULES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Module 1: Spatial Editor */}
          <div
            onClick={() => onNavigateToTab('spatial')}
            className="bg-[#181C24] border border-[#28303F] hover:border-[#E5855E] rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] shadow-md group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#E5855E]/10 text-[#E5855E] flex items-center justify-center">
                <Box className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-400">2D + 3D</span>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white group-hover:text-[#E5855E] transition-colors">
                Spatial Editor
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Scaled orthographic blueprint & Three.js 3D isometric walkthrough with 36" egress checks.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-[#E5855E] gap-1 group-hover:translate-x-1 transition-transform">
              <span>Open Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Module 2: Furniture Catalog */}
          <div
            onClick={() => onNavigateToTab('catalog')}
            className="bg-[#181C24] border border-[#28303F] hover:border-[#06B6D4] rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] shadow-md group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-400">Curated B2B</span>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white group-hover:text-[#06B6D4] transition-colors">
                Furniture Catalog
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Architectural catalog filtered by room bounds, clearance clearance score, and budget caps.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-[#06B6D4] gap-1 group-hover:translate-x-1 transition-transform">
              <span>Browse Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Module 3: Materials Studio */}
          <div
            onClick={() => onNavigateToTab('materials')}
            className="bg-[#181C24] border border-[#28303F] hover:border-[#F59E0B] rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] shadow-md group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-400">PBR 4K</span>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white group-hover:text-[#F59E0B] transition-colors">
                Materials Studio
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Smoked Oak, Venetian Terrazzo, and Microcement with tactile surface area cost calculations.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-[#F59E0B] gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explore Materials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Module 4: Lighting Simulation */}
          <div
            onClick={() => onNavigateToTab('lighting')}
            className="bg-[#181C24] border border-[#28303F] hover:border-[#06B6D4] rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] shadow-md group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-slate-400">Lux Heatmap</span>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white group-hover:text-[#06B6D4] transition-colors">
                Lighting Simulation
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Solar orientation, diurnal golden hour slider, and AI circadian lumen balance.
              </p>
            </div>
            <div className="flex items-center text-xs font-mono text-[#06B6D4] gap-1 group-hover:translate-x-1 transition-transform">
              <span>Simulate Lighting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Budget Summary & Designer Connect Quick CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget & BoQ Specs Card */}
        <div className="lg:col-span-2 bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col justify-between gap-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">BUDGET & BOQ SPECIFICATIONS</div>
              <h3 className="text-lg font-bold font-mono text-white mt-0.5">
                Current Committed: {currencySymbol}{project.budget.committed.toLocaleString()} / {currencySymbol}{project.budget.totalCap.toLocaleString()}
              </h3>
            </div>

            <button
              onClick={() => onNavigateToTab('estimates')}
              className="px-3 py-1.5 bg-[#242A36] hover:bg-[#2A313E] text-xs font-mono text-white rounded-lg border border-[#28303F] transition-colors"
            >
              View Full BoQ
            </button>
          </div>

          <div className="w-full h-2 bg-[#14171D] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#06B6D4] to-[#E5855E]"
              style={{ width: `${Math.min(100, committedPercent)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-[#28303F]">
            <div>
              <span className="text-[10px] text-slate-400 block">SEATING</span>
              <span className="font-bold text-white mt-0.5 block">{currencySymbol}815</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">TABLES</span>
              <span className="font-bold text-white mt-0.5 block">{currencySymbol}379</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">LIGHTING</span>
              <span className="font-bold text-white mt-0.5 block">{currencySymbol}352</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">FINISHES</span>
              <span className="font-bold text-white mt-0.5 block">{currencySymbol}312</span>
            </div>
          </div>
        </div>

        {/* Designer Connect Banner */}
        <div className="bg-gradient-to-br from-[#181C24] to-[#1E2532] border border-[#28303F] rounded-xl p-6 flex flex-col justify-between gap-4 shadow-md">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#E5855E]">
              <Users className="w-4 h-4" />
              <span>DESIGNER CONNECT</span>
            </div>
            <h3 className="text-base font-bold font-mono text-white mt-1">
              Need a Professional Touch?
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Connect with verified residential interior architects for blueprint reviews, bespoke joinery specs, and site-ready drawings.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('designers')}
            className="w-full py-2.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow"
          >
            <span>Consult an Architect</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
