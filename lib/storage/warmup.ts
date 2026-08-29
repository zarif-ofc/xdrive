/**
 * Provider Warmup Module
 *
 * Starts MEGA and Filen authentication in the background immediately
 * when this module is first imported. By the time the user triggers
 * their first upload, the SDK sessions should already be established.
 */

import { getMegaStorage } from './mega';
import { getFilenStorage } from './filen';

let warmedUp = false;

export function warmupStorageProviders(): void {
  if (warmedUp) return;
  warmedUp = true;

  // Fire-and-forget: auth in background, don't block anything
  getMegaStorage()
    .then((sdk) => {
      if (sdk) {
        console.log('[Xdrive] ✓ MEGA pre-auth complete');
      } else {
        console.log('[Xdrive] ✗ MEGA credentials not configured or auth failed');
      }
    })
    .catch((err) => {
      console.warn('[Xdrive] MEGA pre-auth warning:', err?.message || err);
    });

  getFilenStorage()
    .then((sdk) => {
      if (sdk) {
        console.log('[Xdrive] ✓ Filen pre-auth complete');
      } else {
        console.log('[Xdrive] ✗ Filen credentials not configured or auth failed');
      }
    })
    .catch((err) => {
      console.warn('[Xdrive] Filen pre-auth warning:', err?.message || err);
    });
}

// Auto-start warmup the moment this module is imported
warmupStorageProviders();
