import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './server';

// A request with no mock is a test bug, so it fails loudly instead of reaching a real network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(() => {
  server.close();
});
