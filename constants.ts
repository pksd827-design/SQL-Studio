import type { Schema } from './types';

export const MOCK_SCHEMA: Schema = [
  {
    name: 'employees',
    columns: [
      { name: 'employee_id', type: 'INTEGER' },
      { name: 'first_name', type: 'TEXT' },
      { name: 'last_name', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'hire_date', type: 'DATE' },
      { name: 'department_id', type: 'INTEGER' },
      { name: 'salary', type: 'REAL' },
    ],
  },
  {
    name: 'departments',
    columns: [
      { name: 'department_id', type: 'INTEGER' },
      { name: 'department_name', type: 'TEXT' },
    ],
  },
  {
    name: 'projects',
    columns: [
      { name: 'project_id', type: 'INTEGER' },
      { name: 'project_name', type: 'TEXT' },
      { name: 'start_date', type: 'DATE' },
      { name: 'end_date', type: 'DATE' },
    ],
  },
  {
    name: 'project_assignments',
    columns: [
        { name: 'assignment_id', type: 'INTEGER' },
        { name: 'project_id', type: 'INTEGER' },
        { name: 'employee_id', type: 'INTEGER' },
    ]
  }
];
