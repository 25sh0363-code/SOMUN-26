/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — CONFETTI (footer easter egg)
   Tiny dependency-free canvas confetti. On-brand palette.
   Usage: const confetti = makeConfetti(canvas); confetti.burst(x, y, count)
   x/y are viewport fractions (0..1). Call burst() any time — the loop
   self-starts and self-stops, so there is zero cost while idle.
   ———————————————————————————————————————————————————————————————— */

const EGG_COLORS = [
  "#c8102e", // crimson
  "#8e0b21", // crimson-deep
  "#ece1cb", // beige
  "#b3a487", // beige-dim
  "#f6eedd", // cream
];

export function makeConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  let parts = [];
  let raf = null;
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const d = dpr();
    canvas.width = Math.max(1, canvas.offsetWidth * d);
    canvas.height = Math.max(1, canvas.offsetHeight * d);
  }

  function tick() {
    const d = dpr();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life > 0 && p.y < canvas.height + 40 * d);
    for (const p of parts) {
      p.vy += 0.16 * d; // gravity
      p.vx *= 0.992; // air drag
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life / 45); // fade at end of life
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (parts.length) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function burst(fx = 0.5, fy = 0.5, count = 130) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    resize(); // canvas may have been display:none until the overlay opened
    const d = dpr();
    const cx = canvas.width * fx;
    const cy = canvas.height * fy;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = (3.5 + Math.random() * 9) * d;
      parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * speed * (0.55 + Math.random() * 0.6),
        vy: Math.sin(ang) * speed - (5 + Math.random() * 3) * d, // bias upward
        w: (3 + Math.random() * 4) * d,
        h: (6 + Math.random() * 8) * d,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: EGG_COLORS[(Math.random() * EGG_COLORS.length) | 0],
        life: 85 + Math.random() * 60,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  return { burst };
}
