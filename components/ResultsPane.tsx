import React from 'react';
import DataTable from './DataTable';
import { SpinnerIcon } from './icons/SpinnerIcon';
import type { QueryResult } from '../types';

interface ResultsPaneProps {
  status: 'idle' | 'running' | 'success' | 'error';
  result: QueryResult | null;
  error: string | null;
}

const ResultsPane: React.FC<ResultsPaneProps> = ({ status, result, error }) => {
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return <div className="text-slate-500">Run a query to see the results here.</div>;
      case 'running':
        return (
          <div className="flex flex-col items-center space-y-2 text-slate-400">
            <SpinnerIcon className="w-8 h-8 animate-spin text-sky-500" />
            <span>Executing query...</span>
          </div>
        );
      case 'error':
        return (
          <div className="w-full max-w-2xl p-4 bg-red-900/50 border border-red-500 rounded-md">
            <h3 className="font-bold text-red-400 mb-2">Execution Error</h3>
            <pre className="text-red-300 text-sm font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        );
      case 'success':
        if (result && result.rows.length > 0) {
          return <DataTable result={result} />;
        }
        if (result && result.rows.length === 0 && result.columns.length > 0) {
          return <div className="text-slate-400">Query executed successfully. No rows returned.</div>;
        }
        if (result && result.rows.length > 0 && result.columns[0] === 'status') {
             return <div className="text-green-400">{result.rows[0][0]}</div>
        }
        return <div className="text-slate-400">Query executed successfully. No rows returned.</div>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex-grow flex flex-col">
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-700">
        <h2 className="text-md font-semibold text-white">Results</h2>
      </div>
      <div className="flex-grow p-4 flex items-center justify-center relative">
        {renderContent()}
      </div>
    </div>
  );
};

export default ResultsPane;
