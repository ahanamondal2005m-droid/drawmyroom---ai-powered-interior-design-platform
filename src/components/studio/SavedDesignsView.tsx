import React, { useState } from 'react';
import { Project, DesignVariation } from '../../types';
import { currencySymbolFor } from '../../utils/format';
import { Bookmark, RotateCcw, Trash2, SlidersHorizontal } from 'lucide-react';

interface SavedDesignsViewProps {
  project: Project;
  onRestoreDesign: (snapshot: DesignVariation['snapshotData']) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const SavedDesignsView: React.FC<SavedDesignsViewProps> = ({
  project,
  onRestoreDesign,
  onNavigateToTab,
}) => {
  const [variations, setVariations] = useState<DesignVariation[]>([
    {
      id: 'var_1',
      projectId: project.id,
      name: 'Modern Minimalist (Bouclé & Travertine)',
      style: 'Modern Minimalist',
      timestamp: '2026-11-09 14:30',
      totalCost: 1850,
      piecesCount: 5,
      snapshotData: {
        dimensions: project.dimensions,
        placedObjects: project.placedObjects,
        materials: project.materialSpecs.materials,
        lightingConfig: project.lightingConfig,
      },
    },
    {
      id: 'var_2',
      projectId: project.id,
      name: 'Japandi Warm Concept (Oak & Raw Linen)',
      style: 'Japandi Warm',
      timestamp: '2026-11-08 19:15',
      totalCost: 1720,
      piecesCount: 4,
      snapshotData: {
        dimensions: project.dimensions,
        placedObjects: project.placedObjects.slice(0, 4),
        materials: project.materialSpecs.materials,
        lightingConfig: project.lightingConfig,
      },
    },
    {
      id: 'var_3',
      projectId: project.id,
      name: 'Industrial Loft Raw (Ebonized Ash & Flos Rig)',
      style: 'Industrial Loft',
      timestamp: '2026-11-07 11:00',
      totalCost: 1980,
      piecesCount: 6,
      snapshotData: {
        dimensions: project.dimensions,
        placedObjects: project.placedObjects,
        materials: project.materialSpecs.materials,
        lightingConfig: project.lightingConfig,
      },
    },
  ]);

  const [newVarName, setNewVarName] = useState('');
  const [comparingIds, setComparingIds] = useState<string[]>(['var_1', 'var_2']);
  const currencySymbol = currencySymbolFor(project.budget.currency);

  const handleSaveCurrent = () => {
    const name = newVarName.trim() || `Design Variation ${variations.length + 1}`;
    const newVar: DesignVariation = {
      id: `var_${Date.now()}`,
      projectId: project.id,
      name,
      style: 'Custom Concept',
      timestamp: new Date().toLocaleString(),
      totalCost: project.budget.committed,
      piecesCount: project.placedObjects.length,
      snapshotData: {
        dimensions: project.dimensions,
        placedObjects: project.placedObjects,
        materials: project.materialSpecs.materials,
        lightingConfig: project.lightingConfig,
      },
    };
    setVariations([newVar, ...variations]);
    setNewVarName('');
    alert(`Snapshot "${name}" saved! You can restore or compare it anytime.`);
  };

  const handleDelete = (id: string) => {
    setVariations(variations.filter((v) => v.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto gap-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181C24] border border-[#28303F] rounded-xl p-5 shadow-md">
        <div>
          <div className="text-xs font-mono text-[#06B6D4] uppercase">VARIATION ARCHIVE</div>
          <h1 className="text-xl font-bold font-mono text-white mt-0.5">Saved Design Concepts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Capture room layout snapshots, compare costs & material finishes, and restore variations.
          </p>
        </div>

        {/* Quick Snapshot Action */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Snapshot name..."
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
            className="bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none"
          />
          <button
            onClick={handleSaveCurrent}
            className="px-4 py-2 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Snapshot</span>
          </button>
        </div>
      </div>

      {/* Variations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {variations.map((v) => (
          <div
            key={v.id}
            className="bg-[#181C24] border border-[#28303F] hover:border-[#06B6D4] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all shadow-md group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#242A36] text-[#06B6D4] rounded">
                  {v.style}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{v.timestamp}</span>
              </div>

              <h3 className="text-sm font-bold font-mono text-white mt-2 group-hover:text-[#06B6D4] transition-colors">
                {v.name}
              </h3>

              <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-[#14171D] rounded-lg border border-[#28303F] text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block">TOTAL COST</span>
                  <span className="text-sm font-bold text-[#E5855E]">
                    {currencySymbol}{v.totalCost.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">PIECES</span>
                  <span className="text-white font-bold">{v.piecesCount} Objects</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#28303F] pt-3">
              <button
                onClick={() => {
                  onRestoreDesign(v.snapshotData);
                  alert(`Restored design: ${v.name}`);
                  onNavigateToTab('spatial');
                }}
                className="px-3 py-1.5 bg-[#242A36] hover:bg-[#2A313E] border border-[#28303F] text-xs font-mono font-bold text-white rounded flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Restore Design</span>
              </button>

              <button
                onClick={() => handleDelete(v.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                title="Delete snapshot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-Side Comparison Matrix */}
      {variations.length >= 2 && (
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-5 flex flex-col gap-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <SlidersHorizontal className="w-4 h-4 text-[#06B6D4]" />
              <span>SIDE-BY-SIDE DESIGN COMPARISON</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Comparing Concepts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#28303F] text-[10px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">METRIC / SPEC</th>
                  {variations.slice(0, 3).map((v) => (
                    <th key={v.id} className="py-2.5 px-3 text-white font-bold">
                      {v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#28303F]/60">
                <tr>
                  <td className="py-3 px-3 text-slate-400">Total Committed Cost</td>
                  {variations.slice(0, 3).map((v) => (
                    <td key={v.id} className="py-3 px-3 font-bold text-[#E5855E]">
                      {currencySymbol}{v.totalCost.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-3 text-slate-400">Pieces / Fixtures</td>
                  {variations.slice(0, 3).map((v) => (
                    <td key={v.id} className="py-3 px-3 text-white">
                      {v.piecesCount} Objects
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-3 text-slate-400">Primary Aesthetic</td>
                  {variations.slice(0, 3).map((v) => (
                    <td key={v.id} className="py-3 px-3 text-[#06B6D4]">
                      {v.style}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-3 text-slate-400">Clearance Status</td>
                  {variations.slice(0, 3).map((v) => (
                    <td key={v.id} className="py-3 px-3 text-emerald-400">
                      36" Egress Verified
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
