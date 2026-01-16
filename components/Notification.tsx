import React, { useEffect, useState } from 'react';

interface Props {
    message: string;
    type?: 'warning' | 'info' | 'error' | 'success';
    isVisible: boolean;
    icon?: string;
}

const Notification: React.FC<Props> = ({ message, type = 'warning', isVisible, icon }) => {
    const [shouldRender, setShouldRender] = useState(isVisible);

    useEffect(() => {
        if (isVisible) setShouldRender(true);
        else {
            const timer = setTimeout(() => setShouldRender(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    if (!shouldRender) return null;

    const colors = {
        warning: 'border-amber-400/30 bg-amber-400/5 text-amber-100',
        error: 'border-rose-500/30 bg-rose-500/5 text-rose-100',
        info: 'border-[#00FF66]/30 bg-[#00FF66]/5 text-[#00FF66]',
        success: 'border-[#00FF66]/30 bg-[#00FF66]/5 text-white',
    };

    const getIcon = () => {
        if (icon) return icon;
        switch (type) {
            case 'error': return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            );
            case 'warning': return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
            default: return (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        }
    };

    return (
        <div
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] transition-all duration-700 ease-out transform pointer-events-none will-change-[opacity,transform]
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 translate-z-0'}
      `}
        >
            <div className={`backdrop-blur-2xl px-8 py-5 rounded-[24px] border ${colors[type]} shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5 min-w-[320px]`}>
                <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${type === 'error' ? 'text-rose-400' : 'text-[#00FF66]'}`}>
                    {getIcon()}
                </div>
                <div className="flex flex-col">
                    <span className="font-black uppercase tracking-[0.3em] text-[9px] opacity-40 mb-1">Relaxx Protocol</span>
                    <span className="font-semibold text-base leading-tight tracking-tight text-white/90">{message}</span>
                </div>
            </div>
        </div>
    );
};

export default Notification;
