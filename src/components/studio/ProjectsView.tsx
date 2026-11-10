import React, { useState } from 'react';
import { Project, RoomDimensions } from '../../types';
import {
  FolderPlus,
  Trash2,
  Copy,
  Edit,
  Box,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (projectData: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onNavigateToTab,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRoomType, setNewRoomType] = useState('Living Room');
  const [newLength, setNewLength] = useState(18);
  const [newWidth, setNewWidth] = useState(14);
  const [newHeight, setNewHeight] = useState(10);
  const [newBudget, setNewBudget] = useState(2500);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    onCreateProject({
      name: newTitle,
      roomType: newRoomType,
      dimensions: {
        lengthFt: newLength,
        widthFt: newWidth,
        ceilingHeightFt: newHeight,
        unit: 'ft',
      },
      budget: {
        totalCap: newBudget,
        committed: 0,
        currency: 'USD',
      },
    });

    setShowCreateModal(false);
    setNewTitle('');
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181C24] border border-[#28303F] rounded-xl p-5 shadow-md">
        <div>
          <div className="text-xs font-mono text-[#06B6D4] uppercase">PROJECT PORTFOLIO</div>
          <h1 className="text-xl font-bold font-mono text-white mt-0.5">My Room Design Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your saved room layouts, dimensions, budget allocations, and spatial plans.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Room Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const area = proj.dimensions.lengthFt * proj.dimensions.widthFt;
          const currencySymbol = proj.budget.currency === 'INR' ? '₹' : '$';

          return (
            <div
              key={proj.id}
              className={`bg-[#181C24] border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all shadow-md ${
                isActive
                  ? 'border-[#E5855E] ring-1 ring-[#E5855E]/50'
                  : 'border-[#28303F] hover:border-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#242A36] text-[#06B6D4] rounded">
                    {proj.roomType}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-mono text-[#E5855E] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ACTIVE
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold font-mono text-white mt-2">
                  {proj.name}
                </h3>

                <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-[#14171D] rounded-lg border border-[#28303F] text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block">DIMENSIONS</span>
                    <span className="text-white font-bold">
                      {proj.dimensions.lengthFt}' × {proj.dimensions.widthFt}'
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">USABLE AREA</span>
                    <span className="text-[#06B6D4] font-bold">{area} sq ft</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">BUDGET CAP</span>
                    <span className="text-[#F59E0B] font-bold">
                      {currencySymbol}{proj.budget.totalCap.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">OBJECTS</span>
                    <span className="text-emerald-400 font-bold">{proj.placedObjects.length} Pieces</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-[#28303F] pt-3">
                <button
                  onClick={() => {
                    onSelectProject(proj.id);
                    onNavigateToTab('spatial');
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-[#E5855E] text-white shadow'
                      : 'bg-[#242A36] hover:bg-[#2A313E] text-slate-200'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Open in Editor</span>
                </button>

                {projects.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${proj.name}"?`)) {
                        onDeleteProject(proj.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: New Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-sm font-mono font-bold text-white mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#06B6D4]" /> Create New Room Project
            </h3>

            <form onSubmit={handleCreate} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-slate-300">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bedroom Sanctuary"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">Room Type</label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-1.5 text-white"
                >
                  <option value="Living Room">Living Room</option>
                  <option value="Master Bedroom">Master Bedroom</option>
                  <option value="Open Kitchen / Dining">Open Kitchen / Dining</option>
                  <option value="Home Studio / Office">Home Studio / Office</option>
                  <option value="Loft Apartment">Loft Apartment</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Length (ft)</label>
                  <input
                    type="number"
                    min="8"
                    max="60"
                    value={newLength}
                    onChange={(e) => setNewLength(parseInt(e.target.value, 10) || 18)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Width (ft)</label>
                  <input
                    type="number"
                    min="8"
                    max="60"
                    value={newWidth}
                    onChange={(e) => setNewWidth(parseInt(e.target.value, 10) || 14)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Height (ft)</label>
                  <input
                    type="number"
                    min="7"
                    max="20"
                    value={newHeight}
                    onChange={(e) => setNewHeight(parseInt(e.target.value, 10) || 10)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-2 py-1 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300">Budget Cap ($ / ₹)</label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={newBudget}
                  onChange={(e) => setNewBudget(parseInt(e.target.value, 10) || 2500)}
                  className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#28303F]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#E5855E] hover:bg-[#D2714A] text-white font-bold rounded"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
