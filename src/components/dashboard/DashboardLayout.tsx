'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/tasks', label: 'Tasks', icon: '📋' },
    { href: '/brain', label: 'Brain', icon: '💡' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/memory', label: 'Memory', icon: '🧠' },
    { href: '/docs', label: 'Docs', icon: '📚' }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-[#e8e8e8]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-sm border-b border-[#27272a]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-medium text-white">
                🎯 Mission Control
              </h1>
              {/* Navigation */}
              <nav className="flex items-center gap-1 ml-6">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-[#27272a] text-white'
                        : 'text-[#888888] hover:text-white hover:bg-[#1a1a1f]'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#888888]">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
