import React, { useRef } from 'react';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  tiltDegree?: number;
}

const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  tiltDegree = 8,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -tiltDegree;
    const rotateY = ((x - centerX) / centerX) * tiltDegree;
    cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    cardRef.current.style.transition = 'transform 0.4s ease-out';
  };

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = 'transform 0.1s ease-out';
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{ willChange: 'transform', cursor: 'pointer' }}
    >
      {children}
    </div>
  );
};

export default TiltedCard;
