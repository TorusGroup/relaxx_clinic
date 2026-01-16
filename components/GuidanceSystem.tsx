
import React, { useState, useEffect } from 'react';

interface Props {
  message: string;
  subMessage?: string;
  progress?: number; // V12.0 (0 to 1)
}

const GuidanceSystem: React.FC<Props> = ({ message, subMessage, progress }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, [message]);

  return (
    <div className={`fixed top-8 md:top-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-6 transition-all duration-1000 transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
      <div className="bg-white/5 backdrop-blur-3xl p-5 md:p-6 rounded-[40px] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative overflow-hidden text-center group">
        <style>{`
            @keyframes slide-right {
                0% { transform: translateX(-100%); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
            .animate-slide-right { animation: slide-right 4s infinite linear; }
        `}</style>

        {/* Subtle Background Watermark */}
        <img src="/logo_icon.png" className="absolute -top-10 -right-10 w-40 h-40 object-contain opacity-[0.03] grayscale" alt="" />

        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#00FF66] to-transparent animate-slide-right" />
        </div>

        <h3 className="text-white text-xl md:text-2xl font-black tracking-tighter uppercase leading-none mb-4">
          {message}
        </h3>

        {subMessage && (
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#00FF66] animate-pulse" />
              <p className="text-[#00FF66] text-[10px] font-black uppercase tracking-[0.5em] opacity-60">
                {subMessage}
              </p>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        )}

        {/* V12.0 Integrated Progress Bar */}
        {typeof progress === 'number' && (
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00FF66]/20 via-[#00FF66] to-[#00FF66]/20 transition-all duration-1000 ease-in-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidanceSystem;
