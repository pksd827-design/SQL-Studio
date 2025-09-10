import React from 'react';
import type { QueryResult } from '../types';

interface DataTableProps {
  result: QueryResult;
}

const DataTable: React.FC<DataTableProps> = ({ result }) => {
  return (
    <div className="w-full h-full overflow-auto border border-slate-700 rounded-lg">
      <table className="w-full min-w-max text-left text-sm font-mono">
        <thead className="sticky top-0 bg-slate-800 z-10">
          <tr>
            {result.columns.map((col, index) => (
              <th key={index} className="p-3 border-b border-r border-slate-700 font-semibold text-slate-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-700/50 transition-colors duration-150">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-3 border-b border-r border-slate-700 text-slate-400 whitespace-nowrap">
                  {cell === null ? (
                    <span className="text-slate-500 italic">NULL</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
