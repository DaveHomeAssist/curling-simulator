import { afterEach, describe, expect, it, vi } from 'vitest';
import { COURT } from './config.js';
import { createHorseshoeRenderer2D } from './renderer2d.js';

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const arcs = [];
  const context = new Proxy({ arc: (x, y, radius) => arcs.push({ x, y, radius }) }, {
    get: (target, key) => target[key] ?? (() => {}),
  });
  const canvas = { setAttribute: vi.fn(), style: {}, getContext: () => context };
  vi.stubGlobal('document', { createElement: () => canvas });
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  const renderer = createHorseshoeRenderer2D({
    appendChild() {},
    getBoundingClientRect: () => ({ width: 420, height: 600 }),
  });
  renderer.resize();
  const draw = (z = 2) => {
    arcs.length = 0;
    const pose = { position: { x: 0.3, y: 0.1, z }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    renderer.render({ previous: pose, current: pose }, 1, { status: 'flying' }, {}, {});
    return structuredClone(arcs);
  };
  return { renderer, draw };
}

describe('fallback court end reversal', () => {
  it('rotates the drawn stake and shoe together and restores them on restart', () => {
    const { renderer, draw } = fixture();
    const first = draw();
    renderer.setEnd(1);
    const opposite = draw();
    expect(opposite).toHaveLength(first.length);
    for (let i = 0; i < first.length; i++) {
      expect(opposite[i].x).toBeCloseTo(420 - first[i].x);
      expect(opposite[i].y).toBeCloseTo(600 - first[i].y);
      expect(opposite[i].radius).toBe(first[i].radius);
    }
    renderer.setEnd(0);
    expect(draw()).toEqual(first);
  });

  it('keeps the active stake and landed shoe in the close view at either end', () => {
    const { renderer, draw } = fixture();
    renderer.setCameraMode('close');
    for (const end of [0, 1]) {
      renderer.setEnd(end);
      expect(renderer.getCamera().end).toBe(end);
      for (const point of draw(COURT.stakeDistance)) {
        expect(point.x).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(420);
        expect(point.y).toBeGreaterThan(0);
        expect(point.y).toBeLessThan(600);
      }
    }
  });
});
