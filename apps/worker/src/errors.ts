// apps/worker/src/errors.ts
export function jsonError(
  status: number,
  code: string,
  message: string,
  env?: any,
  requestId?: string
): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
      request_id: requestId,
    }),
    { status, headers: { "content-type": "application/json" } }
  );
}
