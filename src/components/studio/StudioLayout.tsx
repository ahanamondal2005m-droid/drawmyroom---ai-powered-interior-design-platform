import React, { useState } from 'react';
import { Project, UserProfile } from '../../types';
import {
  Box,
  Layers,
  Sparkles,
  Sun,
  FileText,
  Home,
  FolderKanban,
  Bookmark,
  Users,
  Settings,
  ChevronDown,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Plus,
} from 'lucide-react';

interface StudioLayoutProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  projects: Project[];
  activeProject: Project;
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  user: UserProfile;
  onLogout: () => void;
  onReturnToPublic: () => void;
  children: React.ReactNode;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({
  currentTab,
  onSelectTab,
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  user,
  onLogout,
  onReturnToPublic,
  children,
}) => {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currencySymbol = activeProject.budget.currency === 'INR' ? '₹' : '$';
  const committedPercent = Math.min(
    100,
    Math.round((activeProject.budget.committed / activeProject.budget.totalCap) * 100)
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, section: 'GENERAL' },
    { id: 'spatial', label: 'Spatial Editor (2D/3D)', icon: Box, section: 'SPATIAL WORKSPACE' },
    { id: 'catalog', label: 'Furniture Catalog', icon: Layers, section: 'SPATIAL WORKSPACE' },
    { id: 'materials', label: 'Materials Studio', icon: Sparkles, section: 'SPATIAL WORKSPACE' },
    { id: 'lighting', label: 'Lighting Simulation', icon: Sun, section: 'SPATIAL WORKSPACE' },
    { id: 'estimates', label: 'Estimates & BoQ Specs', icon: FileText, section: 'SPATIAL WORKSPACE' },
    { id: 'projects', label: 'My Projects', icon: FolderKanban, section: 'MANAGEMENT' },
    { id: 'designs', label: 'Saved Designs', icon: Bookmark, section: 'MANAGEMENT' },
    { id: 'designers', label: 'Designer Connect', icon: Users, section: 'MANAGEMENT' },
    { id: 'settings', label: 'Settings', icon: Settings, section: 'MANAGEMENT' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#14171D] text-slate-100 font-sans">
      {/* ======================================================== */}
      {/* LEFT NAVIGATION SIDEBAR (Matching Screenshot 2) */}
      {/* ======================================================== */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#14171D] border-r border-[#28303F] flex flex-col justify-between transition-transform duration-200 select-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Top */}
        <div className="p-4 border-b border-[#28303F] flex items-center justify-between">
          <div
            onClick={onReturnToPublic}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E5855E] to-[#F59E0B] flex items-center justify-center text-black shadow group-hover:scale-105 transition-transform">
              <Box className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold font-mono text-sm tracking-tight text-white">
                  DrawMyRoom
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[#E5855E] text-black rounded">
                  STUDIO
                </span>
              </div>
              <div className="text-[8px] font-mono tracking-widest text-slate-400 uppercase -mt-0.5">
                ARCHITECTURAL SUITE
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
          {/* Spatial Workspace Section */}
          <div>
            <div className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              SPATIAL WORKSPACE
            </div>
            <div className="flex flex-col gap-1">
              {navItems
                .filter((item) => item.section === 'SPATIAL WORKSPACE')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                        isActive
                          ? 'bg-[#181C24] text-[#E5855E] font-bold border-l-2 border-[#E5855E] shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#181C24]/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#E5855E]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* General & Management Section */}
          <div>
            <div className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              MANAGEMENT
            </div>
            <div className="flex flex-col gap-1">
              {navItems
                .filter((item) => item.section !== 'SPATIAL WORKSPACE')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                        isActive
                          ? 'bg-[#181C24] text-[#E5855E] font-bold border-l-2 border-[#E5855E] shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#181C24]/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#E5855E]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: WebGL Core Status Bar (Matching Screenshot 2) */}
        <div className="p-3 border-t border-[#28303F] bg-[#14171D] font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-[#06B6D4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
              WEBGL CORE 3.4
            </span>
            <span className="text-slate-500">60 FPS</span>
          </div>

          <div className="mt-1 flex items-center justify-between text-slate-500 text-[9px]">
            <span>VRAM Allocated</span>
            <span>2.4 / 4.0 GB</span>
          </div>

          <div className="w-full h-1 bg-[#242A36] rounded-full overflow-hidden mt-1">
            <div className="h-full bg-[#06B6D4] w-3/5" />
          </div>

          <button
            onClick={onReturnToPublic}
            className="w-full mt-3 py-1.5 px-2 bg-[#181C24] hover:bg-[#242A36] text-slate-400 hover:text-white rounded border border-[#28303F] flex items-center justify-center gap-1.5 text-[10px] transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-[#06B6D4]" />
            <span>Public Website</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA & TOPBAR */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Architectural Header Bar (Matching Screenshot 2) */}
        <header className="h-14 bg-[#14171D] border-b border-[#28303F] px-4 flex items-center justify-between gap-4 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active Project Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#181C24] hover:bg-[#242A36] border border-[#28303F] rounded-lg text-xs font-mono text-white transition-colors"
              >
                <Box className="w-3.5 h-3.5 text-[#E5855E]" />
                <span className="font-bold">{activeProject.name}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  {activeProject.dimensions.lengthFt} × {activeProject.dimensions.widthFt} ft
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-[#181C24] border border-[#28303F] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 font-mono text-xs">
                  <div className="px-2 py-1 text-[10px] text-slate-500 uppercase">
                    SWITCH PROJECT
                  </div>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProject(p.id);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                        p.id === activeProject.id
                          ? 'bg-[#E5855E]/20 text-[#E5855E] font-bold'
                          : 'text-slate-300 hover:bg-[#242A36]'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500">{p.roomType}</span>
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      setProjectDropdownOpen(false);
                      onOpenNewProjectModal();
                    }}
                    className="w-full mt-1 pt-1.5 border-t border-[#28303F] px-2.5 py-1.5 text-left text-[#06B6D4] hover:bg-[#242A36] rounded flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Room</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Indicators */}
          <div className="flex items-center gap-4">
            {/* Studio Budget Gauge (Matching Screenshot 2) */}
            <div
              onClick={() => onSelectTab('estimates')}
              className="hidden sm:flex items-center gap-2.5 px-3 py-1 bg-[#181C24] border border-[#28303F] rounded-lg cursor-pointer hover:border-[#F59E0B] transition-colors font-mono text-xs"
              title="Click to view full Bill of Quantities"
            >
              <span className="text-[10px] text-slate-400">STUDIO BUDGET</span>
              <span className="text-white font-bold">
                {currencySymbol}{activeProject.budget.committed.toLocaleString()}
              </span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">
                {currencySymbol}{activeProject.budget.totalCap.toLocaleString()}
              </span>
              <div className="w-12 h-1.5 bg-[#14171D] rounded-full overflow-hidden ml-1">
                <div
                  className="h-full bg-[#E5855E]"
                  style={{ width: `${committedPercent}%` }}
                />
              </div>
            </div>

            {/* Coral Action Button: Render in 3D */}
            <button
              onClick={() => onSelectTab('spatial')}
              className="px-3.5 py-1.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Render in 3D</span>
            </button>

            {/* User Avatar & Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-full bg-[#242A36] border border-[#28303F] flex items-center justify-center text-xs font-mono font-bold text-white hover:border-[#E5855E] transition-colors"
                title={user.name}
              >
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-[#181C24] border border-[#28303F] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 font-mono text-xs">
                  <div className="px-3 py-2 border-b border-[#28303F]">
                    <div className="font-bold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                    <div className="text-[9px] text-[#06B6D4] mt-0.5">{user.role}</div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#242A36] rounded text-slate-300"
                  >
                    Settings & Preferences
                  </button>

                  <button
                    onClick={() => {
                      onReturnToPublic();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#242A36] rounded text-slate-300"
                  >
                    Public Website
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#242A36] rounded text-red-400 flex items-center gap-1.5 mt-1 border-t border-[#28303F] pt-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content Slot */}
        <main className="flex-1 overflow-hidden flex flex-col bg-[#14171D]">
          {children}
        </main>
      </div>
    </div>
  );
};
