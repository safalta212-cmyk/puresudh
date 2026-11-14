import React from 'react';

interface ProductDescriptionRendererProps {
  content?: string | null;
  className?: string;
}

/**
 * Safely parses inline formatting (*bold*, **bold**, _italic_) without dangerous HTML evaluation
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  // Regex matches **bold**, *bold*, __bold__, _italic_
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      // Strong / Bold (**text** or __text__)
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-stone-900">
          {match[2]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      // Emphasis (*text* or _text_)
      parts.push(
        <em key={`em-${match.index}`} className="italic">
          {match[4]}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Simple, safe parser for HTML tags like <h1>-<h6>, <p>, <ul>, <ol>, <li>, <strong>, <b>, <em>, <i>, <br>
 * Strips script tags, iframes, inline event handlers (onerror, onclick, etc.)
 */
function sanitizeAndParseHtml(htmlString: string): React.ReactNode {
  // If no HTML tags are present, return null to trigger block/markdown parser
  if (!/<[a-z][\s\S]*>/i.test(htmlString)) {
    return null;
  }

  // Remove dangerous script/object/iframe/eval tags
  const sanitized = htmlString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript:/gi, '');

  return (
    <div
      className="prose prose-stone max-w-none text-xs sm:text-sm leading-relaxed text-stone-700 space-y-2 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-stone-900 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-stone-900 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-stone-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:text-stone-600 [&_p]:mb-2 [&_strong]:text-stone-900"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * ProductDescriptionRenderer
 * Formats Hindi and multilingual product descriptions preserving:
 * - Headings (#, ##, ### or line ending with colon)
 * - Bullet lists (•, -, *, numbers)
 * - Bold words (**word** or text with colon)
 * - Multi-paragraph spacing
 * - HTML snippets if pasted from word processors
 */
export const ProductDescriptionRenderer: React.FC<ProductDescriptionRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content || !content.trim()) {
    return <p className={`text-stone-400 italic text-xs ${className}`}>विवरण उपलब्ध नहीं है (No description available)</p>;
  }

  const raw = content.trim();

  // 1. If content contains actual HTML tags, render via safe sanitizer
  const htmlOutput = sanitizeAndParseHtml(raw);
  if (htmlOutput) {
    return <div className={className}>{htmlOutput}</div>;
  }

  // 2. Structured plain text & markdown parser
  // Split content into paragraph blocks separated by 2+ newlines or single newlines
  const lines = raw.split(/\r?\n/);

  // Group lines into blocks (paragraphs, list items, headings)
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      const ListTag = currentList.type;
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`space-y-1.5 pl-5 my-2 ${
            currentList.type === 'ul' ? 'list-disc marker:text-amber-700' : 'list-decimal marker:text-amber-800'
          }`}
        >
          {currentList.items.map((item, idx) => (
            <li key={`li-${idx}`} className="text-stone-700 leading-relaxed pl-1">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Markdown Heading (# Heading, ## Heading, ### Heading)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      if (level === 1) {
        elements.push(
          <h3 key={`h-${index}`} className="text-sm font-bold text-stone-900 mt-3 mb-1.5 border-b border-stone-100 pb-1">
            {renderInlineFormatting(headingText)}
          </h3>
        );
      } else {
        elements.push(
          <h4 key={`h-${index}`} className="text-xs font-bold text-stone-900 mt-2.5 mb-1 text-amber-950">
            {renderInlineFormatting(headingText)}
          </h4>
        );
      }
      return;
    }

    // Bullet list detection (-, *, •, ▪, ‣ or number like 1. 2.)
    const bulletMatch = trimmed.match(/^([•\-\*▪‣]|\d+[\.\)])\s+(.+)$/);
    if (bulletMatch) {
      const isOrdered = /^\d+[\.\)]/.test(bulletMatch[1]);
      const listType = isOrdered ? 'ol' : 'ul';
      const itemText = bulletMatch[2];

      if (!currentList || currentList.type !== listType) {
        flushList();
        currentList = { type: listType, items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Section title / Highlighted subheading (e.g., "मुख्य विशेषताएं:" or "सामग्री / Ingredients:")
    if (trimmed.endsWith(':') && trimmed.length < 80) {
      flushList();
      elements.push(
        <h4 key={`subh-${index}`} className="text-xs font-bold text-stone-900 mt-3 mb-1 text-amber-950 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block"></span>
          <span>{renderInlineFormatting(trimmed)}</span>
        </h4>
      );
      return;
    }

    // Standard paragraph line
    flushList();
    elements.push(
      <p key={`p-${index}`} className="text-stone-700 leading-relaxed mb-2 text-xs sm:text-[13px]">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();

  return (
    <div className={`space-y-1.5 text-stone-700 leading-relaxed ${className}`}>
      {elements}
    </div>
  );
};
