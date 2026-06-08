import React, { useEffect } from 'react';

interface MagnetProviderProps {
  /** CSS selector for elements to apply magnetic effect to */
  selector?: string;
  /** Strength divisor (lower = stronger pull) */
  strength?: number;
  /** Padding around elements to activate effect */
  padding?: number;
}

const MagnetProvider: React.FC<MagnetProviderProps> = ({
  selector = '.magnetic',
  strength = 6,
  padding = 100,
}) => {
  useEffect(() => {
    const applyMagnet = (e: MouseEvent) => {
      const els = document.querySelectorAll<HTMLElement>(selector);
      if (!els.length) return;

      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = Math.abs(centerX - e.clientX);
        const distY = Math.abs(centerY - e.clientY);

        if (distX < rect.width / 2 + padding && distY < rect.height / 2 + padding) {
          const offsetX = (e.clientX - centerX) / strength;
          const offsetY = (e.clientY - centerY) / strength;
          el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
          el.style.transition = 'transform 0.15s ease-out';
        } else {
          el.style.transform = '';
          el.style.transition = 'transform 0.4s ease-in-out';
        }
      });
    };

    window.addEventListener('mousemove', applyMagnet, { passive: true });
    return () => {
      window.removeEventListener('mousemove', applyMagnet);
    };
  }, [selector, strength, padding]);

  return null;
};

export default MagnetProvider;
