import React, { useState } from 'react';
import { Project } from '../../types';
import {
  FileText,
  ShieldCheck,
  Truck,
  Clock,
  Search,
  Filter,
  DollarSign,
  Download,
  Sparkles,
  ArrowRight,
  Send,
  Layers,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { valueEngineer } from '../../../local-engine/valueEngineer';
import { computeClearanceConflicts } from '../../../local-engine/clearance';
import { CATALOG_ITEMS } from '../../data/mockData';

interface EstimatesBoQViewProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const EstimatesBoQView: React.FC<EstimatesBoQViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToTab,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeFilterCat, setActiveFilterCat] = useState<'All' | 'Furniture' | 'Luminaires' | 'Surfaces'>('All');
  const [valueEngineeredActive, setValueEngineeredActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<'high' | 'low'>('high');

  const currencySymbol = project.budget.currency === 'INR' ? '₹' : '$';

  // Local value engineering: cheaper same-footprint catalog substitutions,
  // computed in-process by the local engine — deterministic, no API.
  const veRec = valueEngineer({
    items: project.placedObjects.map((o) => ({
      id: o.id,
      name: o.name,
      category: o.category,
      modelType: o.modelType,
      price: o.price,
      dimensions: { lengthIn: o.dimensions.lengthIn, widthIn: o.dimensions.widthIn },
      leadTime: CATALOG_ITEMS.find((c) => c.id === o.catalogId)?.leadTime,
      vendor: o.vendor,
    })),
    currentTotal: project.placedObjects.reduce((acc, o) => acc + o.price, 0),
    budgetCap: project.budget.totalCap,
    catalog: CATALOG_ITEMS,
  });

  const activeAlt = valueEngineeredActive && veRec.alternatives.length > 0 ? veRec.alternatives[0] : null;
  const activeAltItem = activeAlt ? CATALOG_ITEMS.find((c) => c.name === activeAlt.alternative) : undefined;

  // Map project placed objects into BoQ line items (applying the active
  // value-engineered substitution to the displayed row when toggled on)
  const boqItems = project.placedObjects.map((obj, index) => {
    const swapped = !!(activeAlt && activeAltItem && obj.name === activeAlt.current);
    const src = swapped ? activeAltItem! : obj;
    return {
      index: (index + 1).toString().padStart(2, '0'),
      id: obj.id,
      catalogId: swapped ? activeAltItem!.id : obj.catalogId,
      name: swapped ? activeAlt!.alternative : obj.name,
      material: swapped ? activeAltItem!.material : obj.material,
      dimensions: `${src.dimensions.lengthIn}" × ${src.dimensions.widthIn}" × ${src.dimensions.heightIn}"`,
      vendor: swapped ? activeAltItem!.vendor : obj.vendor || 'Contract Sourced',
      category: obj.category,
      qty: 1,
      unitPrice: swapped ? activeAltItem!.price : obj.price,
      totalPrice: swapped ? activeAltItem!.price : obj.price,
      optimized: swapped,
    };
  });

  const subtotal = boqItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalCap = project.budget.totalCap;
  const committedPercent = totalCap > 0 ? Math.round((subtotal / totalCap) * 100) : 0;
  const bufferRemaining = totalCap - subtotal;

  // Live clearance verification via the local engine (grid circulation
  // analysis over the actual placed objects).
  const clearance = computeClearanceConflicts(
    project.dimensions,
    project.placedObjects,
    project.clearanceSettings.egressPathInches
  );
  const conflictCount = project.placedObjects.filter((o) => clearance.conflicts[o.id]?.conflict).length;

  // Volumetric cost share by category (drives the donut breakdown)
  const costShare = [
    { label: 'Seating Architecture', color: '#E5855E', cats: ['All Seating', 'Seating'] },
    { label: 'Tables & Desks', color: '#06B6D4', cats: ['Tables & Desks'] },
    { label: 'Luminaires & Ambience', color: '#F59E0B', cats: ['Lighting', 'Lighting (Architectural)'] },
    { label: 'Storage & Textiles', color: '#64748B', cats: ['Storage & Media', 'Rugs & Textiles'] },
  ].map((g) => {
    const amount = boqItems.filter((i) => g.cats.includes(i.category)).reduce((a, i) => a + i.totalPrice, 0);
    return { ...g, amount, pct: subtotal > 0 ? Math.round((amount / subtotal) * 100) : 0 };
  });

  // Procurement window from catalog lead times of the displayed rows
  // (catalogId first — staged rows resolve exactly; name as legacy fallback)
  const leadDays = boqItems
    .map((i) => {
      const cat = CATALOG_ITEMS.find((c) => c.id === i.catalogId) ?? CATALOG_ITEMS.find((c) => c.name === i.name);
      if (!cat?.leadTime) return null;
      if (/ready to ship|in stock/i.test(cat.leadTime)) return 1;
      const m = cat.leadTime.match(/(\d+)\s*[-–]?\s*(\d+)?/i);
      if (!m) return null;
      const lo = parseInt(m[1], 10);
      const hi = m[2] ? parseInt(m[2], 10) : lo;
      return (lo + hi) / 2;
    })
    .filter((d): d is number => d != null);
  const fastestLead = leadDays.length > 0 ? Math.min(...leadDays) : null;
  const slowestLead = leadDays.length > 0 ? Math.max(...leadDays) : null;

  // Filtered rows
  const filteredBoq = boqItems.filter((item) => {
    if (activeFilterCat === 'Furniture' && !['Seating', 'All Seating', 'Tables & Desks', 'Storage & Media'].includes(item.category)) {
      return false;
    }
    if (activeFilterCat === 'Luminaires' && !['Lighting', 'Lighting (Architectural)'].includes(item.category)) {
      return false;
    }
    if (activeFilterCat === 'Surfaces' && !['Rugs & Textiles', 'Flooring', 'Wall Finish'].includes(item.category)) {
      return false;
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export handlers
  const handleExportPDF = () => {
    alert(`Exporting official Bill of Quantities (BoQ) PDF for project: ${project.name}.\nIncludes itemized specs, line drawings, material certifications, and B2B pricing.`);
  };

  const handleExportCSV = () => {
    const headers = 'Item#,Specification,Dimensions,Vendor,Qty,UnitPrice,Total\n';
    const rows = boqItems
      .map((i) => `"${i.index}","${i.name}","${i.dimensions}","${i.vendor}",${i.qty},${i.unitPrice},${i.totalPrice}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DrawMyRoom_BoQ_${project.id}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto gap-4">
      {/* Top 4 KPI Metrics Header Cards (Matching Screenshot 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Allocated Budget */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>TOTAL ALLOCATED BUDGET</span>
            <span className="text-emerald-400 font-bold">
              +{currencySymbol}{bufferRemaining.toLocaleString()} BUFFER
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">
                {currencySymbol}{subtotal.toLocaleString()}.00
              </span>
              <span className="text-xs font-mono text-slate-400">
                / {currencySymbol}{totalCap.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Allocated {committedPercent}% of maximum studio allowance
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-[#28303F] pt-2">
            <span>Committed: {currencySymbol}{subtotal.toLocaleString()}</span>
            <span className="text-emerald-400 font-semibold">Free Buffer: {currencySymbol}{bufferRemaining.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2: Spatial Integrity */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>SPATIAL INTEGRITY</span>
            <ShieldCheck className="w-4 h-4 text-[#06B6D4]" />
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white">
                {project.placedObjects.length - conflictCount} / {project.placedObjects.length}
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  conflictCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {conflictCount === 0 ? 'Verified' : `${conflictCount} Flagged`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {conflictCount === 0
                ? '0 volumetric overlap & door-swing collisions'
                : `${conflictCount} clearance conflict${conflictCount === 1 ? '' : 's'} — see 2D Blueprint`}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-slate-400 border-t border-[#28303F] pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Local Clearance Engine • Score {clearance.score}/100</span>
          </div>
        </div>

        {/* KPI 3: Freight & Handling */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>FREIGHT & HANDLING</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#E5855E]/20 text-[#E5855E] rounded">
              CONSOLIDATED
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-white">White-Glove</div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Single consolidated drop to 4th-floor freight dock
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-emerald-400 border-t border-[#28303F] pt-2">
            <span>Tier 1 complimentary</span>
            <span className="line-through text-slate-500">{currencySymbol}180.00</span>
          </div>
        </div>

        {/* KPI 4: Procurement Window */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>PROCUREMENT WINDOW</span>
            <Clock className="w-4 h-4 text-[#F59E0B]" />
          </div>

          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-white">
              {fastestLead != null && slowestLead != null
                ? Math.ceil(fastestLead) === Math.ceil(slowestLead)
                  ? `${Math.ceil(fastestLead)} Business Days`
                  : `${Math.ceil(fastestLead)}–${Math.ceil(slowestLead)} Business Days`
                : 'Per Catalog Lead Times'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {fastestLead != null && slowestLead != null
                ? `Catalog lead times resolved for ${leadDays.length} of ${boqItems.length} line items`
                : 'Lead times resolved from the local catalog per line item'}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-[#28303F] pt-2">
            <span>Target Install:</span>
            <span className="text-white font-bold">Within 2 Weeks</span>
          </div>
        </div>
      </div>

      {/* Main BoQ Layout: Left Itemized Schedule + Right Volumetric Cost Share */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4">
        {/* Left Column: Itemized BoQ Table & Protocols */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter specs, SKU, brand..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#14171D] border border-[#28303F] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['All', 'Furniture', 'Luminaires', 'Surfaces'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilterCat(cat)}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                      activeFilterCat === cat
                        ? 'bg-[#E5855E] text-white font-bold'
                        : 'bg-[#14171D] border border-[#28303F] text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* BoQ Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#28303F] text-[10px] text-slate-400 uppercase">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-3">SPECIFICATION / ITEM</th>
                    <th className="py-2.5 px-3">DIMENSIONS (W×D×H)</th>
                    <th className="py-2.5 px-3">VENDOR</th>
                    <th className="py-2.5 px-2 text-center">QTY</th>
                    <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                    <th className="py-2.5 px-3 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#28303F]/60">
                  {filteredBoq.map((row) => (
                    <tr key={row.id} className="hover:bg-[#242A36]/40 transition-colors">
                      <td className="py-3 px-2 text-slate-400">{row.index}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{row.name}</span>
                          {row.optimized && (
                            <span className="text-[9px] font-mono px-1 py-0.5 bg-[#06B6D4]/20 text-[#06B6D4] rounded">
                              OPTIMIZED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{row.material}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{row.dimensions}</td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
                          {row.vendor}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-200">{row.qty}</td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {currencySymbol}{row.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {currencySymbol}{row.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Trade Discount Callout */}
            <div className="border-t border-[#28303F] pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>B2B Trade Pricing Applied: 15% Standard Trade Discount included</span>
              </div>

              <div className="text-right font-mono">
                <span className="text-xs text-slate-400 mr-2">SUBTOTAL ({boqItems.length} LINE ITEMS):</span>
                <span className="text-lg font-bold text-white">
                  {currencySymbol}{subtotal.toLocaleString()}.00
                </span>
              </div>
            </div>
          </div>

          {/* Architectural Installation Protocols (Matching Screenshot 5 bottom cards) */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E5855E]" />
              <span>ARCHITECTURAL INSTALLATION PROTOCOLS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-[#14171D] p-3 rounded-lg border border-[#28303F]">
                <span className="text-[10px] text-[#E5855E] font-bold block">01 / LUMINAIRE MOUNTING</span>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  FLOS Aim drop length pre-calibrated to 78" above finished floor (AFF) with junction box offset at Grid C-4.
                </p>
              </div>

              <div className="bg-[#14171D] p-3 rounded-lg border border-[#28303F]">
                <span className="text-[10px] text-[#06B6D4] font-bold block">02 / CLEARANCE ENVELOPE</span>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Sven Sofa perimeter sustains 36" primary circulation walkway to western balcony sliding threshold.
                </p>
              </div>

              <div className="bg-[#14171D] p-3 rounded-lg border border-[#28303F]">
                <span className="text-[10px] text-[#F59E0B] font-bold block">03 / SUB-SURFACE PADDING</span>
                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  Basalt rug includes high-density recycled felt acoustic underlay for noise dampening.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Volumetric Cost Share & Procurement Checkout */}
        <div className="w-full xl:w-88 shrink-0 flex flex-col gap-4">
          {/* 1. Volumetric Cost Share (Donut Breakdown) */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">VOLUMETRIC COST SHARE</span>
              <span className="text-[10px] font-mono text-emerald-400">100% AUDITED</span>
            </div>

            {/* Circular Visual & Breakdown */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-32 h-32 rounded-full border-8 border-t-[#E5855E] border-r-[#06B6D4] border-b-[#F59E0B] border-l-slate-700 flex flex-col items-center justify-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase">TOTAL</span>
                <span className="text-base font-bold font-mono text-white">
                  {currencySymbol}{subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 font-mono text-xs border-t border-[#28303F] pt-3">
              {costShare.map((g) => (
                <div key={g.label} className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                    {g.label}
                  </span>
                  <span className="text-white font-bold">
                    {g.pct}% ({currencySymbol}{g.amount.toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Local Value-Engineered Savings Card */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-2.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#06B6D4] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                LOCAL VALUE-ENGINEERED SAVINGS
              </span>
              <span className="text-[10px] text-slate-400">
                {veRec.alternatives.length > 0 ? `ALT-${String(veRec.alternatives.length).padStart(3, '0')}` : 'OPTIMAL'}
              </span>
            </div>

            <div className="text-xs font-bold font-mono text-white">
              {activeAlt
                ? valueEngineeredActive
                  ? `Alternative Active: ${activeAlt.alternative}`
                  : `Swap Available: ${activeAlt.alternative}`
                : 'Schedule Already Optimal'}
            </div>

            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              {activeAlt
                ? `${activeAlt.note} ${veRec.leadTimeAdvantage}. ${veRec.spatialImpact}.`
                : veRec.spatialImpact +
                  ' — the local catalog holds no cheaper same-footprint substitution for this schedule.'}
            </p>

            <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#28303F]">
              <div>
                <span className="text-[9px] font-mono text-slate-400 block">
                  {valueEngineeredActive && activeAlt ? 'NET REALIZED SAVINGS' : 'PROJECTED SAVINGS'}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  +{currencySymbol}
                  {(valueEngineeredActive && activeAlt ? activeAlt.savings : veRec.savingsAmount).toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => setValueEngineeredActive(!valueEngineeredActive)}
                disabled={veRec.alternatives.length === 0}
                className="px-2.5 py-1 bg-[#14171D] hover:bg-[#242A36] disabled:opacity-40 disabled:cursor-not-allowed border border-[#28303F] text-xs font-mono text-slate-300 rounded"
              >
                {valueEngineeredActive ? 'Switch to Original' : 'Apply Local Savings'}
              </button>
            </div>
          </div>

          {/* 3. Procurement Checkout Card */}
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">PROCUREMENT CHECKOUT</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#E5855E]/20 text-[#E5855E] font-bold rounded">
                TIER 1 TRADE
              </span>
            </div>

            <div className="flex flex-col gap-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>{boqItems.length} Verified Architectural Items</span>
                <span>{currencySymbol}{subtotal.toLocaleString()}.00</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>White-Glove Consolidated Drop</span>
                <span className="text-emerald-400 font-bold">FREE ({currencySymbol}0.00)</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>Estimated State Sales Tax</span>
                <span>{currencySymbol}0.00 (Trade Exempt)</span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[#28303F] pt-2 text-base font-bold text-white">
                <span>Total Procurement:</span>
                <span className="text-[#E5855E] text-xl">
                  {currencySymbol}{subtotal.toLocaleString()}.00
                </span>
              </div>

              <div className="text-[10px] text-slate-400 text-right">
                Studio Line: 4 × {currencySymbol}{(subtotal / 4).toFixed(2)}/mo at 0% APR
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={() => alert(`Procurement Bundle confirmed for ${currencySymbol}${subtotal.toLocaleString()}! Purchase Order #PO-${Date.now().toString().slice(-6)} issued with white-glove delivery tracking.`)}
                className="w-full py-3 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <span>Order Complete Room Bundle ({currencySymbol}{subtotal.toLocaleString()})</span>
              </button>

              <button
                onClick={() => alert('Formal PO sent to lead architect email for trade credit authorization.')}
                className="w-full py-2 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] text-xs font-mono text-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Send Formal PO to Studio Lead</span>
              </button>

              {/* Export Specifications */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <button
                  onClick={handleExportPDF}
                  className="py-1.5 px-2 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] rounded flex items-center justify-center gap-1.5 text-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-[#E5855E]" />
                  <span>PDF BoQ</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="py-1.5 px-2 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] rounded flex items-center justify-center gap-1.5 text-slate-300"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#06B6D4]" />
                  <span>CSV Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
