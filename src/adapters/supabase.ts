import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAuth, type Auth, type AuthClient } from "@/domain/auth";
import {
  isAnalysis,
  memoryAnalysisStore,
  persistedAnalysis,
  type AnalysisStorage,
  type AnalysisStore,
  type SavedAnalysisRecord,
} from "@/domain/savedAnalyses";
import type { Analysis } from "@/domain/types";

const URL_NAME = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_NAME = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const AUTH_TIMEOUT_MS = 3000;

type SupabaseEnv =
  | { kind: "configured"; url: string; anonKey: string }
  | { kind: "missing"; names: readonly string[] };

export async function requestAuth(): Promise<Auth> {
  return createAuth(supabaseAuthClient(await requestCookieMethods()));
}

async function requestCookieMethods(): Promise<CookieMethodsServer> {
  const jar = await cookies();
  return {
    getAll: () => jar.getAll(),
    setAll(toSet) {
      try {
        for (const { name, value, options } of toSet) jar.set(name, value, options);
      } catch {
        // Server Components cannot write cookies. refreshSession already rotated them.
      }
    },
  };
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

interface SavedAnalysisRow {
  id: string;
  created_at: string;
  analysis: unknown;
}

interface SavedAnalysisTable {
  insert(values: { user_id: string; analysis: Analysis }): {
    select(columns: "id, created_at, analysis"): {
      single(): Promise<{ data: SavedAnalysisRow | null; error: { message: string } | null }>;
    };
  };
  select(columns: "id, created_at, analysis"): {
    eq(column: "user_id", value: string): {
      order(
        column: "created_at",
        options: { ascending: boolean },
      ): Promise<{ data: SavedAnalysisRow[] | null; error: { message: string } | null }>;
    };
  };
}

const processMemory = memoryAnalysisStore();

export async function saveSignedInAnalysis(
  userId: string,
  analysis: Analysis,
): Promise<{ record: SavedAnalysisRecord; storage: AnalysisStorage }> {
  const snapshot = persistedAnalysis(analysis);
  const remote = await remoteStore();
  if (remote) {
    try {
      return { record: await remote.save(userId, snapshot), storage: "supabase" };
    } catch {
      // The table may be missing, or the request failed. The UI still has a place to keep the row.
    }
  }
  return { record: await processMemory.save(userId, snapshot), storage: "memory" };
}

export async function listSignedInAnalyses(
  userId: string,
): Promise<{ records: SavedAnalysisRecord[]; storage: AnalysisStorage }> {
  const remote = await remoteStore();
  if (remote) {
    try {
      return { records: await remote.list(userId), storage: "supabase" };
    } catch {
      // Same fallback as save. A student still sees rows kept in this process.
    }
  }
  return { records: await processMemory.list(userId), storage: "memory" };
}

async function remoteStore(): Promise<AnalysisStore | null> {
  const parsed = env();
  switch (parsed.kind) {
    case "missing":
      return null;
    case "configured":
      return supabaseAnalysisStore(
        createServerClient(parsed.url, parsed.anonKey, {
          cookies: await requestCookieMethods(),
          global: { fetch: fetchWithTimeout },
        }) as unknown as { from(name: "saved_analyses"): SavedAnalysisTable },
      );
    default: {
      const unreachable: never = parsed;
      return unreachable;
    }
  }
}

function supabaseAnalysisStore(client: { from(name: "saved_analyses"): SavedAnalysisTable }): AnalysisStore {
  const table = client.from("saved_analyses");
  return {
    async save(userId, analysis) {
      const snapshot = persistedAnalysis(analysis);
      const { data, error } = await table
        .insert({ user_id: userId, analysis: snapshot })
        .select("id, created_at, analysis")
        .single();
      if (error || !data) throw new Error(error?.message ?? "save failed");
      const stored = isAnalysis(data.analysis) ? persistedAnalysis(data.analysis) : snapshot;
      return { id: data.id, userId, createdAt: data.created_at, analysis: stored };
    },
    async list(userId) {
      const { data, error } = await table
        .select("id, created_at, analysis")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error || !data) throw new Error(error?.message ?? "list failed");
      return data.flatMap((row) => {
        if (!isAnalysis(row.analysis)) return [];
        return [{ id: row.id, userId, createdAt: row.created_at, analysis: persistedAnalysis(row.analysis) }];
      });
    },
  };
}
