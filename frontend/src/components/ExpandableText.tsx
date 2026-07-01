import React, { useState } from 'react';

interface ExpandableTextProps {
  text: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  // Heuristic: consider long if > 70 characters or contains multiple lines
  const isLong = text.length > 70 || text.split('\n').length > 2;

  if (!isLong) {
    return <span className="block whitespace-pre-wrap">{text}</span>;
  }

  return (
    <div>
      <div className={isExpanded ? "whitespace-pre-wrap leading-relaxed" : "line-clamp-2 whitespace-pre-wrap leading-relaxed"}>
        {text}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] mt-0.5 cursor-pointer block focus:outline-none select-none hover:underline"
      >
        {isExpanded ? 'read less' : 'read more....'}
      </button>
    </div>
  );
};
