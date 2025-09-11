import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SchemaSidebar from './components/SchemaSidebar';
import AIPanel from './components/AIPanel';
import SqlEditor from './components/SqlEditor';
import ResultsPane from './components/ResultsPane';
import WelcomeModal from './components/WelcomeModal';
import NewTableModal from './components/NewTableModal';
import { initDB, getSchema, executeQuery, renameTable } from './services/dbService';
import type { Schema, QueryResult } from './types';

type QueryStatus = 'idle' | 'running' | 'success' | 'error';

function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [showNewTableModal, setShowNewTableModal] = useState<boolean>(false);

  const [schema, setSchema] = useState<Schema>([]);
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM employees;");
  
  const [queryStatus, setQueryStatus] = useState<QueryStatus>('idle');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshSchema = useCallback(async () => {
    const currentSchema = await getSchema();
    setSchema(currentSchema);
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('sql_studio_username');
    if (storedName) {
      setUsername(storedName);
      setShowWelcomeModal(false);
    } else {
      setShowWelcomeModal(true);
    }

    initDB().then(() => {
        console.log("Database initialized");
        refreshSchema();
    });
  }, [refreshSchema]);

  const handleSaveUsername = (name: string) => {
    if (name.trim()) {
      setUsername(name.trim());
      localStorage.setItem('sql_studio_username', name.trim());
      setShowWelcomeModal(false);
    }
  };

  const handleRunQuery = useCallback(async (query: string = sqlQuery) => {
    setQueryStatus('running');
    setErrorMessage(null);
    setQueryResult(null);
  
    try {
      const result = await executeQuery(query);
      setQueryResult(result);
      setQueryStatus('success');
      if (result.schemaChanged) {
        await refreshSchema();
      }
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unknown error occurred.');
      }
      setQueryStatus('error');
    }
  }, [sqlQuery, refreshSchema]);
  

  const handleSqlGenerated = (generatedSql: string) => {
    setSqlQuery(generatedSql);
  };
  
  const handleCreateTable = (createQuery: string) => {
     setSqlQuery(createQuery);
     handleRunQuery(createQuery);
     setShowNewTableModal(false);
  }

  const handleDeleteTable = useCallback(async (tableName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the table "${tableName}"?`)) {
      const dropQuery = `DROP TABLE ${tableName};`;
      setSqlQuery(dropQuery);
      await handleRunQuery(dropQuery);
    }
  }, [handleRunQuery]);

  const handleRenameTable = useCallback(async (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;
    try {
        await renameTable(oldName, newName);
        await refreshSchema();
        setSqlQuery(`-- Renamed table ${oldName} to ${newName}\nSELECT * FROM ${newName};`);
    } catch(err) {
        if (err instanceof Error) {
            setErrorMessage(`Failed to rename table: ${err.message}`);
        } else {
            setErrorMessage('An unknown error occurred during rename.');
        }
        setQueryStatus('error');
    }
  }, [refreshSchema]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-300">
      <Header username={username} onNewTableClick={() => setShowNewTableModal(true)} />

      <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
        <SchemaSidebar 
            schema={schema} 
            onDeleteTable={handleDeleteTable}
            onRenameTable={handleRenameTable}
        />
        
        <div className="flex-grow flex flex-col p-4 space-y-4 overflow-y-auto">
          <AIPanel onSqlGenerated={handleSqlGenerated} schema={schema} />
          
          <div className="flex flex-col min-h-[300px] md:h-1/2 md:min-h-0">
            <SqlEditor
              schema={schema}
              value={sqlQuery}
              onChange={setSqlQuery}
              onRunQuery={() => handleRunQuery()}
              queryStatus={queryStatus}
            />
          </div>

          <div className="flex flex-col min-h-[300px] md:h-1/2 md:min-h-0">
            <ResultsPane
              status={queryStatus}
              result={queryResult}
              error={errorMessage}
            />
          </div>
        </div>
      </main>

      <Footer />

      <WelcomeModal isOpen={showWelcomeModal} onSave={handleSaveUsername} />
      <NewTableModal 
        isOpen={showNewTableModal} 
        onClose={() => setShowNewTableModal(false)}
        onCreate={handleCreateTable}
      />
    </div>
  );
}

export default App;