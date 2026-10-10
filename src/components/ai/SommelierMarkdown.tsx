import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface SommelierMarkdownProps {
  content: string;
  className?: string;
  onTeaTagClick?: (name: string) => void;
}

export const SommelierMarkdown: React.FC<SommelierMarkdownProps> = ({
  content,
  className = '',
  onTeaTagClick
}) => {
  const sanitizedHtml = useMemo(() => {
    if (!content) return '';

    try {
      // 1. Pre-process text:
      // Convert Chinese bullet characters (•, ·) at the start of lines into markdown standard -
      let normalized = content
        .replace(/\r\n/g, '\n')
        .replace(/^[•·]\s+/gm, '- ')
        .replace(/\n[•·]\s+/g, '\n- ');

      // 2. Configure marked parser
      marked.setOptions({
        gfm: true,
        breaks: true
      });

      const rawHtml = marked.parse(normalized) as string;

      // 3. Post-process: wrap 【...】 book/item titles with elegant oriental clickable tags
      const withInteractiveTags = rawHtml.replace(/【(.*?)】/g, (_match, name) => {
        const cleanName = name.replace(/<[^>]+>/g, '').trim();
        return `<span class="tea-bracket-tag inline-flex items-center text-[#2e4f46] font-semibold bg-emerald-50/90 border border-emerald-300/60 px-1.5 py-0.5 rounded text-[12px] my-0.5 cursor-pointer hover:bg-emerald-100 hover:border-emerald-400 hover:text-[#1d3831] transition-all shadow-2xs" data-tea-name="${cleanName}" title="点击定位藏品详情">【${cleanName}】</span>`;
      });

      // 4. Sanitize with DOMPurify
      return DOMPurify.sanitize(withInteractiveTags, {
        ADD_TAGS: ['span', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ADD_ATTR: ['class', 'data-tea-name', 'target', 'rel', 'title']
      });
    } catch (err) {
      console.error('Failed to parse sommelier markdown:', err);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`sommelier-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const tag = target.closest('[data-tea-name]');
        if (tag && onTeaTagClick) {
          const teaName = tag.getAttribute('data-tea-name');
          if (teaName) {
            e.preventDefault();
            e.stopPropagation();
            onTeaTagClick(teaName);
          }
        }
      }}
    />
  );
};
