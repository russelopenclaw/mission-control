'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts for Mission Control
 * 
 * t → /tasks
 * p → /plex  
 * a → /agents
 * b → /briefing
 * h → / (home)
 * d → /docs
 * / → focus search (future)
 */
export default function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        e.metaKey || e.ctrlKey || e.altKey
      ) {
        return;
      }

      const routes: Record<string, string> = {
        t: '/tasks',
        p: '/plex',
        a: '/agents',
        b: '/briefing',
        h: '/',
        d: '/docs',
        m: '/memory',
        c: '/calendar',
      };

      const path = routes[e.key.toLowerCase()];
      if (path) {
        e.preventDefault();
        router.push(path);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}