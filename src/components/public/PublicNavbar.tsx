import React, { useState } from 'react';
import { Box, User, ArrowRight, Menu, X } from 'lucide-react';
import { UserProfile } from '../../types';

interface PublicNavbarProps {
  currentPublicPage: string;
  onNavigatePublic: (page: string) => void;
  onOpenWorkspace: () => void;
  user: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentPublicPage,
  onNavigatePublic,
  onOpenWorkspace,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'features', label: 'Features' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#14171D]/90 backdrop-blur border-b border-[#28303F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigatePublic('home')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E5855E] to-[#F59E0B] flex items-center justify-center text-black shadow-md group-hover:scale-105 transition-transform">
            <Box className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold font-mono text-base tracking-tight text-white">
                DrawMyRoom
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#E5855E] text-black rounded">
                STUDIO
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase -mt-0.5">
              ARCHITECTURAL SUITE
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigatePublic(link.id)}
              className={`transition-colors ${
                currentPublicPage === link.id
                  ? 'text-[#E5855E] font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-300">
                Hi, <strong className="text-white">{user.name.split(' ')[0]}</strong>
              </span>
              <button
                onClick={onOpenWorkspace}
                className="px-4 py-2 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
              >
                <span>Open Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onLogout}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-300 ml-1"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 text-xs font-mono text-slate-300 hover:text-white transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-2 bg-[#242A36] hover:bg-[#2A313E] border border-[#28303F] text-xs font-mono text-white rounded-lg transition-colors"
              >
                Sign Up
              </button>
              <button
                onClick={onOpenWorkspace}
                className="px-4 py-2 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
              >
                <span>Launch Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#181C24] border-b border-[#28303F] p-4 flex flex-col gap-3 font-mono text-xs">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                onNavigatePublic(link.id);
                setMobileMenuOpen(false);
              }}
              className="text-left py-1 text-slate-300 hover:text-[#E5855E]"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-[#28303F] flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenWorkspace();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 bg-[#E5855E] text-white font-bold rounded-lg text-center"
            >
              Launch Studio Suite
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
