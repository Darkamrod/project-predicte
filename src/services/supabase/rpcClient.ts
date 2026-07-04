import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseClient } from "@/services/supabase/client";
import type { Database } from "@/services/supabase/database.types";

export type SupabaseRpcClient = Pick<SupabaseClient<Database>, "rpc">;

export function resolveSupabaseRpcClient(client?: SupabaseRpcClient): SupabaseRpcClient {
  return client ?? requireSupabaseClient();
}
