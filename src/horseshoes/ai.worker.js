import RAPIER from '@dimforge/rapier3d-compat';
import { planThrow } from './ai.js';
const ready = RAPIER.init();
self.onmessage = async ({ data }) => {
  try {
    await ready;
    self.postMessage({ id: data.id, result: planThrow(RAPIER, data.saved, data.delivery, data.difficulty) });
  } catch (error) { self.postMessage({ id: data.id, error: String(error.message || error) }); }
};
