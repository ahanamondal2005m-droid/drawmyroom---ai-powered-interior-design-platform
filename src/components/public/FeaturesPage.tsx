import React from 'react';
import { Box, Layers, Sparkles, Sun, FileText, Users, ArrowRight } from 'lucide-react';

interface FeaturesPageProps {
  onStartDesigning: () => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onStartDesigning }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#14171D] text-slate-100 p-4 sm:p-8 lg:p-12 max-w-6xl mx-auto w-full font-mono">
      <div className="text-center max-w-3xl mx-auto py-8">
        <span className="text-xs text-[#06B6D4] uppercase tracking-wider">ENTERPRISE ARCHITECTURAL CAPABILITIES</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Precision Studio Modules
        </h1>
        <p className="text-sm text-slate-300 mt-4 leading-relaxed font-sans">
          Built from the ground up for zero-guesswork spatial planning, certified daylight simulations, and synchronized Bill of Quantities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-[#E5855E]/10 text-[#E5855E] flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Spatial Editor (2D/3D)</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Orthographic 2D floorplan with 12-inch snap grid and Three.js 3D isometric & eye-level walkthrough. Includes 36-inch clearance conflict alerts and auto-snap collision resolution.
          </p>
        </div>

        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Curated Architectural Catalog</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Parametric catalog bounded dynamically to your room envelope. Verified contract grade finishes, vendor lead times, and bottom staging tray.
          </p>
        </div>

        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Materials Studio</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Chevron Smoked Oak, Venetian Terrazzo, and Microcement Slate with PBR roughness, normal depth relief, scratch index, and surface square-foot pricing with waste factor.
          </p>
        </div>

        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
            <Sun className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Lighting Simulation</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Solar orientation compass, diurnal time slider, fenestration profiles, lux heatmaps, and local-engine auto-balance for circadian evening compliance.
          </p>
        </div>

        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-[#E5855E]/10 text-[#E5855E] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Estimates & BoQ Specs</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Itemized trade pricing, volumetric cost share breakdown, AI value-engineering alternatives, and exportable PDF/CSV architectural specification sheets.
          </p>
        </div>

        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3 shadow">
          <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Designer Connect</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Directory of certified interior architects for bespoke cabinetry, structural review, and permitting documentation.
          </p>
        </div>
      </div>

      <div className="text-center py-6">
        <button
          onClick={onStartDesigning}
          className="px-8 py-3.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold rounded-xl transition-all shadow-lg inline-flex items-center gap-2"
        >
          <span>Open Full Architectural Suite</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
