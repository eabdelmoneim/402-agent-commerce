/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_FAUCET_URL: string
  readonly VITE_NETWORK: string
  readonly VITE_USDC_CONTRACT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
