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
        <div className="fixed inset-0 z-[500] bg-[#001A13]/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-8 transition-opacity duration-500">
            {step === 'INSTRUCTION' ? (
                <div className="text-center max-w-md px-6 animate-fadeIn">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-[#00FF66]/30 flex items-center justify-center mb-8">
                        <svg className="w-10 h-10 text-[#00FF66]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Prepare-se
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
            ) : (
                <div className="relative flex items-center justify-center animate-scaleIn">
                    {/* Pulsing Rings */}
                    <div className="absolute w-[300px] h-[300px] rounded-full border border-[#00FF66]/20 animate-ping" />
                    <div className="absolute w-[200px] h-[200px] rounded-full border border-[#00FF66]/40 animate-pulse" />

                    <span key={count} className="text-[120px] md:text-[180px] font-black text-white tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {count > 0 ? count : 'GO!'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default CountdownOverlay;
