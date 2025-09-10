import React, { useState } from 'react';
import Modal from './Modal';

interface WelcomeModalProps {
  isOpen: boolean;
  onSave: (name: string) => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onSave }) => {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { /* Don't close on overlay click */ }}>
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to SQL Studio</h2>
        <p className="text-slate-400 mb-6">Please enter your name to get started.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 text-lg text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Your Name"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="mt-6 w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-3 rounded-md text-sm transition-colors duration-200 disabled:bg-sky-800 disabled:cursor-not-allowed"
        >
          Save and Continue
        </button>
      </div>
    </Modal>
  );
};

export default WelcomeModal;
