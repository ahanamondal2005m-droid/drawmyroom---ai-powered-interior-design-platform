import React, { useState } from 'react';
import { Project, DesignerProfile } from '../../types';
import { DESIGNER_PROFILES } from '../../data/mockData';
import {
  Users,
  Star,
  CheckCircle,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ExternalLink,
  DollarSign,
} from 'lucide-react';

interface DesignerConnectViewProps {
  project: Project;
}

export const DesignerConnectView: React.FC<DesignerConnectViewProps> = ({ project }) => {
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerProfile | null>(null);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const currencySymbol = project.budget.currency === 'INR' ? '₹' : '$';

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesigner) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designerId: selectedDesigner.id,
          designerName: selectedDesigner.name,
          clientName: inquiryName,
          clientEmail: inquiryEmail,
          projectName: project.name,
          roomType: project.roomType,
          dimensions: project.dimensions,
          budgetCap: project.budget.totalCap,
          notes: inquiryNotes,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          setSelectedDesigner(null);
          setInquiryNotes('');
        }, 2500);
      }
    } catch (err) {
      console.error('Error submitting inquiry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto gap-6 max-w-6xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#06B6D4]">
            <Users className="w-4 h-4 text-[#06B6D4]" />
            <span>DESIGNER CONNECT DIRECTORY</span>
          </div>
          <h1 className="text-xl font-bold font-mono text-white mt-1">
            Verified Interior Architects & Space Planners
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Collaborate directly with vetted professionals to review your DrawMyRoom spatial layout, refine daylighting calculations, and produce certified contractor drawings.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-[#14171D] px-3.5 py-2 rounded-lg border border-[#28303F]">
          <CheckCircle className="w-4 h-4" />
          <span>Vetted Portfolios • Escrow Protection</span>
        </div>
      </div>

      {/* Designer Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DESIGNER_PROFILES.map((designer) => (
          <div
            key={designer.id}
            className="bg-[#181C24] border border-[#28303F] hover:border-[#E5855E] rounded-xl overflow-hidden flex flex-col justify-between transition-all shadow-md group"
          >
            {/* Portfolio Image Banner Carousel Preview */}
            <div className="grid grid-cols-2 gap-1 h-44 bg-[#14171D] overflow-hidden">
              <img
                src={designer.portfolioImages[0]}
                alt={`${designer.name} portfolio`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <img
                src={designer.portfolioImages[1]}
                alt={`${designer.name} portfolio secondary`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Profile Info */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold font-mono text-white group-hover:text-[#E5855E] transition-colors">
                      {designer.name}
                    </h3>
                    {designer.verified && (
                      <span title="Verified Architect">
                        <CheckCircle className="w-4 h-4 text-[#06B6D4] shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {designer.title}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">
                    {currencySymbol}{designer.hourlyRate}/hr
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#F59E0B]">
                    <Star className="w-3.5 h-3.5 fill-[#F59E0B]" />
                    <span>{designer.rating} ({designer.reviewsCount})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {designer.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {designer.experienceYears} Years Exp
                </span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {designer.bio}
              </p>

              {/* Specialties Pills */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {designer.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="text-[10px] font-mono px-2 py-0.5 bg-[#14171D] border border-[#28303F] text-slate-300 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>

              {/* Action */}
              <div className="mt-3 pt-3 border-t border-[#28303F] flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Includes 3D Layout Review
                </span>

                <button
                  onClick={() => setSelectedDesigner(designer)}
                  className="px-4 py-2 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Consult Architect</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inquiry Form Modal */}
      {selectedDesigner && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-mono font-bold text-white mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#E5855E]" /> Request Consultation with {selectedDesigner.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Your active room plan ({project.name}, {project.dimensions.lengthFt}' × {project.dimensions.widthFt}') will be attached to this inquiry.
            </p>

            {submitSuccess ? (
              <div className="p-6 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-center flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
                <h4 className="text-sm font-bold font-mono text-white">Inquiry Dispatched Successfully!</h4>
                <p className="text-xs text-emerald-200">
                  {selectedDesigner.name} will review your 2D/3D spatial plan and get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitInquiry} className="flex flex-col gap-3 font-mono text-xs">
                <div>
                  <label className="text-slate-300">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sen"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300">Your Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-300">Consultation Notes & Questions</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your design goals, family lifestyle, specific storage needs, or questions regarding furniture clearance and natural lighting..."
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-2 text-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[#28303F]">
                  <button
                    type="button"
                    onClick={() => setSelectedDesigner(null)}
                    className="px-3 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#E5855E] hover:bg-[#D2714A] disabled:opacity-50 text-white font-bold rounded flex items-center gap-2"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Consultation Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
