import React, { useState, useCallback } from 'react';
import Modal from './Modal';

interface NewTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sql: string) => void;
}

type InferredColumn = { name: string; type: 'TEXT' | 'INTEGER' | 'REAL' };

const NewTableModal: React.FC<NewTableModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [tableName, setTableName] = useState('');
  const [rawData, setRawData] = useState('');
  const [inferredSchema, setInferredSchema] = useState<InferredColumn[]>([]);
  const [generatedSql, setGeneratedSql] = useState<string>('');
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const resetState = useCallback(() => {
    setTableName('');
    setRawData('');
    setInferredSchema([]);
    setGeneratedSql('');
    setIsAnalyzed(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnalyze = () => {
    const lines = rawData.trim().split('\n');
    if (lines.length < 2) {
      alert("Please provide at least a header row and one data row.");
      return;
    }
    
    const delimiter = rawData.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/\s+/g, '_').toLowerCase());
    const dataRows = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim()));

    const schema: InferredColumn[] = headers.map((header, i) => {
      const firstDataCell = dataRows[0][i];
      let type: InferredColumn['type'] = 'TEXT';
      if (firstDataCell && !isNaN(Number(firstDataCell))) {
        type = firstDataCell.includes('.') ? 'REAL' : 'INTEGER';
      }
      return { name: header, type };
    });
    setInferredSchema(schema);

    const effectiveTableName = tableName.trim().replace(/\s+/g, '_').toLowerCase() || 'new_table';
    const createSql = `CREATE TABLE "${effectiveTableName}" (\n` +
      schema.map(col => `  "${col.name}" ${col.type}`).join(',\n') +
      `\n);\n`;

    const insertSql = dataRows.map(row => {
      const values = row.map((cell, i) => {
        return schema[i].type === 'TEXT' ? `'${cell.replace(/'/g, "''")}'` : (cell || 'NULL');
      }).join(', ');
      return `INSERT INTO "${effectiveTableName}" (${headers.map(h => `"${h}"`).join(', ')}) VALUES (${values});`;
    }).join('\n');

    setGeneratedSql(createSql + '\n' + insertSql);
    setIsAnalyzed(true);
  };
  
  const handleCreate = () => {
      onCreate(generatedSql);
      handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-5xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">New Table from Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label htmlFor="table-name" className="block text-sm font-medium text-slate-400 mb-1">Table Name</label>
              <input type="text" id="table-name" value={tableName} onChange={e => setTableName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="my_new_table" />
            </div>
            <div>
              <label htmlFor="raw-data" className="block text-sm font-medium text-slate-400 mb-1">Paste Raw Data (CSV or TSV)</label>
              <textarea id="raw-data" value={rawData} onChange={e => setRawData(e.target.value)} rows={8} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="id,name,value&#10;1,first,10.5&#10;2,second,20.0"></textarea>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Schema Preview</h3>
              <div className="bg-slate-900 border border-slate-700 rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {inferredSchema.length === 0 && <p className="text-slate-500 text-sm">Click "Analyze Data" to see schema</p>}
                {inferredSchema.map((col, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-mono text-sky-400">{col.name}</span>
                    <span className="font-mono text-slate-500">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Right Column */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Generated SQL Preview</h3>
            <div className="bg-slate-900 border border-slate-700 rounded-md p-1 h-full max-h-96 overflow-auto">
              <pre className="language-sql text-sm p-3"><code className="font-mono">{generatedSql || '// Click "Analyze Data" to generate SQL'}</code></pre>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-800/50 border-t border-slate-700 px-6 py-4 flex justify-end space-x-3">
        <button onClick={handleClose} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors duration-200">Cancel</button>
        <button onClick={handleAnalyze} className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors duration-200">Analyze Data</button>
        <button onClick={handleCreate} disabled={!isAnalyzed} className="bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors duration-200 disabled:bg-green-800 disabled:cursor-not-allowed">Create Table</button>
      </div>
    </Modal>
  );
};

export default NewTableModal;
