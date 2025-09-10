import React from 'react';
import { CubeIcon } from './icons/CubeIcon';

interface HeaderProps {
  username: string | null;
  onNewTableClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ username, onNewTableClick }) => {
  return (
    <header className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <CubeIcon className="w-7 h-7 text-sky-500" />
        <h1 className="text-xl font-bold text-white">SQL Studio</h1>
      </div>
      <div className="flex items-center space-x-4">
        <p className="text-sm text-slate-400">
          Welcome, <span className="font-semibold text-slate-200">{username || 'Guest'}</span>
        </p>
        <div className="w-px h-6 bg-slate-600"></div>
        <button 
          onClick={onNewTableClick}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors duration-200"
        >
          + New Table from Data
        </button>
      </div>
    </header>
  );
};

export default Header;
