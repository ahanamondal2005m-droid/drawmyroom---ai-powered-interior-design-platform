import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setMessage('');
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#14171D] text-slate-100 p-4 sm:p-8 lg:p-12 max-w-4xl mx-auto w-full font-mono">
      <div className="text-center max-w-2xl mx-auto py-8">
        <span className="text-xs text-[#E5855E] uppercase tracking-wider">GET IN TOUCH</span>
        <h1 className="text-3xl font-extrabold text-white mt-1">Contact DrawMyRoom Studio</h1>
        <p className="text-xs text-slate-300 mt-2 font-sans">
          Have questions about AI sketch vectorization, enterprise licensing, or manufacturer trade integration? We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6">
        {/* Contact Info */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 flex flex-col justify-between gap-6 shadow">
          <div>
            <h3 className="text-base font-bold text-white mb-4">Studio Headquarters</h3>
            <div className="flex flex-col gap-4 text-xs text-slate-300 font-sans">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-mono">Global Spatial Lab</strong>
                  <span>Koramangala 4th Block, Bengaluru, India</span>
                  <span className="block text-slate-400">Satellite: Soho, London UK</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#E5855E] shrink-0" />
                <span>support@drawmyroom.studio</span>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>+91 (80) 4920-8800</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#14171D] rounded-lg border border-[#28303F] text-[11px] text-slate-400">
            <strong className="text-white block font-mono">Architectural Trade Inquiries:</strong>
            Trade discounts of 15–20% are automatically calculated on itemized BoQ exports for verified studios.
          </div>
        </div>

        {/* Form */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-6 shadow">
          {submitted ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Message Dispatched!</h3>
              <p className="text-xs text-slate-300 font-sans">
                Our architectural engineering team will reply to your inquiry within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5855E]"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="vikram@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5855E]"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us about your room renovation or inquiry..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#14171D] border border-[#28303F] rounded-lg px-3 py-2 text-white outline-none focus:border-[#E5855E] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#E5855E] hover:bg-[#D2714A] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
