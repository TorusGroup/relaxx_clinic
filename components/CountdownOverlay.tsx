import React, { useEffect, useState, useRef } from 'react';

interface Props {
    onComplete: () => void;
}

const CountdownOverlay: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState<'INSTRUCTION' | 'COUNTDOWN'>('INSTRUCTION');
    const [count, setCount] = useState(3);

    // V9.6 Fix: Stabilize callback internally
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        if (step === 'INSTRUCTION') {
            const timer = setTimeout(() => setStep('COUNTDOWN'), 5000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    useEffect(() => {
        if (step === 'COUNTDOWN') {
            const interval = setInterval(() => {
                setCount((prev) => {
                    if (prev === 1) {
                        clearInterval(interval);
                        setTimeout(() => {
                            if (onCompleteRef.current) onCompleteRef.current();
                        }, 500);
                        return 0; // "GO!"
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step]);

    return (
        <div className="fixed inset-0 z-[500] bg-[#001A13] flex flex-col items-center justify-center text-center p-8 overflow-hidden">
            <style>{`
                @keyframes breath {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.15); opacity: 1; }
                }
                @keyframes rotate-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-breath { animation: breath 4s ease-in-out infinite; }
                .animate-rotate-slow { animation: rotate-slow 20s linear infinite; }
            `}</style>

            {/* Background Breathing Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <img src="/logo_icon.png" className="w-[800px] h-[800px] object-contain animate-rotate-slow" alt="" />
            </div>

            {step === 'INSTRUCTION' ? (
                <div className="relative z-10 text-center max-w-md px-6 animate-fadeIn space-y-12">
                    <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-[#00FF66]/20 animate-breath" />
                        <div className="absolute inset-2 rounded-full border border-[#00FF66]/10 animate-breath" style={{ animationDelay: '1s' }} />
                        <img src="/logo_icon.png" className="w-20 h-20 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(0,255,102,0.3)]" alt="Relaxx" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">
                            Respire <span className="text-[#00FF66]">Fundo</span>
                        </h2>
                        <p className="text-xl text-white/50 font-light max-w-lg mx-auto leading-relaxed">
                            Mantenha o olhar fixo e o corpo estável. O protocolo <span className="text-white font-bold">Relaxx</span> vai iniciar.
                        </p>
                    </div>

                    <div className="pt-4 px-12">
                        <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#00FF66]/10 via-[#00FF66] to-[#00FF66]/10 animate-[progress_5s_linear_forwards]" />
                        </div>
                        <p className="text-[10px] text-[#00FF66] font-black uppercase tracking-[0.5em] mt-6 opacity-40">Ajustando Biometria</p>
                    </div>
                </div>
            ) : (
                <div className="relative z-10 flex items-center justify-center scale-up">
                    <style>{`
                        @keyframes scale-up {
                            0% { transform: scale(0.8); opacity: 0; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        .scale-up { animation: scale-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    `}</style>

                    {/* Fluid Rings */}
                    <div className="absolute w-[400px] h-[400px] rounded-full border border-[#00FF66]/10 animate-breath" />
                    <div className="absolute w-[300px] h-[300px] rounded-full border border-[#00FF66]/20 animate-breath" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute w-[200px] h-[200px] rounded-full border border-[#00FF66]/30 animate-breath" style={{ animationDelay: '1s' }} />

                    <div className="relative flex flex-col items-center">
                        <span key={count} className="text-[160px] md:text-[240px] font-black text-white tracking-tighter animate-in fade-in zoom-in duration-300">
                            {count > 0 ? count : 'GO'}
                        </span>
                        <div className="h-2 w-24 bg-[#00FF66] rounded-full blur-[2px] transition-all duration-300" style={{ opacity: count > 0 ? 0.3 : 1, transform: `scaleX(${count > 0 ? 0.5 : 2})` }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CountdownOverlay;
