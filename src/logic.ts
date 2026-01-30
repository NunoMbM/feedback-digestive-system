// src/logic.ts
import { WorkflowStep } from 'cloudflare:workers';

export async function generateDigest(env: Env, timeRange: '24h' | 'all') {
  
  // 1. Decide which SQL query to use
  let query = "SELECT source, content, category FROM feedback";
  
  if (timeRange === '24h') {
    query += " WHERE created_at > datetime('now', '-1 day')";
  }
  // If 'all', we just use the base query without the WHERE clause

  // 2. Fetch Data
  const { results } = await env.DB.prepare(query).all();

  if (!results || results.length === 0) {
    return "No feedback found for this time range.";
  }

  // 3. Format for AI
  const feedbackList = results.map((f: any) => `- [${f.category}] ${f.content}`).join('\n');
  const prompt = `
    You are a Product Manager Assistant. 
    Analyze the following feedback data

    Group feedback by Key Themes.
    Report the data in this format:
        Theme: <Theme Name> (Count: X)
        Summary: <Brief summary of the feedbacks in this theme>
        Sentiment: <Overall sentiment of this theme>

    Note if a feedback doesn't fit any theme, categorize it under "Other".

    Time Range: ${timeRange === '24h' ? 'Last 24 Hours' : 'All Time History'}
    
    Data:
    ${feedbackList}
  `;

  // 4. Run AI
  const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }]
  });

  return response.response as string;
}