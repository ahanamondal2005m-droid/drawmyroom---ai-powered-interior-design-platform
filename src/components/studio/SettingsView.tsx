import React, { useState } from 'react';
import { Project, CurrencyCode, DimensionUnit, UserProfile } from '../../types';
import {
  Settings,
  DollarSign,
  Ruler,
  User,
  Shield,
  Save,
  Check,
  Building,
} from 'lucide-react';

interface SettingsViewProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  project,
  onUpdateProject,
  user,
  onUpdateUser,
}) => {
  const [currency, setCurrency] = useState<CurrencyCode>(project.budget.currency);
  const [unit, setUnit] = useState<DimensionUnit>(project.dimensions.unit);
  const [name, setName] = useState(user.name);
  const [studioName, setStudioName] = useState(user.studioName);
  const [email, setEmail] = useState(user.email);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProject({
      budget: {
        ...project.budget,
        currency,
      },
      dimensions: {
        ...project.dimensions,
        unit,
      },
    });

    onUpdateUser({
      name,
      studioName,
      email,
      preferredCurrency: currency,
      preferredUnit: unit,
    });

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto gap-6 max-w-4xl mx-auto w-full">
      <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-2 text-xs font-mono text-[#06B6D4]">
          <Settings className="w-4 h-4 text-[#06B6D4]" />
          <span>STUDIO PREFERENCES & CONFIGURATION</span>
        </div>
        <h1 className="text-xl font-bold font-mono text-white mt-1">
          Workspace Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure default regional currencies, measurement units, studio details, and architectural tolerances.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Regional & Financial Preferences */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-4 shadow-md font-mono text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#E5855E]" /> Currency & Metric Units
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 block mb-1">Default Display Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white"
              >
                <option value="USD">USD ($) – US Dollar</option>
                <option value="INR">INR (₹) – Indian Rupee</option>
                <option value="EUR">EUR (€) – Euro</option>
                <option value="GBP">GBP (£) – British Pound</option>
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                Updates all BoQ line items, cost caps, and material square-foot rates.
              </span>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Spatial Measurement System</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as DimensionUnit)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white"
              >
                <option value="ft">Imperial (Feet & Inches • 12" Snap)</option>
                <option value="m">Metric (Meters & Centimeters • 0.5m Snap)</option>
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                Controls the 2D CAD dimension lines and 3D grid snap increments.
              </span>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col gap-4 shadow-md font-mono text-xs">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#06B6D4]" /> Studio & Profile Identity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 block mb-1">Your Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Studio / Firm Name</label>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1">Notification Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            {savedFeedback ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Workspace Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
