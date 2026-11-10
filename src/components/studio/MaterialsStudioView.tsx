import React, { useState } from 'react';
import { Project, MaterialItem } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';
import {
  Sparkles,
  Layers,
  Search,
  CheckCircle,
  FileDown,
  RotateCcw,
  Box,
  Eye,
  Sliders,
  Sun,
  ShieldCheck,
  Check,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';

interface MaterialsStudioViewProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const MaterialsStudioView: React.FC<MaterialsStudioViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'FLOORING' | 'WALL FINISH' | 'METALS'>('FLOORING');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMaterial, setActiveMaterial] = useState<MaterialItem>(
    project.materialSpecs.materials.find((m) => m.id === project.materialSpecs.activeMaterialId) ||
      MATERIALS_CATALOG[0]
  );
  const [lightingPreset, setLightingPreset] = useState<'morning' | 'noon' | 'evening'>('evening');
  const [wasteFactorPercent, setWasteFactorPercent] = useState<number>(10);
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  const currencySymbol = project.budget.currency === 'INR' ? '₹' : '$';

  // Usable floor area calculation
  const floorAreaSqFt = project.dimensions.lengthFt * project.dimensions.widthFt;
  const wasteMultiplier = 1 + wasteFactorPercent / 100;
  const totalCost = Math.round(floorAreaSqFt * wasteMultiplier * activeMaterial.pricePerSqFt);

  // Filter materials
  const filteredMaterials = MATERIALS_CATALOG.filter((mat) => {
    if (selectedCategory && mat.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        mat.name.toLowerCase().includes(q) ||
        mat.origin.toLowerCase().includes(q) ||
        mat.scratchIndex.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApplyTo3D = () => {
    const updatedMaterials = [
      ...project.materialSpecs.materials.filter((m) => m.plane !== activeMaterial.plane),
      activeMaterial,
    ];
    onUpdateProject({
      materialSpecs: {
        activePlane: activeMaterial.plane,
        activeMaterialId: activeMaterial.id,
        materials: updatedMaterials,
      },
    });
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2000);
  };

  const handleAddToBoQ = () => {
    alert(`Added ${activeMaterial.name} (${floorAreaSqFt} sq ft, ${currencySymbol}${totalCost.toLocaleString()}) to project Bill of Quantities.`);
    onNavigateToTab('estimates');
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto gap-4">
      {/* Top Header & LEED Specification Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#181C24] border border-[#28303F] rounded-xl p-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#06B6D4]">
            <span>PROTOCOL MAT-SPEC-2025.04</span>
            <span className="text-slate-500">•</span>
            <span>Active Plane: {activeMaterial.plane} ({activeMaterial.category})</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">LEED v4.1 Certified Finishes</span>
          </div>
          <h1 className="text-xl font-bold font-mono text-white mt-0.5">
            Architectural Materials Studio
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171D] border border-[#28303F] rounded-lg text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <span>PBR SHADER Raytraced GI • 4K</span>
          </div>

          <button
            onClick={() => setActiveMaterial(MATERIALS_CATALOG[0])}
            className="p-1.5 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Revert State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => alert('Exporting Material Specifications & Environmental Product Declarations (EPD)...')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] rounded-lg text-xs font-mono text-slate-300 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-[#E5855E]" />
            <span>Export Material Spec (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Catalog + Center Live Preview + Right Inspector */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4">
        {/* Left Column: Tactile Repository */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-3">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">TACTILE REPOSITORY</span>
              <span className="text-[10px] font-mono text-[#06B6D4]">18 Materials</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search timber, plaster, alloy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Category tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#14171D] p-1 rounded-lg border border-[#28303F] text-center">
              {(['FLOORING', 'WALL FINISH', 'METALS'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1 text-[10px] font-mono rounded transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#E5855E] text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Material Cards List */}
            <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredMaterials.map((mat) => {
                const isSelected = activeMaterial.id === mat.id;
                return (
                  <div
                    key={mat.id}
                    onClick={() => setActiveMaterial(mat)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#242A36] border-[#06B6D4] shadow-md'
                        : 'bg-[#14171D] border-[#28303F] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Color / Texture Swatch */}
                      <div
                        className="w-12 h-12 rounded-lg border border-white/20 shrink-0 shadow-inner flex items-center justify-center"
                        style={{ backgroundColor: mat.color }}
                      >
                        <span className="text-[9px] font-mono text-white/80 font-bold">4K PBR</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold font-mono text-white truncate">
                            {mat.name}
                          </h4>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>}
                        </div>

                        <div className="text-[10px] font-mono text-slate-400">
                          {mat.origin} • {currencySymbol}{mat.pricePerSqFt.toFixed(2)} / sq ft
                        </div>

                        <div className="grid grid-cols-3 gap-1 mt-2 text-[8px] font-mono text-slate-400">
                          <div>VOC: <span className="text-white">{mat.vocRating}</span></div>
                          <div>RES: <span className="text-white">{mat.scratchIndex}</span></div>
                          <div>ROUGH: <span className="text-white">{mat.roughness}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Substance 3D Import Drag & Drop */}
            <div className="border border-dashed border-[#28303F] hover:border-[#06B6D4] rounded-xl p-3 flex items-center justify-between cursor-pointer bg-[#14171D]/40 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#06B6D4]" />
                <span>Import Substance 3D (.sbsar)</span>
              </div>
              <span className="text-[10px] text-slate-500">Drag & Drop</span>
            </div>
          </div>
        </div>

        {/* Center Column: Live Room Material Visualizer */}
        <div className="flex-1 flex flex-col bg-[#14171D] rounded-xl border border-[#28303F] overflow-hidden min-h-[460px] relative shadow-lg">
          {/* Top Status */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181C24]/85 backdrop-blur border border-[#28303F] rounded-lg text-xs font-mono text-slate-300 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>LOD 0 • 2,410,000 Polys</span>
              <span className="text-slate-500">|</span>
              <span>Bounces: 8 Max</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181C24]/85 backdrop-blur border border-[#28303F] rounded-lg text-xs font-mono text-white pointer-events-auto">
              <span className="text-[#06B6D4] font-bold">FLOOR:</span> {activeMaterial.name} • {floorAreaSqFt} sq ft
            </div>
          </div>

          {/* Interactive Visualizer Canvas / Render Preview */}
          <div className="flex-1 relative flex items-center justify-center p-6 bg-gradient-to-b from-[#181C24] to-[#0E1116] overflow-hidden">
            {/* Architectural Room Perspective Rendering */}
            <div className="relative w-full h-full max-w-2xl max-h-[480px] rounded-xl overflow-hidden border border-[#28303F] shadow-2xl flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
                alt="Room rendering"
                className="w-full h-full object-cover"
                style={{
                  filter:
                    lightingPreset === 'evening'
                      ? 'sepia(0.2) saturate(1.2) contrast(1.05)'
                      : lightingPreset === 'morning'
                      ? 'brightness(1.1) saturate(1.1)'
                      : 'brightness(1.15) contrast(1.1)',
                }}
              />

              {/* Overlay Material Texture Tint */}
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-40 pointer-events-none mix-blend-color-burn"
                style={{ backgroundColor: activeMaterial.color }}
              />

              {/* Dynamic Plane Annotation Callout */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/85 backdrop-blur border border-[#06B6D4] rounded-lg shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping"></span>
                <span className="text-xs font-mono text-white font-bold">
                  SURF_FLR_01: {activeMaterial.name} ({activeMaterial.scratchIndex})
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Lighting Engine Quick Switcher */}
          <div className="px-4 py-3 bg-[#181C24] border-t border-[#28303F] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Sun className="w-4 h-4 text-[#F59E0B]" />
              <span>LIGHTING ENGINE:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLightingPreset('morning')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                  lightingPreset === 'morning'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                <span>Morning (3200K)</span>
              </button>

              <button
                onClick={() => setLightingPreset('noon')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                  lightingPreset === 'noon'
                    ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/50 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                <span>Noon (5600K)</span>
              </button>

              <button
                onClick={() => setLightingPreset('evening')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 ${
                  lightingPreset === 'evening'
                    ? 'bg-[#E5855E]/20 text-[#E5855E] border border-[#E5855E]/50 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#E5855E]"></span>
                <span>Evening (2700K)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Material Inspector */}
        <div className="w-full xl:w-84 shrink-0 flex flex-col gap-4">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3.5 shadow-md flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">ACTIVE MATERIAL INSPECTOR</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#06B6D4]/20 text-[#06B6D4] font-bold rounded">
                LIVE FOCUS
              </span>
            </div>

            {/* High-res Swatch & Origin */}
            <div className="relative h-32 rounded-xl overflow-hidden border border-[#28303F] shadow-inner flex flex-col justify-end p-3">
              <div
                className="absolute inset-0"
                style={{ backgroundColor: activeMaterial.color }}
              />
              <div className="relative z-10 bg-black/75 backdrop-blur p-2 rounded-lg">
                <div className="text-xs font-bold font-mono text-white">{activeMaterial.name}</div>
                <div className="text-[10px] font-mono text-slate-300">
                  Origin: {activeMaterial.origin}
                </div>
              </div>
            </div>

            {/* Active Texture Maps */}
            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">ACTIVE MAPS</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-[#06B6D4]/10 text-[#06B6D4] text-[10px] font-mono font-bold rounded border border-[#06B6D4]/30">
                  Albedo
                </span>
                <span className="px-2 py-0.5 bg-[#06B6D4]/10 text-[#06B6D4] text-[10px] font-mono font-bold rounded border border-[#06B6D4]/30">
                  Rough
                </span>
                <span className="px-2 py-0.5 bg-[#06B6D4]/10 text-[#06B6D4] text-[10px] font-mono font-bold rounded border border-[#06B6D4]/30">
                  Normal
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-auto">4096 px²</span>
              </div>
            </div>

            {/* Physical Specifications */}
            <div className="border-t border-[#28303F] pt-3 flex flex-col gap-2.5">
              <div className="text-[9px] font-mono text-slate-400 uppercase">PHYSICAL SPECIFICATIONS</div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#14171D] p-2 rounded border border-[#28303F]">
                  <span className="text-[9px] text-slate-400 block">ROUGHNESS (PBR)</span>
                  <span className="font-bold text-white mt-0.5 block">{activeMaterial.roughness} Satin</span>
                </div>
                <div className="bg-[#14171D] p-2 rounded border border-[#28303F]">
                  <span className="text-[9px] text-slate-400 block">NORMAL DEPTH</span>
                  <span className="font-bold text-white mt-0.5 block">{activeMaterial.normalDepthMm} mm Relief</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#14171D] p-2 rounded border border-[#28303F]">
                  <span className="text-[9px] text-slate-400 block">WARRANTY</span>
                  <span className="font-bold text-white mt-0.5 block text-[10px] truncate">{activeMaterial.warranty}</span>
                </div>
                <div className="bg-[#14171D] p-2 rounded border border-[#28303F]">
                  <span className="text-[9px] text-slate-400 block">SLIP RESISTANCE</span>
                  <span className="font-bold text-emerald-400 mt-0.5 block text-[10px]">{activeMaterial.slipResistance}</span>
                </div>
              </div>
            </div>

            {/* Surface Calculation Card */}
            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-3 flex flex-col gap-2 font-mono">
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>SURFACE CALCULATION</span>
                <span className="text-[#06B6D4]">Room Mesh: R-102</span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-bold text-white">{floorAreaSqFt}</span>
                  <span className="text-[10px] text-slate-400 ml-1">SQ FT AREA</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[#E5855E]">
                    {currencySymbol}{totalCost.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    incl. {wasteFactorPercent}% waste cut
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-[#28303F] pt-2">
                <span>Rate: {currencySymbol}{activeMaterial.pricePerSqFt.toFixed(2)}/sq ft</span>
                <span className="text-[#06B6D4]">Lead: 3-5 Days</span>
              </div>
            </div>

            {/* Tactile Sample Box Card */}
            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold font-mono text-white">Tactile Sample Box</div>
                  <div className="text-[10px] text-slate-400">3 Real Swatches + Curated Finishes</div>
                </div>
              </div>
              <button
                onClick={() => alert(`Tactile Sample Box ($20) ordered with swatches of ${activeMaterial.name}. Sent to studio address!`)}
                className="px-2.5 py-1 bg-[#F59E0B] hover:bg-[#d98b0a] text-black text-xs font-mono font-bold rounded"
              >
                {currencySymbol}20 Box
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={handleApplyTo3D}
                className="w-full py-3 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                {appliedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Applied to 3D Scene!</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Apply All to 3D Scene</span>
                  </>
                )}
              </button>

              <button
                onClick={handleAddToBoQ}
                className="w-full py-2 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] text-xs font-mono text-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Add Finishes to Project BoQ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
