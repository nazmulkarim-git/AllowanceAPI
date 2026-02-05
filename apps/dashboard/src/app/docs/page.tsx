export default function Docs() {
  return (
    <div className="prose max-w-3xl">
      <h1>Using the proxy</h1>
      <p>Point your agent at the Worker URL and use the allowance key as the Bearer token.</p>
      <pre>
{`export OPENAI_BASE_URL="https://YOUR_WORKER.workers.dev"
export OPENAI_API_KEY="sk_allow_xxx"`}
      </pre>
      <p>Then call an OpenAI-compatible endpoint like <code>/v1/chat/completions</code> using your normal SDK.</p>
    </div>
  );
}
