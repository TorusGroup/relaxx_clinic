
import React, { useEffect, useState } from 'react';

interface Props {
    onComplete: () => void;
}

const CountdownOverlay: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState<'INSTRUCTION' | 'COUNTDOWN'>('INSTRUCTION');
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (step === 'INSTRUCTION') {
            const timer = setTimeout(() => setStep('COUNTDOWN'), 3000); // 3 seconds to read
            return () => clearTimeout(timer);
        }

        if (step === 'COUNTDOWN') {
            if (count > 0) {
                const timer = setTimeout(() => setCount(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                // Give a small moment on "0" (GO) before unmounting
                const timer = setTimeout(() => onComplete(), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [step, count, onComplete]);

    return (
        <div className="fixed inset-0 z-[500] bg-[#001A13]/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-8 transition-all duration-500">
            {step === 'INSTRUCTION' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-[#00FF66]/30 flex items-center justify-center mb-8">
                        <svg className="w-10 h-10 text-[#00FF66]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                        Ajuste sua postura
                    </h2>
                    <p className="text-xl text-gray-400 font-light max-w-lg mx-auto leading-relaxed">
                        Mantenha a cabeça reta e <span className="text-[#00FF66] font-bold">permaneça imóvel</span>.
                    </p>
                    <div className="pt-8">
                        <div className="h-1 w-32 bg-white/10 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-[#00FF66] animate-[progress_3s_linear_forwards]" />
                        </div>
                    </div>
                </div>
            )}

            {step === 'COUNTDOWN' && (
                <div className="relative flex items-center justify-center">
                    {/* Pulsing Rings */}
                    <div className="absolute w-[300px] h-[300px] rounded-full border border-[#00FF66]/20 animate-ping" />
                    <div className="absolute w-[200px] h-[200px] rounded-full border border-[#00FF66]/40 animate-pulse" />

                    <span key={count} className="text-[120px] md:text-[180px] font-black text-white tracking-tighter animate-[scaleIn_0.5s_ease-out_forwards]">
                        {count > 0 ? count : ''}
                    </span>
                </div>
            )}
        </div>
    );
};

export default CountdownOverlay;
