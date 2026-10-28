import { expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ loaded: vi.fn(), getSession: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({ client: (handler: unknown) => handler }),
}));
vi.mock("@/integrations/supabase/client", () => {
  sdk.loaded();
  return { supabase: { auth: { getSession: sdk.getSession } } };
});

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

it("loads auth only on RPC use and preserves bearer attachment for authenticated requests", async () => {
  expect(sdk.loaded).not.toHaveBeenCalled();
  const middleware = attachSupabaseAuth as unknown as (context: { next: (options: { headers: Record<string, string> }) => unknown }) => Promise<unknown>;
  const next = vi.fn();
  sdk.getSession.mockResolvedValueOnce({ data: { session: { access_token: "test-session-token" } } });
  await middleware({ next });
  expect(sdk.loaded).toHaveBeenCalledOnce();
  expect(next).toHaveBeenLastCalledWith({ headers: { Authorization: "Bearer test-session-token" } });

  sdk.getSession.mockResolvedValueOnce({ data: { session: null } });
  await middleware({ next });
  expect(next).toHaveBeenLastCalledWith({ headers: {} });
});
