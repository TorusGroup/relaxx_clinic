import React from 'react';

interface Props {
    title: string;
    icon: string;
    value: string;
    label: string;
    description: string;
    clinicalContext: string;
    color: string;
}

const EducationalCard: React.FC<Props> = ({ title, icon, value, label, description, clinicalContext, color }) => {
    return (
        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 hover:bg-white/[0.07] transition-all duration-500 group">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <h4 className="text-[#00FF66] text-xs font-black uppercase tracking-widest">{title}</h4>
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">Bio-ID: {title.slice(0, 3).toUpperCase()}</span>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{value}</span>
                        <span className="text-xs text-white/40 font-bold uppercase">{label}</span>
                    </div>
                </div>

                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent" />

                <div className="space-y-3">
                    <p className="text-white/60 text-sm leading-relaxed">
                        {description}
                    </p>
                    <div className="bg-[#00FF66]/5 border-l-2 border-[#00FF66] p-3 rounded-r-lg">
                        <p className="text-[11px] text-[#00FF66]/80 font-medium leading-tight">
                            <span className="font-bold uppercase mr-1">Contexto Clínico:</span>
                            {clinicalContext}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EducationalCard;
