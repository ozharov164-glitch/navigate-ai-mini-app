/** Lightweight confetti — pure DOM, no dependencies */
export function burstConfetti(durationMs = 2200): void {
  const colors = ["#22d3ee", "#f5c842", "#34d399", "#a78bfa", "#f472b6"];
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.className = "pointer-events-none fixed inset-0 z-[200] overflow-hidden";
  document.body.appendChild(container);

  const count = 48;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 6;
    p.style.cssText = `
      position:absolute;
      left:${50 + (Math.random() - 0.5) * 60}%;
      top:40%;
      width:${size}px;height:${size}px;
      background:${colors[i % colors.length]};
      border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      opacity:1;
      transform:translate(0,0) rotate(0deg);
      transition:transform ${0.8 + Math.random() * 0.8}s ease-out, opacity ${0.6 + Math.random() * 0.4}s ease-out;
    `;
    container.appendChild(p);
    requestAnimationFrame(() => {
      const dx = (Math.random() - 0.5) * 280;
      const dy = 120 + Math.random() * 320;
      p.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 720}deg)`;
      p.style.opacity = "0";
    });
  }

  window.setTimeout(() => container.remove(), durationMs);
}
