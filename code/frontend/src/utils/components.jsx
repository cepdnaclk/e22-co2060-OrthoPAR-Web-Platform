import { useRef, useEffect } from "react";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
export const Icons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  scan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  patients: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
    </svg>
  ),
  upload: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
  rotate: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  zoom: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  tooth: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9 2 7 4 7 6c0 1.5.5 3 1 4.5L9 15c.5 2 1 4 2.5 5.5.5.5 1 .5 1 .5s.5 0 1-.5C15 19 15.5 17 16 15l1-4.5c.5-1.5 1-3 1-4.5 0-2-2-4-5-4z" />
    </svg>
  ),
  pdf: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  refresh: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ruler: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>
      <path d="m14.5 12.5 2-2"/>
      <path d="m11.5 9.5 2-2"/>
      <path d="m8.5 6.5 2-2"/>
      <path d="m17.5 15.5 2-2"/>
    </svg>
  ),
};

// ─── Mock 3D Viewer (Canvas-based) ───────────────────────────────────────────
export function Mock3DViewer({ showUpper, showLower, highlightLandmarks }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0;

    function project(x, y, z, cx, cy, scale) {
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);
      const nx = x * cosY - z * sinY;
      const nz = x * sinY + z * cosY;
      const ny = y * cosX - nz * sinX;
      const nzz = y * sinX + nz * cosX;
      const d = 400;
      const perspective = d / (d + nzz + 150);
      return { sx: cx + nx * scale * perspective, sy: cy + ny * scale * perspective, depth: nzz };
    }

    function drawArch(ctx, cx, cy, scale, upperY, color, show, isUpper) {
      if (!show) return;
      const teeth = [];
      const count = 16;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * i) / (count - 1);
        const r = isUpper ? 1.0 : 0.85;
        const x = Math.cos(Math.PI - angle) * r;
        const z = Math.sin(angle) * r * 0.6;
        const y = upperY;
        teeth.push({ x, y, z, angle, idx: i });
      }
      teeth.forEach(({ x, y, z, angle, idx }) => {
        const proj = project(x, y, z, cx, cy, scale);
        const toothW = 14 + Math.abs(Math.sin(angle * 2)) * 4;
        const toothH = 18 + Math.abs(Math.sin(angle * 1.5)) * 6;
        ctx.beginPath();
        ctx.roundRect(proj.sx - toothW / 2, proj.sy - toothH / 2, toothW, toothH, 4);
        const grad = ctx.createRadialGradient(proj.sx - 2, proj.sy - 3, 1, proj.sx, proj.sy, toothW);
        grad.addColorStop(0, "#FFFFFF");
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        if (highlightLandmarks && (idx === 3 || idx === 6 || idx === 9 || idx === 12)) {
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 119, 182, 0.8)";
          ctx.fill();
        }
      });
    }

    function draw() {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = "rgba(226,232,240,0.3)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < w; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }
      for (let j = 0; j < h; j += 30) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
      }

      const cx = w / 2, cy = h / 2, scale = Math.min(w, h) * 0.28;
      frame++;
      if (!isDragging.current) {
        rotationRef.current.y += 0.006;
      }

      // Gum base
      if (showUpper) {
        const gumProj = project(0, -0.15, 0, cx, cy, scale);
        ctx.beginPath();
        ctx.ellipse(gumProj.sx, gumProj.sy, scale * 0.95, scale * 0.38, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 182, 193, 0.25)";
        ctx.fill();
        drawArch(ctx, cx, cy, scale, -0.2, "#E8F4FD", showUpper, true);
      }
      if (showLower) {
        const gumProj2 = project(0, 0.28, 0, cx, cy, scale);
        ctx.beginPath();
        ctx.ellipse(gumProj2.sx, gumProj2.sy, scale * 0.8, scale * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 182, 193, 0.2)";
        ctx.fill();
        drawArch(ctx, cx, cy, scale, 0.3, "#F0F9FF", showLower, false);
      }

      if (highlightLandmarks) {
        ctx.font = "600 10px 'DM Sans', sans-serif";
        ctx.fillStyle = "#0077B6";
        const labels = ["OJ", "OB", "ML", "OCC"];
        labels.forEach((lbl, i) => {
          const angle = (i / 4) * Math.PI * 2;
          const lx = cx + Math.cos(angle) * scale * 0.55;
          const ly = cy + Math.sin(angle) * scale * 0.2;
          ctx.fillText(lbl, lx, ly);
        });
      }
    }

    function animate() { draw(); animRef.current = requestAnimationFrame(animate); }
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [showUpper, showLower, highlightLandmarks]);

  const onMouseDown = (e) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    rotationRef.current.y += dx * 0.008;
    rotationRef.current.x += dy * 0.005;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { isDragging.current = false; };
  const onWheel = (e) => {
    e.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", cursor: isDragging.current ? "grabbing" : "grab", display: "block" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    />
  );
}