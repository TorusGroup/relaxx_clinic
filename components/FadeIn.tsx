
import React, { useEffect, useState } from 'react';

interface FadeInProps {
    children: React.ReactNode;
    duration?: number;
    delay?: number;
    className?: string;
}

const FadeIn: React.FC<FadeInProps> = ({ children, duration = 700, delay = 0, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`transition-all ease-out ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(10px)', // Subtle slide up
            }}
        >
            {children}
        </div>
    );
};

export default FadeIn;
