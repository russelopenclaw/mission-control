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
      className="bg-[#151518] border border-[#27272a] rounded-lg p-4 sm:p-5 hover:border-[#3f3f46] hover:bg-[#1a1a1f] transition-colors cursor-pointer group min-h-[120px] flex flex-col justify-center active:bg-[#27272a]"
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
