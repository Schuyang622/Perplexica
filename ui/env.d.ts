declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_WS_URL: string;
  }
} 