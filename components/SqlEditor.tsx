import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Schema } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

// This is required for Prism to work when loaded from a CDN in a modular app
declare const Prism: any;

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRunQuery: () => void;
  schema: Schema;
  queryStatus: 'idle' | 'running' | 'success' | 'error';
}

const sqlKeywords = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'OUTER', 'LEFT', 'RIGHT',
  'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS',
  'LIKE', 'IN', 'BETWEEN', 'EXISTS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'ASC', 'DESC'
];

const dataTypes = ['TEXT', 'INTEGER', 'REAL', 'DATE', 'BOOLEAN', 'VARCHAR', 'CHAR', 'NUMERIC'];

const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange, onRunQuery, schema, queryStatus }) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number, left: number } | null>(null);

  const highlight = (text: string) => {
    if (typeof Prism !== 'undefined' && Prism.languages.sql) {
      return Prism.highlight(text, Prism.languages.sql, 'sql');
    }
    return text;
  };
  
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);
    updateSuggestions(text, e.target.selectionStart);
  };
  
  const updateSuggestions = (text: string, cursorPosition: number) => {
    const textUpToCursor = text.substring(0, cursorPosition);
    const lastWordMatch = textUpToCursor.match(/(\w+)$/);

    if (!lastWordMatch) {
      setSuggestions([]);
      setSuggestionPosition(null);
      return;
    }

    const lastWord = lastWordMatch[1];
    const textBeforeLastWord = textUpToCursor.substring(0, textUpToCursor.length - lastWord.length).trim().toUpperCase();
    
    // --- START: Improved table parsing logic ---
    const upperCaseQuery = value.toUpperCase();
    let tablesInQuery: string[] = [];

    // Extract table names from the part of the query before WHERE, GROUP BY, etc.
    const queryRoot = upperCaseQuery.split(/WHERE|GROUP BY|ORDER BY|LIMIT|;/)[0];

    // Find tables after FROM
    const fromMatch = queryRoot.match(/FROM\s+([A-Z0-9_,\s]+)/);
    if (fromMatch && fromMatch[1]) {
        tablesInQuery.push(...fromMatch[1].split(',').map(t => t.trim()));
    }

    // Find tables after JOINs
    const joinMatches = [...queryRoot.matchAll(/JOIN\s+([A-Z0-9_]+)/g)];
    joinMatches.forEach(match => tablesInQuery.push(match[1].trim()));

    const uniqueTableNamesInQuery = [...new Set(tablesInQuery.filter(Boolean).map(t => t.toLowerCase()))];
    
    const columnsFromQueryTables = schema
      .filter(table => uniqueTableNamesInQuery.includes(table.name.toLowerCase()))
      .flatMap(table => table.columns.map(c => c.name));
    // --- END: Improved table parsing logic ---

    const allTableNames = schema.map(t => t.name);
    const allColumnNames = [...new Set(schema.flatMap(t => t.columns.map(c => c.name)))];

    let suggestionPool: string[] = [];

    if (/\b(FROM|JOIN)$/.test(textBeforeLastWord)) {
      suggestionPool = allTableNames;
    } else if (/\b(WHERE|AND|OR|ON|BY|SET)$/.test(textBeforeLastWord) || textBeforeLastWord.endsWith('=')) {
      suggestionPool = columnsFromQueryTables.length > 0 ? columnsFromQueryTables : allColumnNames;
    } else if (/\b(SELECT)$/.test(textBeforeLastWord) || textUpToCursor.trim().endsWith(',')) {
      const columnSuggestions = columnsFromQueryTables.length > 0 ? columnsFromQueryTables : allColumnNames;
      suggestionPool = [...new Set([...columnSuggestions, '*', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'])];
    } else {
      suggestionPool = [...sqlKeywords, ...allTableNames];
    }
    
    const filtered = suggestionPool
      .filter(word => 
        word.toUpperCase().startsWith(lastWord.toUpperCase()) && 
        word.toUpperCase() !== lastWord.toUpperCase()
      )
      .slice(0, 7);
    
    if (filtered.length > 0) {
      setSuggestions(filtered);
      const lines = textUpToCursor.split('\n');
      const line = lines.length;
      const lastLine = lines[lines.length-1];
      const columnPos = lastLine.length - lastWord.length;
      setSuggestionPosition({ top: line * 20, left: columnPos * 8.4 }); // Approximation for monospace font
    } else {
      setSuggestions([]);
      setSuggestionPosition(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && (e.key === 'Enter' || e.key === 'Return')) {
      e.preventDefault();
      onRunQuery();
    }
    if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault();
        applySuggestion(suggestions[0]);
    }
     if (e.key === 'Escape') {
      setSuggestions([]);
      setSuggestionPosition(null);
    }
  };
  
  const applySuggestion = (suggestion: string) => {
      const editor = editorRef.current;
      if(!editor) return;

      const text = editor.value;
      const cursorPosition = editor.selectionStart;
      const textUpToCursor = text.substring(0, cursorPosition);
      const lastWordMatch = textUpToCursor.match(/(\w+)$/);

      if(lastWordMatch) {
          const lastWord = lastWordMatch[1];
          const newText = textUpToCursor.substring(0, textUpToCursor.length - lastWord.length) + suggestion + ' ' + text.substring(cursorPosition);
          onChange(newText);
          
          setTimeout(() => {
            const newCursorPos = textUpToCursor.length - lastWord.length + suggestion.length + 1;
            editor.selectionStart = editor.selectionEnd = newCursorPos;
          }, 0);
      }
      setSuggestions([]);
      setSuggestionPosition(null);
  }

  useEffect(() => {
    const syncScroll = () => {
      if (editorRef.current && highlightRef.current && lineNumbersRef.current) {
        const { scrollTop, scrollLeft } = editorRef.current;
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    };
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('scroll', syncScroll);
      return () => editor.removeEventListener('scroll', syncScroll);
    }
  }, []);

  const lineNumbers = value.split('\n').map((_, i) => i + 1).join('\n');

  return (
    <div className="flex flex-col flex-grow bg-slate-900 rounded-lg border border-slate-700 overflow-hidden relative">
      <div className="flex-grow relative min-h-0">
        <div className="absolute top-0 left-0 h-full w-full grid grid-cols-[auto,1fr] bg-slate-900">
          <pre ref={lineNumbersRef} className="p-4 pr-2 text-right text-slate-500 font-mono text-sm select-none bg-slate-900 overflow-hidden">
            {lineNumbers}
          </pre>
          <div className="p-0 overflow-hidden relative">
            <pre
              ref={highlightRef}
              className="absolute top-0 left-0 right-0 bottom-0 m-0 p-4 pl-2 font-mono text-sm leading-snug overflow-hidden pointer-events-none"
            >
              <code dangerouslySetInnerHTML={{ __html: highlight(value + '\n') }} />
            </pre>
            <textarea
              ref={editorRef}
              value={value}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onClick={() => { setSuggestions([]); setSuggestionPosition(null); }}
              className="absolute top-0 left-0 right-0 bottom-0 m-0 p-4 pl-2 font-mono text-sm leading-snug bg-transparent text-transparent caret-white outline-none resize-none border-none sql-editor-textarea"
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />
             {suggestionPosition && suggestions.length > 0 && (
                <ul 
                    className="absolute bg-slate-700 border border-slate-600 rounded-md shadow-lg p-1 z-10"
                    style={{ top: suggestionPosition.top + 25, left: suggestionPosition.left + 8 /* manual adjustment */ }}
                >
                    {suggestions.map((s, i) => (
                        <li 
                            key={i} 
                            onClick={() => applySuggestion(s)}
                            className="px-3 py-1 text-sm font-mono text-slate-300 hover:bg-sky-600 rounded cursor-pointer"
                        >
                            {s}
                        </li>
                    ))}
                </ul>
            )}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 p-2 border-t border-slate-700">
        <button
          onClick={onRunQuery}
          disabled={queryStatus === 'running'}
          className="w-full flex items-center justify-center bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-md text-sm transition-colors duration-200 disabled:bg-green-800 disabled:cursor-not-allowed"
        >
          {queryStatus === 'running' ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4 mr-2" />
              Run Query (Ctrl+Enter)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SqlEditor;