'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';

interface DocumentViewerProps {
  content: string;
  filename: string;
  modifiedAt: string;
}

export default function DocumentViewer({ content, filename, modifiedAt }: DocumentViewerProps) {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-[#2a2a2d]">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-[#e0e0e0]">
              {filename.replace('.md', '').replace(/-/g, ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#888]">
            <span className="font-mono text-xs bg-[#151518] px-2 py-1 rounded">
              {filename}
            </span>
            <span>Modified: {new Date(modifiedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="mb-6">
          <TableOfContents content={content} />
        </div>

        {/* Markdown Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : 'text';
                const code = String(children).replace(/\n$/, '');
                
                if (!inline && match) {
                  return (
                    <Highlight theme={themes.vsDark} code={code} language={language}>
                      {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <pre className={`${className} rounded-lg p-4 overflow-x-auto`} style={{...style, background: '#151518', border: '1px solid #2a2a2d'}}>
                          <code>
                            {tokens.map((line, i) => (
                              <div key={i} {...getLineProps({ line })}>
                                {line.map((token, key) => (
                                  <span key={key} {...getTokenProps({ token })} />
                                ))}
                              </div>
                            ))}
                          </code>
                        </pre>
                      )}
                    </Highlight>
                  );
                }
                
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// Inline TableOfContents to avoid import issues
function TableOfContents({ content }: { content: string }) {
  const headings = React.useMemo(() => {
    const matches = content.match(/^(#{1,6})\s+(.+)$/gm);
    if (!matches) return [];

    const headings: any[] = [];
    matches.forEach((match, idx) => {
      const level = match.indexOf('#');
      const text = match.replace(/^#+\s+/, '').trim();
      headings.push({
        level,
        text,
        id: text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim(),
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
