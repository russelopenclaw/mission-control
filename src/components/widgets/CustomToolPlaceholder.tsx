'use client';

import React from 'react';

interface CustomToolProps {
  title: string;
  icon: string;
  description: string;
  onClick?: () => void;
}

export default function CustomToolPlaceholder({ title, icon, description, onClick }: CustomToolProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-[#151518] border border-[#27272a] rounded-lg p-4 hover:border-[#3f3f46] transition-colors cursor-pointer group"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-sm font-medium text-[#e8e8e8] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[#888888]">
        {description}
      </p>
    </div>
  );
}
