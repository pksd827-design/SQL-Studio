import type { Schema, QueryResult, Table, Column } from '../types';
import { MOCK_SCHEMA } from '../constants';

const DB_NAME = 'SQLStudioDB';
const SCHEMA_STORE = '_schema';
let db: IDBDatabase;

// Utility to promisify IndexedDB requests
function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Seeds the database with initial mock data
async function seedDatabase(db: IDBDatabase) {
    const tx = db.transaction([SCHEMA_STORE, ...MOCK_SCHEMA.map(t => t.name)], 'readwrite');
    const schemaStore = tx.objectStore(SCHEMA_STORE);
    for (const table of MOCK_SCHEMA) {
        schemaStore.put(table);
    }

    const employeesStore = tx.objectStore('employees');
    employeesStore.put({ employee_id: 101, first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', hire_date: '2022-01-15', department_id: 2, salary: 75000 });
    employeesStore.put({ employee_id: 102, first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', hire_date: '2021-03-20', department_id: 1, salary: 82000 });
    employeesStore.put({ employee_id: 103, first_name: 'Peter', last_name: 'Jones', email: 'peter.jones@example.com', hire_date: '2022-05-10', department_id: 2, salary: 68000 });
    
    const departmentsStore = tx.objectStore('departments');
    departmentsStore.put({ department_id: 1, department_name: 'Engineering' });
    departmentsStore.put({ department_id: 2, department_name: 'Marketing' });

    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function initDB(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    let isNew = false;
    
    request.onupgradeneeded = (event) => {
        isNew = true;
        const dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.createObjectStore(SCHEMA_STORE, { keyPath: 'name' });
        
        MOCK_SCHEMA.forEach(table => {
            const primaryKey = table.columns[0]?.name;
            if (primaryKey) {
                dbInstance.createObjectStore(table.name, { keyPath: primaryKey, autoIncrement: true });
            }
        });
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      if (isNew) {
        seedDatabase(db).then(() => resolve(true)).catch(reject);
      } else {
        resolve(false);
      }
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getSchema(): Promise<Schema> {
  if (!db) await initDB();
  const tx = db.transaction(SCHEMA_STORE, 'readonly');
  const store = tx.objectStore(SCHEMA_STORE);
  const schema = await promisify(store.getAll());
  return schema as Schema;
}

const parseWhereClause = (whereString: string | undefined): { key: string; value: any } | null => {
    if (!whereString) return null;
    const match = whereString.match(/(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)"|(\d+(?:\.\d+)?))/);
    if (!match) return null;
    const key = match[1];
    const value = match[2] || match[3] || (match[4].includes('.') ? parseFloat(match[4]) : parseInt(match[4], 10));
    return { key, value };
};

const parseValue = (valueStr: string) => {
    const trimmed = valueStr.trim();
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.slice(1, -1);
    }
    if (trimmed.toLowerCase() === 'null') return null;
    if (!isNaN(Number(trimmed))) {
        return Number(trimmed);
    }
    return trimmed;
};

async function executeQueryInternal(sql: string): Promise<QueryResult & { schemaChanged?: boolean }> {
  if (!db) await initDB();
  const upperSql = sql.trim().toUpperCase().replace(/;$/, '');

  // CREATE TABLE ... AS SELECT ...
  if (upperSql.startsWith('CREATE TABLE') && upperSql.includes(' AS ')) {
      const createAsMatch = sql.match(/CREATE TABLE\s+`?(\w+)`?\s+AS\s+([\s\S]+)/i);
      if (!createAsMatch) throw new Error("Invalid CREATE TABLE AS syntax.");
      
      const [, tableName, selectQuery] = createAsMatch;

      const selectParts = selectQuery.trim().split(/UNION ALL/i);
      if (selectParts.length === 0) throw new Error("CREATE TABLE AS requires a valid SELECT statement.");

      let columns: Column[] = [];
      const rows: { [key: string]: any }[] = [];

      for (const [index, part] of selectParts.entries()) {
          const selectContentMatch = part.match(/SELECT\s+([\s\S]+)/i);
          if (!selectContentMatch) continue;

          const valuesStr = selectContentMatch[1].trim();
          
          if (index === 0) {
              // The first SELECT defines the schema (column names and types)
              const columnDefs = valuesStr.split(',').map(def => {
                  const asMatch = def.trim().match(/(.*)\s+AS\s+`?(\w+)`?/i);
                  if (!asMatch) throw new Error(`The first SELECT in a CREATE TABLE AS statement must use aliases (AS) for all columns. Invalid definition: "${def.trim()}"`);
                  return { value: parseValue(asMatch[1]), name: asMatch[2].trim() };
              });
              
              columns = columnDefs.map(def => {
                  const valType = typeof def.value;
                  let type: 'TEXT' | 'INTEGER' | 'REAL' = 'TEXT';
                  if (valType === 'number') {
                      type = Number.isInteger(def.value) ? 'INTEGER' : 'REAL';
                  }
                  return { name: def.name, type };
              });
              
              const row = Object.fromEntries(columnDefs.map(def => [def.name, def.value]));
              rows.push(row);

          } else {
              // Subsequent SELECTs provide values which must match the column count
              if (columns.length === 0) {
                  throw new Error("Internal error: Could not determine schema from the first SELECT statement.");
              }
              const values = valuesStr.split(',').map(v => parseValue(v));
              if (values.length !== columns.length) {
                  throw new Error(`Column count mismatch in a UNION ALL part. The query expects ${columns.length} columns, but found ${values.length}.`);
              }
              const row = Object.fromEntries(columns.map((col, i) => [col.name, values[i]]));
              rows.push(row);
          }
      }
      
      const primaryKey = columns[0]?.name;
      if (!primaryKey) throw new Error("Could not determine a primary key for the new table.");
      
      const newTableSchema: Table = { name: tableName, columns };
      
      const currentVersion = db.version;
      db.close();
      
      await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, currentVersion + 1);
          request.onupgradeneeded = (event) => {
              const upgradeDb = (event.target as IDBOpenDBRequest).result;
              if (!upgradeDb.objectStoreNames.contains(tableName)) {
                  const store = upgradeDb.createObjectStore(tableName, { keyPath: primaryKey });
                  rows.forEach(row => store.add(row));
              }
              const schemaStore = request.transaction!.objectStore(SCHEMA_STORE);
              schemaStore.put(newTableSchema);
          };
          request.onsuccess = () => { request.result.close(); resolve(); };
          request.onerror = reject;
      });

      await initDB();
      return { columns: ['status'], rows: [[`Table "${tableName}" created with ${rows.length} rows.`]], schemaChanged: true };
  }

  // DROP TABLE
  if (upperSql.startsWith('DROP TABLE')) {
    const tableNameMatch = sql.match(/DROP TABLE\s+"?(\w+)"?/i);
    if (!tableNameMatch) throw new Error("Invalid DROP TABLE syntax.");
    const tableName = tableNameMatch[1];

    const currentVersion = db.version;
    db.close();

    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, currentVersion + 1);
        request.onupgradeneeded = (event) => {
            const upgradeDb = (event.target as IDBOpenDBRequest).result;
            if (upgradeDb.objectStoreNames.contains(tableName)) {
                upgradeDb.deleteObjectStore(tableName);
            }
            const schemaStore = request.transaction!.objectStore(SCHEMA_STORE);
            schemaStore.delete(tableName);
        };
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = reject;
    });

    await initDB();
    return { columns: ['status'], rows: [[`Table "${tableName}" dropped successfully.`]], schemaChanged: true };
  }

  // CREATE TABLE
  if (upperSql.startsWith('CREATE TABLE')) {
    const tableNameMatch = sql.match(/CREATE TABLE\s+"?(\w+)"?/i);
    const columnsMatch = sql.match(/\(([\s\S]*)\)/);
    if (!tableNameMatch || !columnsMatch) throw new Error("Invalid CREATE TABLE syntax.");
    const tableName = tableNameMatch[1];

    const columnsStr = columnsMatch[1];
    const columns: { name: string, type: string }[] = columnsStr.split(',').map(part => {
        const cleanedPart = part.trim().replace(/['"`]/g, '');
        const [name, type] = cleanedPart.split(/\s+/);
        return { name, type: type.toUpperCase() };
    });

    const newTable: Table = { name: tableName, columns };
    const primaryKey = newTable.columns[0]?.name;
    if (!primaryKey) throw new Error("Table must have at least one column to be used as a primary key.");

    const currentVersion = db.version;
    db.close();

    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, currentVersion + 1);
        request.onupgradeneeded = (event) => {
            const upgradeDb = (event.target as IDBOpenDBRequest).result;
            if (!upgradeDb.objectStoreNames.contains(tableName)) {
                upgradeDb.createObjectStore(tableName, { keyPath: primaryKey, autoIncrement: true });
            }
            const schemaStore = request.transaction!.objectStore(SCHEMA_STORE);
            schemaStore.put(newTable);
        };
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = reject;
    });
    
    await initDB();
    return { columns: ['status'], rows: [[`Table "${tableName}" created successfully.`]], schemaChanged: true };
  }

  const allStoreNames = Array.from(db.objectStoreNames);
  const tx = db.transaction(allStoreNames, 'readwrite');

  // SELECT
  if (upperSql.startsWith('SELECT')) {
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (!selectMatch) throw new Error("Invalid SELECT syntax. Supported: SELECT cols FROM table [WHERE key=value];");
    
    const [, columnsStr, tableName, whereStr] = selectMatch;
    if (!db.objectStoreNames.contains(tableName)) throw new Error(`Table "${tableName}" not found.`);
    
    const store = tx.objectStore(tableName);
    const where = parseWhereClause(whereStr);

    let records: any[];
    if (where) {
        const record = await promisify(store.get(where.value));
        records = record ? [record] : [];
    } else {
        records = await promisify(store.getAll());
    }

    const columns = columnsStr.trim() === '*' ? (await getSchema()).find(t => t.name === tableName)?.columns.map(c => c.name) ?? [] : columnsStr.split(',').map(c => c.trim());
    
    const rows = records.map(record => columns.map(col => record[col] ?? null));
    return { columns, rows };
  }
  
  // INSERT
  if (upperSql.startsWith('INSERT INTO')) {
    const insertMatch = sql.match(/INSERT INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!insertMatch) throw new Error("Invalid INSERT syntax. Supported: INSERT INTO table (col1, col2) VALUES (val1, val2);");
    
    const [, tableName, colsStr, valsStr] = insertMatch;
    if (!db.objectStoreNames.contains(tableName)) throw new Error(`Table "${tableName}" not found.`);
    
    const columns = colsStr.split(',').map(s => s.trim().replace(/['"`]/g, ''));
    const values = valsStr.split(',').map(s => parseValue(s));

    const newRecord = Object.fromEntries(columns.map((col, i) => [col, values[i]]));
    
    const store = tx.objectStore(tableName);
    await promisify(store.add(newRecord));
    return { columns: ['status'], rows: [[`1 row inserted into "${tableName}".`]] };
  }

  // DELETE
  if (upperSql.startsWith('DELETE FROM')) {
      const deleteMatch = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
      if (!deleteMatch) throw new Error("Invalid DELETE syntax. Supported: DELETE FROM table WHERE key=value;");
      
      const [, tableName, whereStr] = deleteMatch;
      if (!db.objectStoreNames.contains(tableName)) throw new Error(`Table "${tableName}" not found.`);
      
      const store = tx.objectStore(tableName);
      const where = parseWhereClause(whereStr);
      
      if (!where) throw new Error("DELETE without a WHERE clause is not supported in this version.");

      await promisify(store.delete(where.value));
      return { columns: ['status'], rows: [[`1 row deleted from "${tableName}".`]] };
  }

  throw new Error(`Unsupported SQL command: "${sql.split(' ')[0]}".`);
}

export async function renameTable(oldName: string, newName: string): Promise<void> {
    const currentVersion = db.version;
    db.close();

    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, currentVersion + 1);
        request.onupgradeneeded = (event) => {
            const upgradeDb = (event.target as IDBOpenDBRequest).result;
            const tx = request.transaction!;
            
            const oldStore = tx.objectStore(oldName);
            const newStore = upgradeDb.createObjectStore(newName, { keyPath: oldStore.keyPath as string, autoIncrement: oldStore.autoIncrement });
            
            oldStore.openCursor().onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                if(cursor) {
                    newStore.add(cursor.value);
                    cursor.continue();
                }
            };
            
            upgradeDb.deleteObjectStore(oldName);
            
            const schemaStore = tx.objectStore(SCHEMA_STORE);
            schemaStore.get(oldName).onsuccess = e => {
                const tableData = (e.target as IDBRequest<Table>).result;
                if (tableData) {
                    tableData.name = newName;
                    schemaStore.put(tableData);
                    schemaStore.delete(oldName);
                }
            }
        };
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });

    await initDB();
}

export const executeQuery = executeQueryInternal;