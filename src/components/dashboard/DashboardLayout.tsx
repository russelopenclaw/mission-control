'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/tasks', label: 'Tasks', icon: '📋' },
    { href: '/brain', label: 'Brain', icon: '🧠' },
    { href: '/memory', label: 'Memory', icon: '💭' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/docs', label: 'Docs', icon: '📚' },
  ];
  
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Mobile Menu Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1a1a1b] rounded-md text-white"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        ☰
      </button>
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#151518] border-r border-[#27272a] z-40 transform transition-transform duration-300 lg:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-[#e8e8e8]">🦞 Mission Control</h1>
          <p className="text-xs text-[#71717a] mt-1">PostgreSQL Edition</p>
        </div>
        
        <nav className="mt-6 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-lg mb-2 transition-colors ${
                pathname === item.href
                  ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                  : 'text-[#a1a1a1] hover:bg-[#27272a] hover:text-[#e8e8e8]'
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              <span className="text-lg mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        
        {/* Status indicator */}
        <div className="absolute bottom-6 left-6 right-6 p-3 bg-[#0d0d0f] rounded-lg border border-[#27272a]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></div>
            <span className="text-xs text-[#71717a]">Live: PostgreSQL</span>
          </div>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
