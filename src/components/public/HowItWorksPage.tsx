import React from 'react';
import { UploadCloud, Grid, Sparkles, Box, FileText, ArrowRight } from 'lucide-react';

interface HowItWorksPageProps {
  onStartDesigning: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onStartDesigning }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#14171D] text-slate-100 p-4 sm:p-8 lg:p-12 max-w-5xl mx-auto w-full font-mono">
      <div className="text-center max-w-3xl mx-auto py-8">
        <span className="text-xs text-[#E5855E] uppercase tracking-wider">ARCHITECTURE IN 5 STEPS</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          How DrawMyRoom Works
        </h1>
        <p className="text-sm text-slate-300 mt-4 leading-relaxed font-sans">
          A transparent, mathematically grounded process from hand-drawn room sketch to itemized contractor Bill of Quantities.
        </p>
      </div>

      <div className="flex flex-col gap-8 my-8">
        {[
          {
            step: '01',
            title: 'Upload Floorplan or Hand Sketch',
            desc: 'Draw your room on paper with a pen or upload an existing blueprint PDF/image. Our local layout engine (roomsolver, running fully offline on your own server) resolves boundary walls, door openings, window fenestration bays, and aspect ratios — no cloud AI, no API keys.',
            tag: 'MULTIMODAL VECTORIZATION',
            icon: UploadCloud,
          },
          {
            step: '02',
            title: 'Verify Spatial Dimensions & Egress',
            desc: 'Adjust room length, width, and ceiling height in feet or meters. The platform generates an exact scaled orthographic grid with automated 36-inch primary walkway guidelines and door arc swing radii.',
            tag: 'CAD PRECISION',
            icon: Grid,
          },
          {
            step: '03',
            title: 'Select AI Staging Themes',
            desc: 'Choose between Modern Minimalist, Japandi Warm, Industrial Loft, or Scandinavian. AI provides recommended furniture zones, palette swatches, and material suggestions tailored to your room envelope.',
            tag: 'PRO STAGING MODEL',
            icon: Sparkles,
          },
          {
            step: '04',
            title: 'Interactive 2D & 3D Arrangement',
            desc: 'Drag, rotate, and reposition furniture. Instant collision alerts warn you if a coffee table or plinth restricts circulation corridors, with one-click Auto-Snap clearance to resolve conflicts.',
            tag: 'THREE.JS PBR ENGINE',
            icon: Box,
          },
          {
            step: '05',
            title: 'Export Bill of Quantities (BoQ) & Sourcing',
            desc: 'Receive an audited cost breakdown with B2B trade discounts, alternative value-engineered item suggestions, and exportable PDF spec sheets ready for contractor procurement.',
            tag: 'B2B PROCUREMENT LEDGER',
            icon: FileText,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-start gap-6 shadow-md"
            >
              <div className="w-14 h-14 rounded-xl bg-[#242A36] border border-[#28303F] text-[#06B6D4] flex items-center justify-center font-bold text-xl shrink-0">
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#E5855E] font-bold">STEP {item.step}</span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="text-[10px] text-[#06B6D4]">{item.tag}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{item.title}</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed font-sans">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center py-6">
        <button
          onClick={onStartDesigning}
          className="px-8 py-3.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold rounded-xl transition-all shadow-lg inline-flex items-center gap-2"
        >
          <span>Launch DrawMyRoom Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
