/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the tweets microservice. Empty string = same origin. */
  readonly VITE_API_BASE_URL: string;
  /** Must match CLIENT_API_TOKEN in the microservice's .env. */
  readonly VITE_API_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
