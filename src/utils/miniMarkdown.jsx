import React from 'react';

// Parses **bold** and *italic* inline within a single line into React nodes. No
// dangerouslySetInnerHTML — everything is built as real React elements, so there's no
// HTML-injection surface even though the source text comes from an LLM.
// Bold is tried before italic at each position (regex alternation order), so **x** never
// gets misread as italic-wrapped-in-leftover-asterisks.
function parseInline(line, keyPrefix) {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={`${keyPrefix}-${i}`} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <em key={`${keyPrefix}-${i}`} className="italic">{part.slice(1, -1)}</em>;
        }
        return part ? <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment> : null;
    });
}

// Lightweight markdown renderer covering just what Coach Raiga's replies actually use:
// headers (##/###), bold, unordered (-/*) and ordered (1.) lists. No tables/code/links —
// those aren't part of the coach's output format.
export default function renderMiniMarkdown(text) {
    if (!text) return null;
    const lines = text.split('\n');
    const blocks = [];
    let listBuffer = [];
    let listType = null; // 'ul' | 'ol'

    const flushList = () => {
        if (listBuffer.length === 0) return;
        const Tag = listType === 'ol' ? 'ol' : 'ul';
        blocks.push(
            <Tag key={`list-${blocks.length}`} className={Tag === 'ol' ? 'list-decimal pl-5 space-y-1 my-1' : 'list-disc pl-5 space-y-1 my-1'}>
                {listBuffer}
            </Tag>
        );
        listBuffer = [];
        listType = null;
    };

    lines.forEach((line, idx) => {
        const headerMatch = line.match(/^#{2,3}\s+(.*)/);
        const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
        const ulMatch = line.match(/^\s*[-*]\s+(.*)/);

        if (headerMatch) {
            flushList();
            blocks.push(<div key={idx} className="font-bold text-white mt-2 mb-1">{parseInline(headerMatch[1], idx)}</div>);
            return;
        }
        if (olMatch) {
            if (listType !== 'ol') flushList();
            listType = 'ol';
            listBuffer.push(<li key={idx}>{parseInline(olMatch[1], idx)}</li>);
            return;
        }
        if (ulMatch) {
            if (listType !== 'ul') flushList();
            listType = 'ul';
            listBuffer.push(<li key={idx}>{parseInline(ulMatch[1], idx)}</li>);
            return;
        }
        flushList();
        if (line.trim() === '') {
            blocks.push(<div key={idx} className="h-2" />);
        } else {
            blocks.push(<div key={idx}>{parseInline(line, idx)}</div>);
        }
    });
    flushList();

    return blocks;
}
