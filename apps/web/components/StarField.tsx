'use client';

import { useEffect, useRef } from 'react';

export default function StarField() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Generate stars
        for (let i = 0; i < 60; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.setProperty('--duration', `${2 + Math.random() * 4}s`);
            star.style.setProperty('--delay', `${Math.random() * 3}s`);
            if (Math.random() > 0.7) {
                star.style.width = '3px';
                star.style.height = '3px';
                star.style.background = '#9361f7';
            }
            container.appendChild(star);
        }

        return () => {
            while (container.firstChild) container.removeChild(container.firstChild);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 overflow-hidden pointer-events-none"
            style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(147, 97, 247, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(232, 67, 147, 0.05) 0%, transparent 50%)',
            }}
        />
    );
}
