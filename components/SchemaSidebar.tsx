import React, { useState, useEffect } from 'react';
import type { Schema } from '../types';
import { TableIcon } from './icons/TableIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface SchemaSidebarProps {
  schema: Schema;
  onDeleteTable: (tableName: string) => void;
  onRenameTable: (oldName: string, newName: string) => void;
}

const SchemaSidebar: React.FC<SchemaSidebarProps> = ({ schema, onDeleteTable, onRenameTable }) => {
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const handleStartEdit = (name: string) => {
    setEditingTable(name);
    setNewTableName(name);
  };

  const handleCancelEdit = () => {
    setEditingTable(null);
    setNewTableName('');
  };

  const handleSaveRename = () => {
    if (editingTable && newTableName.trim() && editingTable !== newTableName.trim()) {
      onRenameTable(editingTable, newTableName.trim());
    }
    handleCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const isDesktop = () => window.innerWidth >= 768;

  useEffect(() => {
    const handleResize = () => {
        if (isDesktop()) {
            setIsMobileExpanded(true);
        } else {
            setIsMobileExpanded(false);
        }
    }
    window.addEventListener('resize', handleResize);
    handleResize(); // set initial state
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside className="w-full md:w-72 bg-slate-800/50 border-b md:border-b-0 md:border-r border-slate-700 p-4 md:flex-shrink-0 md:overflow-y-auto">
      <button 
        className="w-full flex items-center justify-between md:pointer-events-none"
        onClick={() => !isDesktop() && setIsMobileExpanded(!isMobileExpanded)}
      >
        <h2 className="text-sm font-bold tracking-wider uppercase text-slate-500">Schema</h2>
        <ChevronDownIcon className={`w-5 h-5 text-slate-500 md:hidden transition-transform duration-200 ${isMobileExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isMobileExpanded && (
        <div className="space-y-4 mt-4 md:mt-0">
          {schema.map((table) => (
            <div key={table.name}>
              <div className="group flex items-center justify-between space-x-2 mb-2">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <TableIcon className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  {editingTable === table.name ? (
                    <input
                      type="text"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveRename}
                      autoFocus
                      className="bg-slate-700 text-white text-md font-bold w-full rounded px-1 outline-none ring-2 ring-sky-500"
                    />
                  ) : (
                    <h3 className="text-md font-bold text-sky-400 truncate">{table.name}</h3>
                  )}
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleStartEdit(table.name)} title="Rename table">
                    <PencilIcon className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                  <button onClick={() => onDeleteTable(table.name)} title="Delete table">
                    <TrashIcon className="w-4 h-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
              <ul className="ml-2 pl-4 border-l border-slate-700 space-y-1">
                {table.columns.map((column) => (
                  <li key={column.name} className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 truncate">{column.name}</span>
                    <span className="text-slate-500 font-mono text-xs">{column.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};

export default SchemaSidebar;