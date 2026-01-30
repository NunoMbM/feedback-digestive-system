import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type FeedbackInput = {
  message: string;
  source: string;
};
// Classification categories for each feedback for future analysis
type AIAnalysis = {
  sentiment: string; 
  category: string;
  is_security_risk: boolean;
};

export class IngestWorkflow extends WorkflowEntrypoint<Env, FeedbackInput> {
  async run(event: WorkflowEvent<FeedbackInput>, step: WorkflowStep) {
    const feedback = event.payload;

    // 1. AI Analysis of Feedback
    const analysis = await step.do('analyze-feedback', async () => {
      
      const prompt = `
        Analyze the following user feedback. 
        Return ONLY a JSON object with these fields:
        - sentiment: "positive", "negative", "neutral" or "question" 
        - is_security_risk: boolean (true if it mentions hacking, data leaks, or security)
        - category: One word summary (e.g. Bug, UI, Billing, Feature)

        Feedback: "${feedback.message}"
      `;

      const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a helpful API that returns strict JSON.' },
          { role: 'user', content: prompt }
        ]
      });

      try {
          const text = response.response as string;
          const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          return JSON.parse(jsonStr) as AIAnalysis;
      } catch (e) {
          // UPDATED FALLBACK: Default to 'neutral' if uncertain
          return { sentiment: 'neutral', category: 'Unclassified', is_security_risk: false };
      }
    });

    // 2. Security Alert 
    if (analysis.is_security_risk) {
      await step.do('send-security-alert', async () => {
        console.log(`SECURITY ALERT: ${feedback.message}`);
        //integrate with slack/discord/email APIs to send real alerts
      });
    }

    // 3. Generate Embeddings 
    const vectors = await step.do('generate-vectors', async () => {
      const response = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', { // embedding model
        text: [feedback.message] 
      }) as { data: number[][] }; 

      return response.data[0]; 
    });

    // 4. Save to Memory (D1 & Vectorize)
    await step.do('save-to-db', async () => {
        // A. Insert into SQL
        const result = await this.env.DB.prepare(
            `INSERT INTO feedback (source, content, sentiment, category, is_security_risk) VALUES (?, ?, ?, ?, ?) RETURNING id`
        )
        .bind(feedback.source, feedback.message, analysis.sentiment, analysis.category, analysis.is_security_risk)
        .first<{ id: number }>();

        if (!result) throw new Error("Failed to save to D1");

        // B. Insert into Vector Index
        await this.env.VECTOR_INDEX.upsert([{
            id: result.id.toString(),
            values: vectors,
            metadata: { category: analysis.category, sentiment: analysis.sentiment }
        }]);
    });

    return { status: "processed", analysis };
  }
}