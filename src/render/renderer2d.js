import { PHYSICS, SHEET } from '../physics/constants.js';

function makeScale(canvas) {
  const padding = 36;
  const usableWidth = canvas.clientWidth - padding * 2;
  const usableHeight = canvas.clientHeight - padding * 2;
  const scale = Math.min(usableWidth / SHEET.WIDTH, usableHeight / SHEET.LENGTH);
  return { padding, scale };
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
    const { padding, scale } = makeScale(canvas);
    const screenX = padding + ((x + SHEET.WIDTH / 2) * scale);
    const screenY = padding + (y * scale);
    return { x: screenX, y: screenY };
  }

  function drawSheet() {
    const { padding, scale } = makeScale(canvas);
    const width = SHEET.WIDTH * scale;
    const length = SHEET.LENGTH * scale;
    const left = padding;
    const top = padding;

    ctx.save();
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const bg = ctx.createLinearGradient(0, top, 0, top + length);
    bg.addColorStop(0, '#dceeff');
    bg.addColorStop(1, '#b9ddf6');
    ctx.fillStyle = bg;
    ctx.fillRect(left, top, width, length);

    ctx.strokeStyle = '#214867';
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, width, length);

    const line = (y, color, dash = []) => {
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.moveTo(left, top + y * scale);
      ctx.lineTo(left + width, top + y * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    line(SHEET.HOG_LINE_Y, '#d74845');
    line(SHEET.BACK_LINE_Y, '#2e6dc4');
    line(SHEET.TEE_Y, '#2e6dc4');

    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#3a74af';
    ctx.lineWidth = 2;
    ctx.moveTo(left + width / 2, top);
    ctx.lineTo(left + width / 2, top + length);
    ctx.stroke();
    ctx.setLineDash([]);

    const tee = worldToScreen(0, SHEET.TEE_Y);
    const rings = [
      { r: 1.83, color: '#d64f48' },
      { r: 1.22, color: '#ffffff' },
      { r: 0.61, color: '#2a6dc7' },
      { r: 0.15, color: '#ffffff' },
    ];
    for (const ring of rings) {
      ctx.beginPath();
      ctx.fillStyle = ring.color;
      ctx.arc(tee.x, tee.y, ring.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = '#1d3d5b';
    ctx.arc(tee.x, tee.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0d1a26';
    ctx.font = '600 12px system-ui';
    ctx.fillText('Hack', left + width / 2 - 16, top + 16);
    ctx.fillText('House', left + width + 12, tee.y + 4);
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

  function drawStone(stone, selected = false) {
    if (stone.removed || stone.inPlay === false) return;
    const screen = worldToScreen(stone.x, stone.y);
    const { scale } = makeScale(canvas);
    const radius = (stone.radius ?? PHYSICS.STONE_RADIUS) * scale;

    ctx.save();
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
    ctx.restore();
  }

  function drawAim(state) {
    const hack = worldToScreen(0, SHEET.HACK_Y + PHYSICS.STONE_RADIUS * 2.2);
    const broom = worldToScreen(state.aimX, SHEET.TEE_Y - 1.6);
    ctx.save();
    ctx.strokeStyle = state.spin > 0 ? '#9ed0ff' : '#ffc89e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hack.x, hack.y);
    ctx.lineTo(broom.x, broom.y);
    ctx.stroke();
    ctx.fillStyle = '#1e3e63';
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
