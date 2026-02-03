A serverless feedback platform built on the **Cloudflare Developer Platform**. 
It ingests raw user feedback, analyzes it using **Llama-3**, stores it for semantic search, and generates automated summaries sent to **Discord**.

This project uses four Cloudflare technologies:

* Cloudflare Workers:** The core serverless runtime handling HTTP requests and cron triggers.
* Workers AI:** * `@cf/meta/llama-3-8b-instruct`: Performs sentiment analysis, risk detection, and categorization.
    * `@cf/baai/bge-base-en-v1.5`: Generates text embeddings for semantic search.
* Cloudflare Workflows:** Handles durable, asynchronous ingestion to prevent high-traffic bottlenecks.
* D1 Database (SQL):** Stores structured metadata, raw content, and configuration settings.
* Vectorize:** Stores vector embeddings to enable "Semantic Search" (finding similar feedback based on meaning, not just keywords).

---

## Key Features

### 1.  Ingestion 
* Accepts feedback via a simple REST API (`POST /`).
* Uses **Workflows** to queue requests.
* **AI Analysis:** Automatically tags every entry with:
    * **Sentiment:** (Positive, Negative, Neutral)
    * **Category:** (Bug, Feature Request, UI, Billing)
    * **Security Risk:** Boolean flag for urgent issues (e.g., "Data leak").

### 2. Dual-Memory Storage
* **SQL (D1):** For traditional reporting ("How many bugs did we get today?").
* **Vector (Vectorize):** For future RAG (Retrieval-Augmented Generation) capabilities ("Find me all feedback related to 'login issues'").

### 3. Automated Daily Digest
* Runs on a **Cron Trigger** (Scheduled Event).
* Aggregates the last 24 hours of feedback.
* Uses AI to write a human-readable summary.
* Dispatches the report to a **Discord Webhook**.

### 4. Privacy-First Configuration
* Includes a "Self-Destruct" feature for the Discord webhook URL. If configured, the system deletes the webhook credentials from the database immediately after use.

---


## The Source Code - src/
### src/index.ts 
   * The first file that runs when a request hits the server.
       * Router: Checks if the user wants the Home Page (GET /), the Digest (GET /digest), or to submit feedback (POST /).
       * Scheduler: Listens for the "Alarm Clock" (scheduled event) to run the daily summary automatically.
       * HTML Server: Sends the simple webpage.

### src/ingest.ts 
  * A Cloudflare Workflow.
  * The Steps:
       * Receives the feedback.
       * Runs AI (Llama-3) to analyze sentiment and category.
       * Generates Embeddings (BGE-Base) to turn text into math vectors.
       * Saves everything to D1 (SQL) and Vectorize (Vector DB).

### src/logic.ts 
  * A helper file containing pure logic.
  * It keeps index.ts clean by hiding the complex math and AI prompting.
  * Key Function: generateDigest(env, timeRange)
       * It runs the SQL query: "Give me all feedback from the last 24 hours."
       * It sends that list to Llama-3 with a prompt: "Summarize these issues into a report."
