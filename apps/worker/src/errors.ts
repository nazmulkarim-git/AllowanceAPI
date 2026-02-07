export function jsonError(
  status: number,
  message: string,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...extra,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
