'use client';

import React, { useMemo } from 'react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  content: string;
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => {
    const matches = content.match(/^(#{1,6})\s+(.+)$/gm);
    if (!matches) return [];

    const headings: Heading[] = [];
    matches.forEach(match => {
      const level = match.indexOf(' ');
      const text = match.replace(/^#+\s+/, '').trim();
      headings.push({
        level,
        text,
        id: generateId(text),
      });
    });
    return headings;
  }, [content]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-[#151518] rounded-lg border border-[#2a2a2d]">
      <h3 className="text-sm font-semibold text-[#e0e0e0] mb-3">Table of Contents</h3>
      <nav>
        <ul className="space-y-1">
          {headings.map((heading, index) => (
            <li
              key={index}
              style={{ marginLeft: `${(heading.level - 1) * 12}px` }}
            >
              <a
                href={`#${heading.id}`}
                className={`text-sm text-[#5e6ad2] hover:text-[#7a85e8] transition-colors block py-1 ${
                  heading.level === 1 ? 'font-medium' : ''
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
