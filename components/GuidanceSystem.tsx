
import React, { useState, useEffect } from 'react';

interface Props {
  message: string;
  subMessage?: string;
}

const GuidanceSystem: React.FC<Props> = ({ message, subMessage }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, [message]);

  return (
    <div className={`fixed top-8 md:top-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 transition-all duration-1000 transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="bg-black/40 backdrop-blur-2xl p-6 md:p-8 rounded-[28px] md:rounded-[40px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden text-center md:text-left">
        <div className="absolute top-0 left-0 w-full md:w-1 h-1 md:h-full bg-gradient-to-r md:bg-gradient-to-b from-[#00FF66] to-transparent" />
        <h3 className="text-white text-base md:text-lg font-semibold leading-snug">
          {message}
        </h3>
        {subMessage && (
          <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#00FF66] animate-pulse" />
            <p className="text-[#00FF66] text-[9px] font-black uppercase tracking-[0.3em]">
              {subMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidanceSystem;
