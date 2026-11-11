import React from 'react';
import {
  Box,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Sun,
  UploadCloud,
  CheckCircle,
  Users,
  Grid,
  FileText,
  Star,
} from 'lucide-react';

interface LandingPageProps {
  onStartDesigning: () => void;
  onNavigatePublic: (page: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDesigning,
  onNavigatePublic,
  onOpenAuth,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#14171D] text-slate-100 overflow-x-hidden">
      {/* ======================================================== */}
      {/* 1. HERO SECTION */}
      {/* ======================================================== */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#181C24] border border-[#28303F] rounded-full text-xs font-mono text-[#06B6D4] mb-6 shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse"></span>
            <span>NEXT-GEN SPATIAL ARCHITECTURE PLATFORM</span>
            <span className="text-slate-500">•</span>
            <span className="text-[#E5855E] font-bold">PRO SUITE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-mono tracking-tight text-white leading-tight">
            Transform Your Room Sketch into Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5855E] via-[#F59E0B] to-[#06B6D4]">
              Dream Space.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            The AI-powered interior design platform that turns simple hand-drawn sketches into precision 2D CAD blueprints, interactive 3D rooms, verified clearance checks, and itemized BoQ budget estimates.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartDesigning}
              className="w-full sm:w-auto px-8 py-4 bg-[#E5855E] hover:bg-[#D2714A] text-white font-mono font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-xl hover:scale-105"
            >
              <Box className="w-5 h-5" />
              <span>Start Designing Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigatePublic('how-it-works')}
              className="w-full sm:w-auto px-6 py-4 bg-[#181C24] hover:bg-[#242A36] border border-[#28303F] text-slate-200 font-mono text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>Explore How It Works</span>
            </button>
          </div>

          {/* Quick trust metrics */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono text-xs text-slate-400 border-t border-[#28303F] pt-6 max-w-3xl mx-auto">
            <div>
              <span className="text-xl font-bold text-white block">100%</span>
              <span>Procedural 3D WebGL</span>
            </div>
            <div>
              <span className="text-xl font-bold text-[#06B6D4] block">36-inch</span>
              <span>Egress Verification</span>
            </div>
            <div>
              <span className="text-xl font-bold text-[#F59E0B] block">4K PBR</span>
              <span>Tactile Materials</span>
            </div>
            <div>
              <span className="text-xl font-bold text-emerald-400 block">Live BoQ</span>
              <span>Itemized Procurement</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Applet Mockup Preview (Reflecting Screenshot 2) */}
        <div className="mt-14 relative rounded-2xl overflow-hidden border border-[#28303F] bg-[#181C24] shadow-2xl p-2 sm:p-4">
          <div className="bg-[#14171D] rounded-xl overflow-hidden border border-[#28303F] relative">
            <div className="px-4 py-2.5 bg-[#181C24] border-b border-[#28303F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span className="text-xs font-mono text-slate-400 ml-2">
                  DrawMyRoom Studio Workspace • Modern Loft Living Room (18 × 14 ft)
                </span>
              </div>
              <div className="text-xs font-mono text-[#06B6D4] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                <span>STUDIO BUDGET: $1,850 / $2,200</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
              {/* Left quick panel */}
              <div className="lg:col-span-3 p-4 border-r border-[#28303F] bg-[#181C24] flex flex-col gap-3 font-mono text-xs">
                <div className="p-3 bg-[#14171D] border border-[#28303F] rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase">SPATIAL ENVELOPE</div>
                  <div className="text-sm font-bold text-white mt-1">252 sq ft • 2,520 cu ft</div>
                  <div className="text-[10px] text-[#06B6D4] mt-0.5">18.0 ft L × 14.0 ft W × 10.0 ft H</div>
                </div>

                <div className="p-3 bg-[#14171D] border border-[#28303F] rounded-lg flex flex-col gap-1.5">
                  <div className="text-[10px] text-slate-400 uppercase">CLEARANCE ENGINE</div>
                  <div className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> 36" Walkway Enforced
                  </div>
                  <div className="text-[#E5855E] font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" /> Door Arc Swing Safe
                  </div>
                </div>

                <div className="p-3 bg-[#14171D] border border-[#28303F] rounded-lg mt-auto">
                  <span className="text-[9px] text-slate-400 uppercase block">STAGING MODEL</span>
                  <span className="text-xs font-bold text-white block mt-0.5">Modern Minimalist</span>
                  <span className="text-[10px] text-[#06B6D4]">AI Fit Score: 98%</span>
                </div>
              </div>

              {/* Center Canvas Preview */}
              <div className="lg:col-span-6 p-6 flex flex-col items-center justify-center bg-[#0E1116] relative overflow-hidden">
                <div className="w-full max-w-md aspect-[1.3/1] bg-[#14171D] border-2 border-[#06B6D4]/60 rounded-xl relative p-4 flex items-center justify-center shadow-xl">
                  {/* Grid background */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: `linear-gradient(to right, #2A313E 1px, transparent 1px), linear-gradient(to bottom, #2A313E 1px, transparent 1px)`,
                      backgroundSize: `24px 24px`,
                    }}
                  />

                  {/* Dimension overlay */}
                  <div className="absolute top-2 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-[#06B6D4]">
                    <span>18' - 0" (5,486 mm)</span>
                    <span>14' - 0"</span>
                  </div>

                  {/* Furniture representations */}
                  <div className="w-40 h-20 bg-[#242A36] border border-[#3B4559] rounded-lg flex flex-col items-center justify-center p-1 text-center font-mono">
                    <span className="text-[9px] text-[#E5855E] font-bold">NOCTURNE CURVED SOFA</span>
                    <span className="text-[8px] text-slate-400">96" × 42"</span>
                  </div>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-20 h-10 bg-[#242A36] border border-[#3B4559] rounded mt-8 flex flex-col items-center justify-center font-mono">
                    <span className="text-[8px] text-white">COFFEE TABLE</span>
                    <span className="text-[7px] text-slate-400">48" × 24"</span>
                  </div>

                  <div className="absolute bottom-3 left-4 px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/40 rounded text-[9px] font-mono text-[#06B6D4]">
                    EGRESS CORRIDOR 36"
                  </div>
                </div>

                <div className="mt-3 text-[11px] font-mono text-slate-400">
                  Orthographic 2D Blueprint + Real-time 3D PBR Synchronization
                </div>
              </div>

              {/* Right quick stats */}
              <div className="lg:col-span-3 p-4 border-l border-[#28303F] bg-[#181C24] flex flex-col gap-3 font-mono text-xs">
                <div className="p-3 bg-[#14171D] border border-[#28303F] rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase">COMMITTED PROCUREMENT</div>
                  <div className="text-xl font-bold text-white mt-1">$1,850.00</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">+$350 Free Buffer (15% B2B Applied)</div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-slate-400 uppercase">SPECIFIED PIECES</div>
                  <div className="p-2 bg-[#14171D] rounded border border-[#28303F] text-[11px]">
                    <span className="font-bold text-white block">Strata Low Modular 3-Piece</span>
                    <span className="text-slate-400 text-[10px]">$1,299 • Sand Bouclé</span>
                  </div>
                  <div className="p-2 bg-[#14171D] rounded border border-[#28303F] text-[11px]">
                    <span className="font-bold text-white block">Tivoli Honed Travertine Plinth</span>
                    <span className="text-slate-400 text-[10px]">$620 • Natural Stone</span>
                  </div>
                </div>

                <button
                  onClick={onStartDesigning}
                  className="w-full mt-auto py-2.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open Interactive Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. THE 10 PROBLEMS SOLVED BY DRAWMYROOM */}
      {/* ======================================================== */}
      <section className="py-16 bg-[#181C24] border-y border-[#28303F] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono text-[#E5855E] uppercase tracking-wider">
              WHY TRADITIONAL INTERIOR DESIGN IS BROKEN
            </span>
            <h2 className="text-3xl font-bold font-mono text-white mt-2">
              Designed for Real Homeowners, Not Just Architects
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Middle-class families deserve beautiful, functional rooms without paying thousands to drafting firms or buying furniture that doesn't fit through the door.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                id: '01',
                problem: 'Struggling to Visualize',
                solution: 'Transforms simple sketches into realistic, interactive 2D floorplans and 3D scenes.',
              },
              {
                id: '02',
                problem: 'Expensive Design Fees',
                solution: 'Provides studio-grade AI spatial layout tools accessible at zero upfront cost.',
              },
              {
                id: '03',
                problem: 'Complex 3D Software',
                solution: 'Zero CAD learning curve. Simply enter your room dimensions or snap a hand-drawn sketch.',
              },
              {
                id: '04',
                problem: 'Circulation & Clearance Errors',
                solution: 'Automated 36-inch egress corridor checks flag overlapping furniture before you buy.',
              },
              {
                id: '05',
                problem: 'Buying Without Knowing if it Fits',
                solution: 'Exact dimensional envelope bounding prevents oversized sofas or blocked doors.',
              },
              {
                id: '06',
                problem: 'Budget Overruns',
                solution: 'Real-time itemized Bill of Quantities (BoQ) with volumetric cost tracking.',
              },
              {
                id: '07',
                problem: 'Lack of Realistic Lighting Previews',
                solution: 'Diurnal solar orientation and circadian lux heatmaps verify natural illumination.',
              },
              {
                id: '08',
                problem: 'Material Guesswork',
                solution: 'PBR tactile materials studio allows experimenting with wood, terrazzo, and plaster in real time.',
              },
              {
                id: '09',
                problem: 'Fragmented Suppliers',
                solution: 'Curated architectural catalog with direct trade discount line items and lead times.',
              },
            ].map((card) => (
              <div
                key={card.id}
                className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3 shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-red-400 font-bold">
                    Problem #{card.id}
                  </span>
                  <span className="text-[10px] font-mono text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded">
                    DrawMyRoom Fix
                  </span>
                </div>
                <h3 className="text-sm font-bold font-mono text-white">
                  {card.problem}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {card.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. HOW IT WORKS: 5-STEP WORKFLOW */}
      {/* ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono text-[#06B6D4] uppercase tracking-wider">
            STEP-BY-STEP WORKFLOW
          </span>
          <h2 className="text-3xl font-bold font-mono text-white mt-1">
            From Napkin Sketch to Completed Room
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Five frictionless steps to design, customize, and budget your room renovation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {[
            {
              step: '01',
              title: 'Upload Sketch',
              desc: 'Drop any hand-drawn room sketch, floorplan PDF, or phone photo.',
              icon: UploadCloud,
              color: '#06B6D4',
            },
            {
              step: '02',
              title: 'Enter Dimensions',
              desc: 'Confirm length, width, and ceiling height with quick steppers.',
              icon: Grid,
              color: '#E5855E',
            },
            {
              step: '03',
              title: 'AI Staging',
              desc: 'Generate layout suggestions in Minimalist, Japandi, or Loft styles.',
              icon: Sparkles,
              color: '#F59E0B',
            },
            {
              step: '04',
              title: 'Arrange & Fit Check',
              desc: 'Drag & rotate furniture with live 36" clearance conflict alerts.',
              icon: Box,
              color: '#06B6D4',
            },
            {
              step: '05',
              title: 'BoQ Estimates',
              desc: 'Export itemized specifications, trade discounts, and PDF sheets.',
              icon: FileText,
              color: '#E5855E',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-[#181C24] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3 shadow-md relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono text-slate-500">{item.step}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={onStartDesigning}
            className="px-8 py-3.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-xl transition-all shadow-lg inline-flex items-center gap-2"
          >
            <span>Try the 5-Step Process Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. WORKSPACE SUITE HIGHLIGHTS (The 6 Workspaces) */}
      {/* ======================================================== */}
      <section className="py-16 bg-[#181C24] border-t border-[#28303F] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono text-[#F59E0B] uppercase tracking-wider">
              COMPLETE STUDIO SUITE
            </span>
            <h2 className="text-3xl font-bold font-mono text-white mt-1">
              Every Architectural Tool Under One Roof
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3">
              <Box className="w-6 h-6 text-[#E5855E]" />
              <h3 className="text-base font-bold font-mono text-white">Spatial Editor (2D/3D)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scaled CAD floorplan + Three.js 3D isometric & interior walkthrough with real-time clearance conflict alerts.
              </p>
            </div>

            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3">
              <Layers className="w-6 h-6 text-[#06B6D4]" />
              <h3 className="text-base font-bold font-mono text-white">Curated Furniture Catalog</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter seating, plinths, and credenzas constrained by your room envelope. Verified contract grade finishes.
              </p>
            </div>

            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3">
              <Sparkles className="w-6 h-6 text-[#F59E0B]" />
              <h3 className="text-base font-bold font-mono text-white">Materials Studio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tactile PBR flooring, Venetian terrazzo, and microcement with surface area cost calculations including 10% waste cut.
              </p>
            </div>

            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3">
              <Sun className="w-6 h-6 text-[#06B6D4]" />
              <h3 className="text-base font-bold font-mono text-white">Lighting Simulation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Solar orientation compass, diurnal sunset slider, lux heatmaps, and AI auto-balance for circadian evening compliance.
              </p>
            </div>

            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3">
              <FileText className="w-6 h-6 text-[#E5855E]" />
              <h3 className="text-base font-bold font-mono text-white">Estimates & BoQ Specs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Itemized trade schedule, volumetric cost share donut charts, AI value engineering, and instant PDF/CSV export.
              </p>
            </div>

            <div className="bg-[#14171D] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-3">
              <Users className="w-6 h-6 text-[#06B6D4]" />
              <h3 className="text-base font-bold font-mono text-white">Designer Connect</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct consultation inquiries to certified interior architects for bespoke cabinetry and permit drawings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. TESTIMONIALS */}
      {/* ======================================================== */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono text-[#06B6D4] uppercase tracking-wider">
            TRUSTED BY HOMEOWNERS & ARCHITECTS
          </span>
          <h2 className="text-3xl font-bold font-mono text-white mt-1">
            Real Spatial Success Stories
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-4 shadow">
            <div className="flex items-center gap-1 text-[#F59E0B]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B]" />
              ))}
            </div>
            <p className="text-slate-300 leading-relaxed">
              "We were about to purchase a $2,400 sectional that would have completely blocked our balcony door. The 36-inch clearance conflict alert saved us thousands and weeks of headache."
            </p>
            <div className="border-t border-[#28303F] pt-2 text-slate-400">
              <strong className="text-white block">Aditya & Ananya R.</strong>
              <span>Bengaluru Apartment Renovation</span>
            </div>
          </div>

          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-4 shadow">
            <div className="flex items-center gap-1 text-[#F59E0B]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B]" />
              ))}
            </div>
            <p className="text-slate-300 leading-relaxed">
              "The lighting simulation with diurnal golden hour slider allowed us to position our dining plinth perfectly where natural morning light pours in. Studio-grade quality."
            </p>
            <div className="border-t border-[#28303F] pt-2 text-slate-400">
              <strong className="text-white block">Claire H.</strong>
              <span>London Loft Conversion</span>
            </div>
          </div>

          <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-5 flex flex-col justify-between gap-4 shadow">
            <div className="flex items-center gap-1 text-[#F59E0B]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B]" />
              ))}
            </div>
            <p className="text-slate-300 leading-relaxed">
              "As an independent residential architect, I use DrawMyRoom to rapidly sketch spatial options with clients on the spot. The BoQ spec sheet export alone cuts our estimate time in half."
            </p>
            <div className="border-t border-[#28303F] pt-2 text-slate-400">
              <strong className="text-white block">Ar. Priya Sharma</strong>
              <span>Senior Spatial Planner</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. FINAL CALL TO ACTION BANNER */}
      {/* ======================================================== */}
      <section className="py-16 bg-gradient-to-r from-[#181C24] via-[#242A36] to-[#181C24] border-t border-[#28303F] px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-[#E5855E]/20 text-[#E5855E] flex items-center justify-center">
            <Box className="w-6 h-6" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
            Ready to Design Your Room?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Upload your sketch, specify dimensions, experiment with 3D furniture layouts, and get an instant itemized procurement BoQ.
          </p>
          <button
            onClick={onStartDesigning}
            className="px-8 py-4 bg-[#E5855E] hover:bg-[#D2714A] text-white font-mono font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-xl hover:scale-105"
          >
            <span>Launch DrawMyRoom Studio Suite</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. FOOTER */}
      {/* ======================================================== */}
      <footer className="bg-[#0E1116] border-t border-[#28303F] py-12 px-4 sm:px-6 lg:px-8 font-mono text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E5855E] flex items-center justify-center text-black font-bold">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-white font-bold text-sm">DrawMyRoom STUDIO</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => onNavigatePublic('about')} className="hover:text-white">
              About
            </button>
            <button onClick={() => onNavigatePublic('how-it-works')} className="hover:text-white">
              How It Works
            </button>
            <button onClick={() => onNavigatePublic('features')} className="hover:text-white">
              Features
            </button>
            <button onClick={() => onNavigatePublic('contact')} className="hover:text-white">
              Contact
            </button>
            <button onClick={onStartDesigning} className="text-[#E5855E] font-bold hover:underline">
              Open Studio
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            © 2026 DrawMyRoom. Architectural design & spatial planning suite.
          </div>
        </div>
      </footer>
    </div>
  );
};
