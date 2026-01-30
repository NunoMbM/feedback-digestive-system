import { IngestWorkflow } from './ingest';
import { generateDigest } from './logic';

export { IngestWorkflow };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. API: SAVE CONFIGURATION
    if (request.method === 'POST' && url.pathname === '/setup') {
      const { discord_webhook, time, erase_after } = await request.json() as any;
      await env.DB.prepare("DELETE FROM config").run(); 
      await env.DB.prepare(
        "INSERT INTO config (discord_webhook, schedule_time, erase_after) VALUES (?, ?, ?)"
      ).bind(discord_webhook, time, erase_after ? 1 : 0).run();
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. API: INGEST FEEDBACK
    if (request.method === 'POST' && url.pathname === '/feedback') {
      const data = await request.json() as any;
      await env.INGEST_WORKFLOW.create({ params: data });
      return new Response(JSON.stringify({ status: 'queued', id: crypto.randomUUID() }), { 
        status: 202, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 3. API: VIEW DIGESTS
    if (request.method === 'GET' && url.pathname === '/digest') {
      const summary = await generateDigest(env, '24h');
      return new Response(summary, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
    }
    if (request.method === 'GET' && url.pathname === '/digest/all') {
      const summary = await generateDigest(env, 'all');
      return new Response(summary, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
    }

    // 4. THE DASHBOARD (HTML)
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Feedback Digestive System</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f4f9; color: #333; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 600px; }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #d97706; text-align: center; }
        p.subtitle { text-align: center; color: #666; margin-bottom: 2rem; font-size: 0.9rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem; }
        input[type="text"], input[type="time"], select, textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 1.25rem; box-sizing: border-box; font-family: inherit; }
        textarea { resize: vertical; min-height: 80px; }
        .checkbox-group { display: flex; align-items: center; margin-bottom: 1.5rem; }
        .checkbox-group input { margin-right: 0.5rem; width: auto; }
        button { width: 100%; background: #d97706; color: white; padding: 0.75rem; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #b45309; }
        button.secondary { background: #4b5563; margin-top: 5px; }
        button.secondary:hover { background: #374151; }
        .status { margin-top: 1rem; padding: 0.75rem; border-radius: 6px; display: none; text-align: center; font-size: 0.9rem; }
        .success { background: #dcfce7; color: #166534; }
        .section-title { font-size: 0.8rem; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-top: 2rem; margin-bottom: 1rem; font-weight: bold; }
        .links { border-top: 1px solid #eee; padding-top: 1rem; display: flex; flex-direction: column; gap: 10px; }
        .link-row { display: flex; justify-content: space-between; align-items: center; background: #f9fafb; padding: 10px; border-radius: 6px; font-size: 0.9rem; }
        a { color: #d97706; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Feedback System Config</h1>
        <p class="subtitle">Configure automated reports or test the system manually below.</p>
        
        <form id="configForm">
          <label>Discord Webhook URL</label>
          <input type="text" id="webhook" placeholder="https://discord.com/api/webhooks/..." required>
          <label>Daily Report Time (UTC)</label>
          <input type="time" id="time" value="09:00" required>
          <div class="checkbox-group">
            <input type="checkbox" id="erase">
            <label for="erase">Erase webhook after sending (Privacy Mode)</label>
          </div>
          <button type="submit">Save Configuration</button>
        </form>
        <div id="status" class="status success">✅ Settings Saved Successfully!</div>

		<div class="section-title">Test Feedback Ingestion</div>
        
        <label>Source (Simulate where it came from):</label>
        <select id="testSource">
            <option value="Dashboard-Web"> Dashboard Web</option>
            <option value="Twitter"> Twitter / X</option>
            <option value="Email"> Email</option>
            <option value="AppStore"> App Store Review</option>
        </select>

        <label>Feedback Message:</label>
        <textarea id="testMessage" placeholder="Type a bug report or feature request..."></textarea>
        
        <button onclick="testFeedback()" class="secondary">🧪 Send Test Feedback</button>

		<div class="section-title">Manual summary</div>
        <div class="links">
          <div class="link-row"><span>📅 Daily Summary</span><a href="/digest" target="_blank"> /digest</a></div>
          <div class="link-row"><span>📚 All-Time History</span><a href="/digest/all" target="_blank"> /digest/all</a></div>
        </div>
      </div>

      <script>
        document.getElementById('configForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button');
          const original = btn.textContent;
          btn.textContent = 'Saving...';
          const payload = {
            discord_webhook: document.getElementById('webhook').value,
            time: document.getElementById('time').value,
            erase_after: document.getElementById('erase').checked
          };
          await fetch('/setup', { method: 'POST', body: JSON.stringify(payload) });
          btn.textContent = original;
          document.getElementById('status').style.display = 'block';
          setTimeout(() => document.getElementById('status').style.display = 'none', 3000);
        });

        async function testFeedback() {
          const msg = document.getElementById('testMessage').value;
          const src = document.getElementById('testSource').value;
          if (!msg) { alert('❌ Please write a message first!'); return; }
          
          const btn = document.querySelector('button.secondary');
          btn.textContent = 'Sending...';

          await fetch('/feedback', {
            method: 'POST',
            body: JSON.stringify({ source: src, message: msg })
          });
          
          alert('✅ Sent! Source: ' + src + '\\n\\nWait 10s, then click GET /digest.');
          document.getElementById('testMessage').value = '';
          btn.textContent = '🧪 Send Test Feedback';
        }
      </script>
    </body>
    </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const config = await env.DB.prepare("SELECT * FROM config LIMIT 1").first();
    if (config && config.discord_webhook) {
        const summary = await generateDigest(env, '24h');
        await fetch(config.discord_webhook as string, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: "🚨 **Daily Feedback Digest**\n\n" + summary })
        });
        if (config.erase_after === 1) await env.DB.prepare("DELETE FROM config").run();
    }
  },
};