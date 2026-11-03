import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { env } from '@/shared/lib/env';
import '@/shared/styles/index.css';

async function start() {
  // `env.apiMocking` is false in production, and the DEV check lets the build drop this code.
  if (import.meta.env.DEV && env.apiMocking) {
    const { enableMocks } = await import('./mocks/browser');
    await enableMocks();
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
