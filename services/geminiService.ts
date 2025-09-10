import { GoogleGenAI } from "@google/genai";
import type { Schema } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

function formatSchemaForPrompt(schema: Schema): string {
    return schema.map(table => 
        `Table "${table.name}" with columns: ${table.columns.map(c => `"${c.name}" (${c.type})`).join(', ')}`
    ).join(';\n');
}

export async function generateSql(prompt: string, schema: Schema): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API key is not configured.");
  }
  
  const model = 'gemini-2.5-flash';

  const fullPrompt = `
    Based on the following SQL schema:
    ---
    ${formatSchemaForPrompt(schema)}
    ---
    Generate a single, valid SQL query that answers the following request.
    Only return the SQL code, with no explanations, backticks, or other text.
    Request: "${prompt}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
    });
    
    // Clean up the response to get only the SQL
    const sql = response.text
      .replace(/^```sql\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    return sql;
  } catch (error) {
    console.error("Error generating SQL from Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate SQL: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
}
