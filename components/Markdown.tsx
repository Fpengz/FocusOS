
import React from 'react';

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, className = "" }) => {
  // Simple regex parser for basic markdown elements: headings, bold, code, lists
  const parse = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let inList = false;
    let listItems: React.ReactNode[] = [];

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        
        // Headers
        if (line.startsWith('### ')) {
            if (inList) { elements.push(<ul key={`list-${i}`} className="ml-4 mb-2 space-y-1">{listItems}</ul>); inList = false; listItems = []; }
            elements.push(<h3 key={i} className="text-sm font-bold mt-3 mb-1 text-slate-800 dark:text-slate-100">{parseInline(line.slice(4))}</h3>);
        }
        else if (line.startsWith('## ')) {
            if (inList) { elements.push(<ul key={`list-${i}`} className="ml-4 mb-2 space-y-1">{listItems}</ul>); inList = false; listItems = []; }
            elements.push(<h2 key={i} className="text-base font-bold mt-4 mb-2 text-indigo-600 dark:text-indigo-400">{parseInline(line.slice(3))}</h2>);
        }
        else if (line.startsWith('# ')) {
            if (inList) { elements.push(<ul key={`list-${i}`} className="ml-4 mb-2 space-y-1">{listItems}</ul>); inList = false; listItems = []; }
            elements.push(<h1 key={i} className="text-lg font-extrabold mt-5 mb-3">{parseInline(line.slice(2))}</h1>);
        }
        // List items
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            inList = true;
            listItems.push(
                <li key={i} className="text-slate-600 dark:text-slate-300 pl-2 relative before:content-['•'] before:absolute before:left-[-10px] before:text-indigo-400">
                    {parseInline(trimmed.slice(2))}
                </li>
            );
        }
        else if (trimmed.match(/^\d+\. /)) {
             inList = true;
             listItems.push(
                 <li key={i} className="text-slate-600 dark:text-slate-300 list-decimal ml-4">
                     {parseInline(trimmed.replace(/^\d+\. /, ''))}
                 </li>
             );
        }
        // Blockquotes
        else if (trimmed.startsWith('> ')) {
            if (inList) { elements.push(<ul key={`list-${i}`} className="ml-4 mb-2 space-y-1">{listItems}</ul>); inList = false; listItems = []; }
            elements.push(<blockquote key={i} className="border-l-4 border-indigo-500 pl-3 italic text-slate-500 my-2">{parseInline(trimmed.slice(2))}</blockquote>);
        }
        // Normal text or Empty lines
        else {
            if (inList) { elements.push(<ul key={`list-${i}`} className="ml-4 mb-2 space-y-1">{listItems}</ul>); inList = false; listItems = []; }
            
            if (!trimmed) elements.push(<div key={i} className="h-2" />);
            else elements.push(<p key={i} className="mb-1.5 leading-relaxed">{parseInline(line)}</p>);
        }
    });

    if (inList) { elements.push(<ul key="list-end" className="ml-4 mb-2 space-y-1">{listItems}</ul>); }

    return elements;
  };

  const parseInline = (text: string) => {
    // Split by Bold (**text**) and Code (`text`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-500">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return <div className={`text-sm text-slate-700 dark:text-slate-300 ${className}`}>{parse(content)}</div>;
};
