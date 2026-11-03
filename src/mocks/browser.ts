import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Starts answering the real API paths with sample data. Only main.tsx calls this, in dev. */
export async function enableMocks(): Promise<void> {
  // Anything without a mock, such as page assets, goes to the network as normal.
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass' });
}
