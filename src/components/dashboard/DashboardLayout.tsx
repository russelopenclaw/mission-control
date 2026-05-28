'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import SidebarNav from './SidebarNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/brain': 'Brain',
  '/memory': 'Memory',
  '/calendar': 'Calendar',
  '/docs': 'Docs',
  '/briefing': 'Briefing',
  '/plex': 'Plex',
  '/jobs': 'Jobs',
  '/transcriptions': 'Transcriptions',
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pageTitle = pageTitles[pathname] || 'Mission Control';

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const mainMargin = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64';
  
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#151518] border-b border-[#27272a]">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            className="p-2 -ml-2 text-[#a1a1a1] hover:text-white transition-colors"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-[#e8e8e8]">{pageTitle}</h1>
          <div className="w-10" />
        </div>
      </header>
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full ${sidebarWidth} bg-[#151518] border-r border-[#27272a] z-40 transform transition-all duration-300 lg:translate-x-0 flex flex-col ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`p-4 flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-[#e8e8e8]">🦞 Mission Control</h1>
              <p className="text-[10px] text-[#71717a]">PostgreSQL Edition</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 text-[#525252] hover:text-[#a1a1a1] transition-colors rounded hover:bg-[#27272a]"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        <SidebarNav collapsed={sidebarCollapsed} />
        
        {/* Status indicator */}
        {!sidebarCollapsed && (
          <div className="shrink-0 p-3 mx-2 mb-2 bg-[#0d0d0f] rounded-lg border border-[#27272a]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></div>
              <span className="text-xs text-[#71717a]">Live: PostgreSQL</span>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="shrink-0 flex justify-center pb-4">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" title="Live"></div>
          </div>
        )}
      </aside>
      
      {/* Overlay for mobile */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      
      {/* Main Content */}
      <main className={`${mainMargin} p-4 pt-18 lg:p-8 lg:pt-8 transition-all duration-300`}>
        {children}
      </main>
    </div>
  );
}