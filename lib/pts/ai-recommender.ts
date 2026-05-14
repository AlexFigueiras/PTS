import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { predefinedActions } from '@/lib/db/schema';
import { PtsSchema } from '@/validations/pts-schema';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

if (!process.env.GEMINI_API_KEY) {
  console.warn('[AI Recommender] AVISO: GEMINI_API_KEY não encontrada no ambiente.');
}

const aiRecommenderSchema = z.object({
  suggested_actions: z.array(
    z.object({
      action_id: z.string().describe('ID of the predefined action from the catalog'),
      clinical_justification: z.string().describe('Clinical reasoning for choosing this action based on patient data'),
    })
  ),
  vulnerability_index: z.enum(['A', 'B', 'C', 'D', 'E']).describe('Overall risk classification from A (lowest) to E (highest)'),
  potentialities: z.array(z.string()).describe('List of short protective factors and strengths identified (max 5)'),
  fragilities: z.array(z.string()).describe('List of short critical risks and clinical fragilities identified (max 5)'),
  strategic_goals: z.object({
    short_term: z.string().describe('Immediate goals (next few days/weeks)'),
    medium_term: z.string().describe('Stabilization goals (up to 6 months)'),
    long_term: z.string().describe('Reinsertion and autonomy goals (structural)'),
  }),
});

export async function getClinicalAiSuggestions(formData: PtsSchema) {
  const db = getDb();
  
  // 1. Fetch available predefined actions
  console.log('[AI Recommender] Fetching catalog...');
  const catalog = await db.select().from(predefinedActions);
  console.log(`[AI Recommender] Catalog size: ${catalog.length}`);
  
  const catalogContext = catalog.map(a => 
    `ID: ${a.id} | Category: ${a.category} | Title: ${a.title} | Description: ${a.description}`
  ).join('\n');

  // 2. Call AI
  console.log('[AI Recommender] Calling Gemini API...');
  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: aiRecommenderSchema,
      prompt: `
        You are a Clinical Decision Support System for a Mental Health and Substance Abuse clinic (CAPS AD III).
        Analyze the following patient Singular Therapeutic Plan (PTS) form data and provide a comprehensive clinical strategy.

        PATIENT DATA (JSON):
        ${JSON.stringify(formData, null, 2)}

        AVAILABLE ACTIONS CATALOG:
        ${catalogContext}

        INSTRUCTIONS:
        - All output texts (justifications, goals, factors) MUST be in Portuguese (Brazil).
        - Identify clear Potentialities (Fatores Protetivos) and Fragilities (Riscos Críticos).
        - Select up to 5 actions from the catalog with clinical justification.
        - Calculate a Vulnerability Index (A to E):
          - A: Low risk, stable.
          - E: High clinical/social risk, urgent intervention needed.
        - Suggest Strategic Goals for Short, Medium, and Long term.
      `,
    });

    console.log('[AI Recommender] Gemini response received:', JSON.stringify(object, null, 2));
    return object;
  } catch (error) {
    console.error('[AI Recommender] Error calling AI service:', error);
    throw error;
  }
}
