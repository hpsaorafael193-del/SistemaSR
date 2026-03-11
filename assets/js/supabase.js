import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://jrthkcnxprgyshufagdx.supabase.co",
  "sb_publishable_bvKKDewQ7_ZX_QrzPwR4og_uh3JtEu4",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

const authCache = {
  session: null,
  updatedAt: 0,
  inFlight: null,
};

export function setCachedSession(session) {
  authCache.session = session || null;
  authCache.updatedAt = Date.now();
}

export async function getSessionLocked({ ttlMs = 400 } = {}) {
  const now = Date.now();

  if (authCache.inFlight) {
    try {
      return await authCache.inFlight;
    } catch {
      return authCache.session || null;
    }
  }

  if (ttlMs > 0 && now - authCache.updatedAt <= ttlMs) {
    return authCache.session || null;
  }

  authCache.inFlight = supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      const session = data?.session || null;
      setCachedSession(session);
      return session;
    })
    .catch((error) => {
      console.warn("Falha ao obter sessão do Supabase:", error);
      return authCache.session || null;
    })
    .finally(() => {
      authCache.inFlight = null;
    });

  return await authCache.inFlight;
}
