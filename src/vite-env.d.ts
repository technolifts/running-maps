/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly GOOGLE_PLACES_API_KEY: string
  readonly GOOGLE_DIRECTIONS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
