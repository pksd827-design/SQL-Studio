export interface Column {
  name: string;
  type: string;
}

export interface Table {
  name: string;
  columns: Column[];
}

export type Schema = Table[];

export interface QueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}
