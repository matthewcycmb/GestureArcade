// Juice splatter particles + combo text popups

export function createJuiceParticles(fruit, array) {
  const center = fruit.getCenter();
  const count = 8 + Math.floor(Math.random() * 6);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    array.push({
      type: 'juice',
      x: center.x + (Math.random() - 0.5) * fruit.radius,
      y: center.y + (Math.random() - 0.5) * fruit.radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      radius: 2 + Math.random() * 3,
      color: fruit.color,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.015,
    });
  }
}

export function createComboText(x, y, count, array) {
  array.push({
    type: 'combo',
    x,
    y,
    text: `x${count} COMBO!`,
    life: 1.0,
    decay: 0.012,
    vy: -1.5,
    scale: 1.0 + count * 0.15,
  });
}

export function updateParticles(array, dt) {
  for (let i = array.length - 1; i >= 0; i--) {
    const p = array[i];
    p.life -= p.decay * dt;

    if (p.life <= 0) {
      array.splice(i, 1);
      continue;
    }

    if (p.type === 'juice') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt; // gravity
      p.radius *= (1 - 0.01 * dt);
    } else if (p.type === 'combo') {
      p.y += p.vy * dt;
    }
  }
}

export function drawParticles(ctx, array) {
  for (const p of array) {
    if (p.type === 'juice') {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 'combo') {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.font = `bold ${Math.round(24 * p.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Gold outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }
}
