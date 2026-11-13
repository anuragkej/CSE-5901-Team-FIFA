import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuth, type Auth, type AuthClient } from "@/domain/auth";

const URL_NAME = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_NAME = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const AUTH_TIMEOUT_MS = 3000;

type SupabaseEnv =
  | { kind: "configured"; url: string; anonKey: string }
  | { kind: "missing"; names: readonly string[] };

export async function requestAuth(): Promise<Auth> {
  const jar = await cookies();
  return createAuth(
    supabaseAuthClient({
      getAll: () => jar.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) jar.set(name, value, options);
        } catch {
          // Server Components cannot write cookies. refreshSession already rotated them.
        }
      },
    }),
  );
}

export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  if (env().kind === "missing") return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const auth = createAuth(
    supabaseAuthClient({
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        // Supabase sends Cache-Control on the first write so a CDN cannot store the Set-Cookie response.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    }),
  );
  await auth.session();
  return response;
}

function env(): SupabaseEnv {
  return parseSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

function parseSupabaseEnv(raw: { url: string | undefined; anonKey: string | undefined }): SupabaseEnv {
  const url = raw.url?.trim() ?? "";
  const anonKey = raw.anonKey?.trim() ?? "";
  const names: string[] = [];
  if (!httpUrl(url)) names.push(URL_NAME);
  if (!anonKeyToken(anonKey)) names.push(KEY_NAME);
  if (names.length > 0) return { kind: "missing", names };
  return { kind: "configured", url, anonKey };
}

function httpUrl(value: string): boolean {
  if (value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function anonKeyToken(value: string): boolean {
  return value.length > 0 && !/\s/.test(value);
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
}

const notConfigured = {
  data: { user: null, session: null },
  error: { name: "AuthConfigError", message: "Supabase env is not set", code: "not_configured" },
};

const offlineClient: AuthClient = {
  signUp: async () => notConfigured,
  signInWithPassword: async () => notConfigured,
  resetPasswordForEmail: async () => notConfigured,
  signOut: async () => ({ error: null }),
  getClaims: async () => ({ data: null, error: null }),
};

function supabaseAuthClient(cookieMethods: CookieMethodsServer): AuthClient {
  const parsed = env();
  switch (parsed.kind) {
    case "configured":
      return createServerClient(parsed.url, parsed.anonKey, {
        cookies: cookieMethods,
        global: { fetch: fetchWithTimeout },
      }).auth;
    case "missing":
      return offlineClient;
    default: {
      const unreachable: never = parsed;
      return unreachable;
    }
  }
}
