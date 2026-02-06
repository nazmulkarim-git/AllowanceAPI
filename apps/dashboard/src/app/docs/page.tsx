export default function Docs() {
  return (
    <div className="prose max-w-3xl">
      <h1>Forsig Proxy Quickstart</h1>
      <p>
        Forsig is an OpenAI-compatible proxy that enforces budgets, model allowlists, velocity caps, and a circuit breaker.
        You call Forsig the same way you call OpenAI—just change the base URL and set your Forsig allowance key as the API key.
      </p>

      <h2>Environment variables</h2>
      <pre>{`export OPENAI_BASE_URL="https://YOUR_WORKER.workers.dev"
export OPENAI_API_KEY="sk_allow_xxx"`}</pre>

      <h2>Node.js example</h2>
      <pre>{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,        // your Forsig allowance key
  baseURL: process.env.OPENAI_BASE_URL,      // your Forsig worker URL
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello from Forsig" }],
});

console.log(res.choices[0].message.content);`}</pre>

      <h2>Python example</h2>
      <pre>{`from openai import OpenAI
import os

client = OpenAI(
  api_key=os.environ["OPENAI_API_KEY"],
  base_url=os.environ["OPENAI_BASE_URL"],
)

res = client.chat.completions.create(
  model="gpt-4o-mini",
  messages=[{"role":"user","content":"Hello from Forsig"}],
)

print(res.choices[0].message.content)`}</pre>

      <h2>Streaming</h2>
      <p>Forsig supports SSE streaming and settles cost after the stream ends.</p>
      <pre>{`const stream = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Stream me" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices?.[0]?.delta?.content || "");
}`}</pre>

      <h2>Idempotency</h2>
      <p>
        For non-stream requests, set <code>Idempotency-Key</code> to safely retry without double-charging.
        For streaming requests, Forsig prevents duplicates while a stream is in progress (409 on duplicates).
      </p>

      <h2>Headers Forsig adds</h2>
      <ul>
        <li><code>X-Allowance-Agent-Id</code></li>
        <li><code>X-Allowance-Reserved-Cents</code> (stream only)</li>
        <li><code>X-Allowance-Cost-Cents</code> (non-stream)</li>
        <li><code>X-Allowance-Balance-Cents</code> (non-stream)</li>
        <li><code>X-Forsig-Request-Id</code></li>
      </ul>

      <h2>Common error codes</h2>
      <ul>
        <li><code>insufficient_balance</code></li>
        <li><code>velocity_cap_exceeded</code></li>
        <li><code>circuit_breaker_tripped</code></li>
        <li><code>model_not_allowed</code></li>
        <li><code>key_frozen</code></li>
      </ul>
    </div>
  );
}
