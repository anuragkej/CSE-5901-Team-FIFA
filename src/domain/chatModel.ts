/** Preferred model. Switch the running selection to the fallback only when the API rejects this id. */
export const PREFERRED_CHAT_MODEL = "gpt-5-nano";

export const FALLBACK_CHAT_MODEL = "gpt-6-luna";

export const CHAT_TEMPERATURE = 0;

export const CHAT_MAX_OUTPUT_TOKENS = 400;

export type ChatModelId = typeof PREFERRED_CHAT_MODEL | typeof FALLBACK_CHAT_MODEL;
