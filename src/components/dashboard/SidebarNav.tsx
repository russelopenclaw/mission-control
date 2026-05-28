'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const defaultNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/brain', label: 'Brain', icon: '🧠' },
  { href: '/memory', label: 'Memory', icon: '💭' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/docs', label: 'Docs', icon: '📚' },
  { href: '/briefing', label: 'Briefing', icon: '☀️' },
  { href: '/plex', label: 'Plex', icon: '🎬' },
  { href: '/jobs', label: 'Jobs', icon: '💼' },
  { href: '/transcriptions', label: 'Transcriptions', icon: '🎙️' },
];

const STORAGE_KEY = 'mission-control-nav-order';

interface SortableNavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function SortableNavItem({ item, isActive, collapsed, onClick }: SortableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.href });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <Link
        href={item.href}
        className={`flex items-center ${collapsed ? 'justify-center' : ''} px-2.5 py-1 rounded mb-0.5 transition-colors ${
          isActive
            ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
            : 'text-[#a1a1a1] hover:bg-[#27272a] hover:text-[#e8e8e8] border border-transparent'
        }`}
        onClick={onClick}
        title={collapsed ? item.label : undefined}
      >
        <span className="text-base">{item.icon}</span>
        {!collapsed && <span className="ml-2.5 text-sm">{item.label}</span>}
      </Link>
    </div>
  );
}

interface SidebarNavProps {
  collapsed: boolean;
  onNavChange?: (items: NavItem[]) => void;
}

export default function SidebarNav({ collapsed, onNavChange }: SidebarNavProps) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);
  const [isLoaded, setIsLoaded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedOrder = JSON.parse(saved);
        const reordered = [...defaultNavItems].sort((a, b) => {
          const aIndex = savedOrder.indexOf(a.href);
          const bIndex = savedOrder.indexOf(b.href);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        setNavItems(reordered);
      }
    } catch (e) {
      console.error('Failed to load nav order:', e);
    }
    setIsLoaded(true);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex((item) => item.href === active.id);
        const newIndex = items.findIndex((item) => item.href === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        try {
          const order = newItems.map((item) => item.href);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
          onNavChange?.(newItems);
        } catch (e) {
          console.error('Failed to save nav order:', e);
        }
        
        return newItems;
      });
    }
  };

  if (!isLoaded) {
    return (
      <nav className="mt-2 px-2 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
        {defaultNavItems.map((item) => (
          <div
            key={item.href}
            className={`flex items-center ${collapsed ? 'justify-center' : ''} px-2.5 py-1 rounded mb-0.5`}
          >
            <span className="text-base">{item.icon}</span>
            {!collapsed && <span className="ml-2.5 text-sm">{item.label}</span>}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={navItems.map((item) => item.href)}
        strategy={verticalListSortingStrategy}
      >
        <nav className="mt-2 px-2 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
          {navItems.map((item) => (
            <SortableNavItem
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              collapsed={collapsed}
              onClick={() => {}}
            />
          ))}
        </nav>
      </SortableContext>
    </DndContext>
  );
}