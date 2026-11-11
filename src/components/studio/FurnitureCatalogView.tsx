import React, { useState } from 'react';
import { Project, CatalogItem } from '../../types';
import { currencySymbolFor } from '../../utils/format';
import { CATALOG_ITEMS } from '../../data/mockData';
import {
  Search,
  CheckCircle,
  Check,
  Box,
  ArrowRight,
  Filter,
  Info,
} from 'lucide-react';

interface FurnitureCatalogViewProps {
  project: Project;
  onPlaceCatalogItem: (item: CatalogItem) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const FurnitureCatalogView: React.FC<FurnitureCatalogViewProps> = ({
  project,
  onPlaceCatalogItem,
  onNavigateToTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Seating');
  const [budgetSlider, setBudgetSlider] = useState<number>(1300);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([
    'CB2 Contract',
    'Muuto Studio',
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stagedItems, setStagedItems] = useState<CatalogItem[]>([]);

  const currencySymbol = currencySymbolFor(project.budget.currency);

  const categories = [
    { name: 'All Seating', count: 42 },
    { name: 'Tables & Desks', count: 28 },
    { name: 'Lighting (Architectural)', count: 19 },
    { name: 'Rugs & Textiles', count: 14 },
    { name: 'Storage & Media', count: 22 },
  ];

  const vendors = [
    { name: 'CB2 Contract', count: 58 },
    { name: 'Muuto Studio', count: 32 },
    { name: 'Herman Miller', count: 19 },
    { name: 'Hay Copenhagen', count: 24 },
    { name: 'West Elm Workspace', count: 36 },
  ];

  const functionalTags = [
    'Pet-Friendly Fabric',
    'ADA Compliant',
    'FSC Certified Wood',
    'Contract Grade',
  ];

  const toggleVendor = (vendor: string) => {
    if (selectedVendors.includes(vendor)) {
      setSelectedVendors(selectedVendors.filter((v) => v !== vendor));
    } else {
      setSelectedVendors([...selectedVendors, vendor]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Filter Catalog
  const filteredItems = CATALOG_ITEMS.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedCategory && item.category !== selectedCategory) {
      return false;
    }

    if (item.price > budgetSlider) {
      return false;
    }

    if (selectedVendors.length > 0 && !selectedVendors.includes(item.vendor)) {
      return false;
    }

    if (selectedTags.length > 0 && !selectedTags.some((t) => item.tags.includes(t))) {
      return false;
    }

    return true;
  });

  const handleStageItem = (item: CatalogItem) => {
    if (!stagedItems.some((i) => i.id === item.id)) {
      setStagedItems([...stagedItems, item]);
    }
    onPlaceCatalogItem(item);
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto gap-4">
      {/* Top Header & Envelope Constraint Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#181C24] border border-[#28303F] rounded-xl p-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#06B6D4]">
            <span>PARAMETRIC SOURCING SUITE</span>
            <span className="text-slate-500">•</span>
            <span>
              Envelope Constrained: {project.dimensions.lengthFt}' × {project.dimensions.widthFt}' × {project.dimensions.ceilingHeightFt}'
            </span>
          </div>
          <h1 className="text-xl font-bold font-mono text-white mt-0.5">
            Curated Architectural Catalog
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#14171D] border border-[#06B6D4]/40 rounded-lg text-xs font-mono text-[#06B6D4]">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <span>Live Spatial Clearance Verification</span>
            <span className="text-slate-500">|</span>
            <span className="text-white font-semibold">36" Walkways Enforced</span>
          </div>
        </div>
      </div>

      {/* Main Content: Left Filter Panel + Right Catalog Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4">
        {/* Left Filter Sidebar */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
          {/* 1. Room Envelope Lock */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                <Box className="w-4 h-4 text-[#06B6D4]" />
                <span>Room Envelope Lock</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#06B6D4]/20 text-[#06B6D4] font-bold rounded">
                LOCKED
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              Max bounds dynamically set to loft boundary buffer (North wall clearance: 12.4 ft).
            </p>

            <div className="grid grid-cols-3 gap-2 bg-[#14171D] p-2.5 rounded-lg border border-[#28303F] text-center font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block">X (MAX)</span>
                <span className="text-xs font-bold text-white">188 in</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">Y (MAX)</span>
                <span className="text-xs font-bold text-white">64 in</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">Z (MAX)</span>
                <span className="text-xs font-bold text-white">38 in</span>
              </div>
            </div>
          </div>

          {/* 2. Budget Cap Slider */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">ITEM BUDGET CAP</span>
              <span className="text-[#F59E0B] font-bold">
                {currencySymbol}{budgetSlider.toLocaleString()}
              </span>
            </div>

            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={budgetSlider}
              onChange={(e) => setBudgetSlider(parseInt(e.target.value, 10))}
              className="w-full accent-[#E5855E] cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{currencySymbol}100</span>
              <span>{currencySymbol}2,000</span>
            </div>
          </div>

          {/* 3. Design Houses & Retailers */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-2.5 shadow-md">
            <div className="text-xs font-mono font-bold text-slate-200">
              DESIGN HOUSES & RETAILERS
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {vendors.map((vendor) => (
                <label
                  key={vendor.name}
                  onClick={() => toggleVendor(vendor.name)}
                  className="flex items-center justify-between text-xs font-mono text-slate-300 hover:text-white cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selectedVendors.includes(vendor.name)
                          ? 'bg-[#06B6D4] border-[#06B6D4] text-black'
                          : 'border-[#3B4559] bg-[#14171D]'
                      }`}
                    >
                      {selectedVendors.includes(vendor.name) && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{vendor.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">{vendor.count}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Functional Tags */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-2.5 shadow-md">
            <div className="text-xs font-mono font-bold text-slate-200">FUNCTIONAL TAGS</div>

            <div className="flex flex-wrap gap-1.5 mt-1">
              {functionalTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#06B6D4] font-bold'
                      : 'bg-[#14171D] border-[#28303F] text-slate-400 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Catalog Main Area */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Search bar & Category filter pills */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog... (Modular sofa, travertine plinth, luminaire, bouclé...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181C24] border border-[#28303F] focus:border-[#06B6D4] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                    selectedCategory === cat.name
                      ? 'bg-[#E5855E] text-white font-bold shadow'
                      : 'bg-[#181C24] border border-[#28303F] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#181C24] border border-[#28303F] hover:border-[#06B6D4] rounded-xl overflow-hidden flex flex-col transition-all group shadow-md"
              >
                {/* Image Banner */}
                <div className="relative h-44 w-full bg-[#14171D] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Top Clearance badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/75 backdrop-blur rounded text-[9px] font-mono text-[#06B6D4]">
                    <CheckCircle className="w-3 h-3 text-[#06B6D4]" />
                    <span>Fit Score: {item.fitScore}%</span>
                  </div>

                  {/* Vendor tag */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/75 backdrop-blur rounded text-[9px] font-mono text-slate-200">
                    {item.vendor}
                  </div>

                  {/* Dimension overlay badge */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/85 backdrop-blur rounded text-[9px] font-mono text-slate-300">
                    DIM: {item.dimensions.lengthIn}"W × {item.dimensions.widthIn}"D × {item.dimensions.heightIn}"H
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold font-mono text-white group-hover:text-[#06B6D4] transition-colors">
                        {item.name}
                      </h3>
                      <div className="text-sm font-bold font-mono text-[#E5855E] shrink-0">
                        {currencySymbol}{item.price.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      SKU: {item.sku} • Lead: {item.leadTime}
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleStageItem(item)}
                    className="w-full py-2 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Stage in 3D</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Staging Tray (Matching Screenshot 3 footer) */}
      <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase">
            STAGING TRAY ({project.placedObjects.length} Selected)
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm">
            {project.placedObjects.slice(0, 5).map((obj) => (
              <div
                key={obj.id}
                title={obj.name}
                className="w-8 h-8 rounded bg-[#242A36] border border-[#28303F] flex items-center justify-center text-[10px] font-mono text-white font-bold shrink-0"
              >
                {obj.name[0]}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-mono text-emerald-400">Envelope Cleared</span>
          </div>

          <div className="text-xs font-mono">
            <span className="text-slate-400">STAGED ALLOCATION: </span>
            <span className="text-white font-bold">
              {currencySymbol}{project.budget.committed.toLocaleString()} / {currencySymbol}{project.budget.totalCap.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => onNavigateToTab('estimates')}
            className="px-3.5 py-1.5 bg-[#242A36] hover:bg-[#2A313E] border border-[#28303F] text-xs font-mono text-white rounded-lg transition-colors"
          >
            Generate BoQ
          </button>

          <button
            onClick={() => onNavigateToTab('spatial')}
            className="px-4 py-1.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow"
          >
            <span>Push to 3D Canvas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
