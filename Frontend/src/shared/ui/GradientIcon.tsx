// src/components/GradientIcon.tsx
import React from "react";

interface GradientIconProps {
  Icon: React.ElementType;
  startColor: string;
  endColor: string;
  size: number;
}

const GradientIcon: React.FC<GradientIconProps> = ({
  Icon,
  startColor,
  endColor,
  size,
}) => {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <Icon size={size} fill={`url(#${gradientId})`} />
    </svg>
  );
};

export default GradientIcon;