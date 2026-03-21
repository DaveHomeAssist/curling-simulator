import { PHYSICS, SHEET } from '../physics/constants.js';
import { CHALLENGES } from '../game/challenges.js';

function makeScale(canvas) {
  const padding = 36;
  const usableWidth = canvas.clientWidth - padding * 2;
  const usableHeight = canvas.clientHeight - padding * 2;
  const scale = Math.min(usableWidth / SHEET.LENGTH, usableHeight / SHEET.WIDTH);
  const rinkWidth = SHEET.LENGTH * scale;
  const rinkHeight = SHEET.WIDTH * scale;
  const left = padding + (usableWidth - rinkWidth) / 2;
  const top = padding + (usableHeight - rinkHeight) / 2;
  return { padding, scale, left, top, rinkWidth, rinkHeight };
}

function getDeadStoneScreen(canvas, stone, removedIndex) {
  const { left, top, rinkWidth, rinkHeight } = makeScale(canvas);
  const laneX = stone.team === 'yel'
    ? left + rinkWidth - 30
    : left + 30;
  const laneY = top + 28 + removedIndex * 26;
  return { x: laneX, y: Math.min(laneY, top + rinkHeight - 28) };
}

export function createRenderer2D(canvas) {
  const ctx = canvas.getContext('2d');
  let snapshot = null;

  function resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function worldToScreen(x, y) {
    const { scale, left, top } = makeScale(canvas);
    const screenX = left + (y * scale);
    const screenY = top + ((SHEET.WIDTH / 2 - x) * scale);
    return { x: screenX, y: screenY };
  }

  function drawSheet() {
    const { scale, left, top, rinkWidth, rinkHeight } = makeScale(canvas);

    ctx.save();
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const bg = ctx.createLinearGradient(left, top, left + rinkWidth, top + rinkHeight);
    bg.addColorStop(0, '#050507');
    bg.addColorStop(0.45, '#0b0d14');
    bg.addColorStop(1, '#050507');
    ctx.fillStyle = bg;
    ctx.fillRect(left, top, rinkWidth, rinkHeight);

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, rinkWidth, rinkHeight);

    const line = (y, color, dash = [], vertical = true) => {
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (vertical) {
        ctx.moveTo(left + y * scale, top);
        ctx.lineTo(left + y * scale, top + rinkHeight);
      } else {
        ctx.moveTo(left, top + y * scale);
        ctx.lineTo(left + rinkWidth, top + y * scale);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    line(SHEET.HOG_LINE_Y, '#ff0040');
    line(SHEET.BACK_LINE_Y, '#00ffff');
    line(SHEET.TEE_Y, '#00ffff');

    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#ff0040';
    ctx.lineWidth = 2;
    ctx.moveTo(left, top + rinkHeight / 2);
    ctx.lineTo(left + rinkWidth, top + rinkHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const tee = worldToScreen(0, SHEET.TEE_Y);
    const rings = [
      { r: 1.83, color: '#ff0040' },
      { r: 1.22, color: '#f7fbff' },
      { r: 0.61, color: '#00ffff' },
      { r: 0.15, color: '#f7fbff' },
    ];
    for (const ring of rings) {
      ctx.beginPath();
      ctx.fillStyle = ring.color;
      ctx.arc(tee.x, tee.y, ring.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = '#050507';
    ctx.arc(tee.x, tee.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ffff';
    ctx.font = '600 12px system-ui';
    ctx.fillText('Hack', left + 8, top + rinkHeight / 2 - 12);
    ctx.fillText('House', left + rinkWidth - 48, tee.y - 18);
    ctx.restore();
  }

  function drawPreview(preview) {
    if (!preview || preview.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    preview.forEach((point, index) => {
      const screen = worldToScreen(point.x, point.y);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawChallengeTarget(state) {
    if (state.gameMode !== 'challenge') return;
    const challenge = CHALLENGES.find((entry) => entry.id === state.selectedChallengeId);
    if (!challenge) return;
    const target = worldToScreen(challenge.target.x, challenge.target.y);
    const { scale } = makeScale(canvas);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 222, 114, 0.9)';
    ctx.fillStyle = 'rgba(255, 211, 102, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(target.x, target.y, challenge.target.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(target.x - 10, target.y);
    ctx.lineTo(target.x + 10, target.y);
    ctx.moveTo(target.x, target.y - 10);
    ctx.lineTo(target.x, target.y + 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrails(state) {
    const now = performance.now();
    ctx.save();
    for (const mark of state.effects.wakeTrail ?? []) {
      const screen = worldToScreen(mark.x, mark.y);
      const age = Math.min(1, Math.max(0, (now - mark.createdAt) / 10000));
      ctx.fillStyle = `rgba(255,255,255,${0.16 * (1 - age)})`;
      ctx.beginPath();
      ctx.ellipse(screen.x, screen.y, 10 * (1 - age * 0.5), 4 * (1 - age * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const mark of state.effects.sweepTrail ?? []) {
      const screen = worldToScreen(mark.x, mark.y);
      const age = Math.min(1, Math.max(0, (now - mark.createdAt) / 1400));
      ctx.fillStyle = `rgba(135, 209, 255, ${0.22 * (1 - age)})`;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 16 * (1 - age * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawImpacts(state) {
    const now = performance.now();
    ctx.save();
    for (const event of state.effects.impacts ?? []) {
      const age = Math.min(1, Math.max(0, (now - event.createdAt) / 900));
      const x = event.x ?? 0;
      const y = event.y ?? SHEET.TEE_Y;
      const screen = worldToScreen(x, y);
      ctx.strokeStyle = `rgba(255, 188, 122, ${0.5 * (1 - age)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 10 + age * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStone(stone, selected = false) {
    const removed = stone.removed || stone.inPlay === false;
    const removedIndex = snapshot
      ? snapshot.stones.filter((entry) => (entry.removed || entry.inPlay === false) && entry.team === stone.team)
        .findIndex((entry) => entry.id === stone.id)
      : -1;
    const screen = removed
      ? getDeadStoneScreen(canvas, stone, Math.max(removedIndex, 0))
      : worldToScreen(stone.x, stone.y);
    const { scale } = makeScale(canvas);
    const radius = (stone.radius ?? PHYSICS.STONE_RADIUS) * scale * (removed ? 0.8 : 1);

    ctx.save();
    if (removed) {
      ctx.globalAlpha = 0.75;
    }
    ctx.beginPath();
    ctx.fillStyle = stone.team === 'yel' ? '#e1bf4d' : '#c94a48';
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeStyle = selected ? '#ffffff' : '#2a3440';
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#f7f9fb';
    ctx.arc(screen.x, screen.y, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#11202d';
    ctx.font = `600 ${Math.max(10, radius * 0.8)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(stone.idx).replace(/[^\d]/g, '') || '•', screen.x, screen.y + 1);
    if (removed) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screen.x - radius * 0.7, screen.y - radius * 0.7);
      ctx.lineTo(screen.x + radius * 0.7, screen.y + radius * 0.7);
      ctx.moveTo(screen.x + radius * 0.7, screen.y - radius * 0.7);
      ctx.lineTo(screen.x - radius * 0.7, screen.y + radius * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAim(state) {
    const hack = worldToScreen(0, SHEET.HACK_Y + PHYSICS.STONE_RADIUS * 2.2);
    const broom = worldToScreen(state.aimX, SHEET.TEE_Y - 1.6);
    ctx.save();
    ctx.strokeStyle = state.spin > 0 ? '#00ffff' : '#ff0040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hack.x, hack.y);
    ctx.lineTo(broom.x, broom.y);
    ctx.stroke();
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(broom.x - 18, broom.y - 4, 36, 8);
    ctx.restore();
  }

  return {
    resize,
    sync(state) {
      snapshot = state;
    },
    render() {
      if (!snapshot) return;
      drawSheet();
      drawTrails(snapshot);
      drawImpacts(snapshot);
      drawChallengeTarget(snapshot);
      drawPreview(snapshot.preview);
      snapshot.stones.forEach((stone) => drawStone(stone, stone.id === snapshot.lastReleased));
      if (snapshot.mode !== 'travel' && snapshot.mode !== 'game-over') {
        drawAim(snapshot);
      }
    },
    setVisible(visible) {
      canvas.style.display = visible ? 'block' : 'none';
    },
  };
}
