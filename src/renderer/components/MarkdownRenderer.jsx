import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Clipboard, Check } from 'lucide-react';
import 'katex/dist/katex.min.css';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2.5 right-2.5 p-1.5 bg-surface-700/80 hover:bg-surface-600 text-gray-300 rounded-lg transition-colors z-10"
      title="Kodu Kopyala"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Clipboard className="w-4 h-4" />}
    </button>
  );
};

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="prose prose-invert max-w-none text-gray-200 text-[14.5px] leading-relaxed select-text space-y-3">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: true }]
        ]}
        rehypePlugins={[
          [rehypeKatex, { output: 'htmlAndMathml', throwOnError: false }]
        ]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (match) {
              return (
                <div className="relative rounded-xl overflow-hidden my-4 border border-surface-700/80 bg-[#161b22] shadow-lg">
                  <div className="flex items-center justify-between px-4 py-2 bg-surface-800/90 border-b border-surface-700/60 text-xs text-gray-400 font-mono">
                    <span className="font-semibold text-primary-400">{match[1]}</span>
                    <CopyButton text={codeString} />
                  </div>
                  <SyntaxHighlighter
                    {...props}
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: '1.2rem',
                      background: 'transparent',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code {...props} className="bg-surface-800/90 border border-surface-700/70 px-1.5 py-0.5 rounded text-xs text-primary-300 font-mono font-medium">
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3.5 last:mb-0 leading-relaxed text-gray-200">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold text-white mt-6 mb-3 border-b border-surface-800 pb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-primary-400 mt-5 mb-2.5 flex items-center gap-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-white mt-4 mb-2">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-3 space-y-1.5 text-gray-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-3 space-y-1.5 text-gray-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          a({ ...props }) {
            return <a {...props} className="text-primary-400 hover:text-primary-300 underline font-medium" target="_blank" rel="noopener noreferrer" />;
          },
          table({ ...props }) {
            return (
              <div className="overflow-x-auto my-4 border border-surface-700/80 rounded-xl bg-surface-900/50">
                <table {...props} className="w-full text-left border-collapse text-xs" />
              </div>
            );
          },
          th({ ...props }) {
            return <th {...props} className="border-b border-surface-700 bg-surface-800/80 px-4 py-3 font-semibold text-gray-200" />;
          },
          td({ ...props }) {
            return <td {...props} className="border-b border-surface-800/80 px-4 py-2.5 text-gray-300" />;
          },
          blockquote({ ...props }) {
            return <blockquote {...props} className="border-l-4 border-primary-500 bg-primary-950/30 px-4 py-3 rounded-r-xl my-4 text-gray-200 italic shadow-sm" />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
