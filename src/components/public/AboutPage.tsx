import React from 'react';
import { Box, Target, Heart, Shield, Award, Users, ArrowRight } from 'lucide-react';

interface AboutPageProps {
  onStartDesigning: () => void;
  onNavigatePublic: (page: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onStartDesigning }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#14171D] text-slate-100 p-4 sm:p-8 lg:p-12 max-w-5xl mx-auto w-full font-mono">
      <div className="text-center max-w-3xl mx-auto py-8">
        <span className="text-xs text-[#06B6D4] uppercase tracking-wider">OUR MISSION & PHILOSOPHY</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Democratizing Spatial Design for Every Household
        </h1>
        <p className="text-sm text-slate-300 mt-4 leading-relaxed font-sans">
          DrawMyRoom was founded on a simple observation: professional architectural design is too expensive and complex for most homeowners, yet buying furniture without spatial precision leads to cluttered rooms, blocked pathways, and wasted budgets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3">
          <Target className="w-8 h-8 text-[#E5855E]" />
          <h3 className="text-base font-bold text-white">The Core Problem</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Homeowners visualize in ideas, but construct in millimeters. Traditional CAD requires specialized degrees, while retail showrooms show furniture in giant empty warehouses that bear no resemblance to a 14×18 ft living room with door-swing conflicts.
          </p>
        </div>

        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-3">
          <Heart className="w-8 h-8 text-[#06B6D4]" />
          <h3 className="text-base font-bold text-white">The DrawMyRoom Solution</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            We bridge napkin sketches and architectural CAD. By combining multimodal AI vectorization with real Three.js 3D geometry and parametric clearance checking, homeowners can verify layouts before spending a single rupee or dollar.
          </p>
        </div>
      </div>

      <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-8 my-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-white">Experience DrawMyRoom Studio</h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Start designing your room in interactive 2D and 3D with live clearance checking.
          </p>
        </div>
        <button
          onClick={onStartDesigning}
          className="px-6 py-3 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg whitespace-nowrap"
        >
          <span>Launch Studio Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
