// components/TypeBadge.tsx

import React from 'react';
import typeColors from "../../lib/typeColors.json";

interface TypeBadgeProps {
  type: string;
  size: number; // This will now represent the size in rem
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, size }) => {
  const color = typeColors[type as keyof typeof typeColors] || '808080'; // Default to gray if type not found

  return (
    <div
      className="rounded-xl cursor-default flex items-center justify-center"
      style={{
        padding: `${size/8}rem ${size/4}rem`,
        backgroundColor: `#${color}`,
      }}
    >
      <p className="text-center capitalize text-white font-semibold" style={{ fontSize: `${size / 4}rem` }}>
        {type}
      </p>
    </div>
  );
};

export default TypeBadge;