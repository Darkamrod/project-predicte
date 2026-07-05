import { handleTrustedScoringRuntimeRequest } from "@/server/scoring/trustedScoringRuntime";
import { createTrustedScoringRuntimeDependencies } from "@/server/scoring/trustedScoringRuntimeFactory";

const headers = {
  "Content-Type": "application/json"
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return createJsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return createJsonResponse({ error: "Trusted worker environment is not configured." }, 500);
  }

  try {
    const body = await request.json();
    const output = await handleTrustedScoringRuntimeRequest(
      body,
      createTrustedScoringRuntimeDependencies({
        url: supabaseUrl,
        serviceRoleKey
      })
    );

    return createJsonResponse(output, 200);
  } catch (error) {
    return createJsonResponse(
      { error: error instanceof Error ? error.message : "Unknown trusted import failure." },
      400
    );
  }
});

function createJsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers
  });
}
