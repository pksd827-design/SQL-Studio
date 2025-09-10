import React, { useState } from 'react';
import { generateSql } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import type { Schema } from '../types';

interface AIPanelProps {
  onSqlGenerated: (sql: string) => void;
  schema: Schema;
}

const AIPanel: React.FC<AIPanelProps> = ({ onSqlGenerated, schema }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const sql = await generateSql(prompt, schema);
      onSqlGenerated(sql);
      setPrompt('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleGenerate();
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-400 mb-2">
        Generate SQL from Natural Language
      </label>
      <div className="flex space-x-2">
        <input
          id="ai-prompt"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., Show me all employees in the Marketing department"
          disabled={isLoading}
          className="flex-grow bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors duration-200 disabled:bg-sky-800 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-900/50 border border-red-500 text-red-400 text-sm rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default AIPanel;
