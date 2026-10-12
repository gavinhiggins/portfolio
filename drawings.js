/* ==========================================================================
   ENGINEERING DRAWINGS — Proper technical drawing style
   Dimension lines, centerlines, section views, title blocks, GD&T
   Static by default. Animated ONLY on hover.
   ========================================================================== */

class DrawingEngine {
  constructor() {
    this.sheets = {};
    this.hoverStates = {};
    this.t = {};
    
    this.init();
    this.loop();
  }

  init() {
    const defs = [
      { key: 'suspension', id: 'canvasSuspension' },
      { key: 'yaw',        id: 'canvasYaw' },
      { key: 'balance',    id: 'canvasBalance' },
      { key: 'frc',        id: 'canvasFrc' },
    ];

    defs.forEach(({ key, id }) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || 520;
      const h = rect.height || 380;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      this.sheets[key] = { canvas, ctx, w, h };
      this.hoverStates[key] = false;
      this.t[key] = 0;

      // Hover listeners on parent sheet
      const parent = canvas.closest('.drawing-sheet');
      if (parent) {
        parent.addEventListener('mouseenter', () => { this.hoverStates[key] = true; });
        parent.addEventListener('mouseleave', () => { this.hoverStates[key] = false; });
      }
    });

    // Handle resize
    window.addEventListener('resize', () => {
      Object.keys(this.sheets).forEach(key => {
        const s = this.sheets[key];
        const rect = s.canvas.getBoundingClientRect();
        if (rect.width > 0) {
          const dpr = window.devicePixelRatio || 1;
          s.w = rect.width;
          s.h = rect.height;
          s.canvas.width = rect.width * dpr;
          s.canvas.height = rect.height * dpr;
          s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      });
    });
  }

  loop() {
    // Advance time only when hovered
    Object.keys(this.sheets).forEach(key => {
      if (this.hoverStates[key]) {
        this.t[key] += 0.016;
      }
    });

    this.renderSuspension();
    this.renderYaw();
    this.renderBalance();
    this.renderFrc();

    requestAnimationFrame(() => this.loop());
  }

  // =====================================================================
  // UTILITY: Drawing primitives for engineering drawing style
  // =====================================================================

  // Draw engineering border & margin
  drawBorder(ctx, w, h) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(14, 14, w - 28, h - 28);
  }

  // Dimension line with arrows and measurement text
  drawDimension(ctx, x1, y1, x2, y2, text, offset = 20, side = 'top') {
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.lineWidth = 0.7;
    ctx.font = '9px "IBM Plex Mono", monospace';

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // Normal direction for offset
    const nx = -Math.sin(angle) * offset;
    const ny = Math.cos(angle) * offset;
    const sign = (side === 'bottom' || side === 'right') ? -1 : 1;

    const ox1 = x1 + nx * sign;
    const oy1 = y1 + ny * sign;
    const ox2 = x2 + nx * sign;
    const oy2 = y2 + ny * sign;

    // Extension lines
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(x1, y1); ctx.lineTo(ox1, oy1);
    ctx.moveTo(x2, y2); ctx.lineTo(ox2, oy2);
    ctx.stroke();

    // Dimension line
    ctx.beginPath();
    ctx.moveTo(ox1, oy1); ctx.lineTo(ox2, oy2);
    ctx.stroke();

    // Arrowheads
    const arrowLen = 6;
    const arrowAngle = 0.35;
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(ox1, oy1);
    ctx.lineTo(ox1 + Math.cos(angle + arrowAngle) * arrowLen, oy1 + Math.sin(angle + arrowAngle) * arrowLen);
    ctx.moveTo(ox1, oy1);
    ctx.lineTo(ox1 + Math.cos(angle - arrowAngle) * arrowLen, oy1 + Math.sin(angle - arrowAngle) * arrowLen);
    ctx.stroke();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(ox2, oy2);
    ctx.lineTo(ox2 - Math.cos(angle + arrowAngle) * arrowLen, oy2 - Math.sin(angle + arrowAngle) * arrowLen);
    ctx.moveTo(ox2, oy2);
    ctx.lineTo(ox2 - Math.cos(angle - arrowAngle) * arrowLen, oy2 - Math.sin(angle - arrowAngle) * arrowLen);
    ctx.stroke();

    // Text
    const mx = (ox1 + ox2) / 2;
    const my = (oy1 + oy2) / 2;
    ctx.save();
    ctx.translate(mx, my);
    let textAngle = angle;
    if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) textAngle += Math.PI;
    ctx.rotate(textAngle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#fff';
    ctx.fillRect(-ctx.measureText(text).width / 2 - 2, -11, ctx.measureText(text).width + 4, 12);
    ctx.fillStyle = '#222';
    ctx.fillText(text, 0, -1);
    ctx.restore();
    ctx.restore();
  }

  // Centerline (long-dash-dot)
  drawCenterline(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = '#c00';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([12, 3, 2, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Section hatching (45° diagonal lines in region)
  drawHatch(ctx, x, y, w, h, spacing = 5) {
    ctx.save();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let i = -h; i < w + h; i += spacing) {
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i - h, y + h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Balloon callout (circle with number)
  drawBalloon(ctx, x, y, num, leaderX, leaderY) {
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.lineWidth = 0.7;

    // Leader line
    ctx.beginPath();
    ctx.moveTo(leaderX, leaderY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Circle
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();

    // Number
    ctx.fillStyle = '#222';
    ctx.font = 'bold 8px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), x, y + 0.5);
    ctx.restore();
  }

  // Title block in bottom-right
  drawTitleBlock(ctx, w, h, data) {
    const bw = 220;
    const bh = 58;
    const bx = w - 22 - bw;
    const by = h - 22 - bh;

    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, by, bw, bh);

    // Dividers
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(bx, by + 18); ctx.lineTo(bx + bw, by + 18);
    ctx.moveTo(bx, by + 36); ctx.lineTo(bx + bw, by + 36);
    ctx.moveTo(bx + bw * 0.55, by); ctx.lineTo(bx + bw * 0.55, by + 18);
    ctx.moveTo(bx + bw * 0.55, by + 36); ctx.lineTo(bx + bw * 0.55, by + bh);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#222';
    ctx.font = 'bold 8px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.title || '', bx + 5, by + 9);
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.fillText(data.subtitle || '', bx + 5, by + 27);
    ctx.fillText(data.dwgNo || '', bx + bw * 0.55 + 6, by + 9);
    ctx.fillText(data.material || '', bx + 5, by + 47);
    ctx.fillText(data.scale || '', bx + bw * 0.55 + 6, by + 47);
    ctx.font = '6.5px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('DESIGNED: G. HIGGINS', bx + bw * 0.55 + 6, by + 27);
    ctx.restore();
  }

  // Surface finish symbol
  drawSurfaceFinish(ctx, x, y, val) {
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y - 10);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 18, y);
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 10, y - 14);
    ctx.lineTo(x + 24, y - 14);
    ctx.stroke();
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.fillText(val, x + 12, y - 5);
    ctx.restore();
  }

  // =====================================================================
  // 1. SUSPENSION MODULE — Orthographic front view + section view
  // =====================================================================
  renderSuspension() {
    const s = this.sheets.suspension;
    if (!s) return;
    const { ctx, w, h } = s;
    const t = this.t.suspension;
    const hovered = this.hoverStates.suspension;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f8f6f1';
    ctx.fillRect(0, 0, w, h);

    this.drawBorder(ctx, w, h);

    // Animate: spring compression & wheel rotation
    const compression = hovered ? Math.sin(t * 5) * 18 + 8 : 0;
    const wheelAngle = hovered ? t * 2.5 : 0;

    const cx = w * 0.38;
    const baseY = h * 0.7;

    // -- FRONT VIEW label
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('FRONT VIEW', 24, 30);

    // Centerline (vertical)
    this.drawCenterline(ctx, cx, 45, cx, baseY + 60);

    // Top mounting plate
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#f0ede5';
    ctx.beginPath();
    ctx.rect(cx - 80, 50, 160, 14);
    ctx.fill();
    ctx.stroke();
    this.drawHatch(ctx, cx - 80, 50, 160, 14, 4);

    // Mounting bolts
    [cx - 60, cx - 30, cx + 30, cx + 60].forEach(bx => {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(bx, 57, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8f6f1';
      ctx.beginPath();
      ctx.arc(bx, 57, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dual MGN9H Rails
    const railLeft = cx - 55;
    const railRight = cx + 55;
    const railTop = 64;
    const railBot = baseY - 40;

    [railLeft, railRight].forEach(rx => {
      // Rail body
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.2;
      ctx.fillStyle = '#eee';
      ctx.fillRect(rx - 4, railTop, 8, railBot - railTop);
      ctx.strokeRect(rx - 4, railTop, 8, railBot - railTop);

      // Slider block (moves with compression)
      const sliderY = railTop + 30 - compression * 0.6;
      ctx.fillStyle = '#ddd';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.2;
      ctx.fillRect(rx - 9, sliderY, 18, 28);
      ctx.strokeRect(rx - 9, sliderY, 18, 28);

      // Block detail lines
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(rx - 9, sliderY + 9); ctx.lineTo(rx + 9, sliderY + 9);
      ctx.moveTo(rx - 9, sliderY + 19); ctx.lineTo(rx + 9, sliderY + 19);
      ctx.stroke();
    });

    // Coil spring (center)
    const springTop = 64;
    const springBot = railTop + 50 - compression * 0.6;
    const coils = 7;
    const springW = 22;

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, springTop);
    for (let i = 0; i < coils; i++) {
      const cy1 = springTop + (springBot - springTop) * ((i + 0.25) / coils);
      const cy2 = springTop + (springBot - springTop) * ((i + 0.75) / coils);
      const dir = i % 2 === 0 ? 1 : -1;
      ctx.lineTo(cx + dir * springW, cy1);
      ctx.lineTo(cx - dir * springW, cy2);
    }
    ctx.lineTo(cx, springBot);
    ctx.stroke();

    // Wheel mount plate
    const mountY = baseY - 32 - compression * 0.5;
    ctx.fillStyle = '#e8e5dd';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.fillRect(cx - 48, mountY, 96, 10);
    ctx.strokeRect(cx - 48, mountY, 96, 10);

    // Omni wheel
    const wheelCY = baseY + 10 - compression * 0.3;
    const wheelR = 36;
    ctx.save();
    ctx.translate(cx, wheelCY);
    ctx.rotate(wheelAngle);

    // Outer rim
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bore
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes
    ctx.lineWidth = 0.8;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * (wheelR - 8), Math.sin(a) * (wheelR - 8));
      ctx.stroke();
    }

    // Barrel rollers
    const nRollers = 8;
    for (let i = 0; i < nRollers; i++) {
      const a = (i / nRollers) * Math.PI * 2;
      ctx.save();
      ctx.translate(Math.cos(a) * wheelR, Math.sin(a) * wheelR);
      ctx.rotate(a + Math.PI / 2);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -3, 12, 6);
      ctx.restore();
    }

    // Hub
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dimension lines
    this.drawDimension(ctx, cx - 80, 50, cx + 80, 50, '160.0', 18, 'top');
    this.drawDimension(ctx, cx + 88, 50, cx + 88, mountY + 10, '126.5', 22, 'right');
    this.drawDimension(ctx, cx - 48, mountY + 10, cx + 48, mountY + 10, '96.0', 14, 'bottom');

    // Balloon callouts
    this.drawBalloon(ctx, cx + 115, 58, 1, cx + 80, 57);
    this.drawBalloon(ctx, railRight + 28, railTop + 20, 2, railRight + 9, railTop + 15);
    this.drawBalloon(ctx, cx + 35, springTop + 30, 3, cx + springW, springTop + 25);
    this.drawBalloon(ctx, cx + 85, wheelCY, 4, cx + wheelR + 5, wheelCY);

    // Section view hatch (small A-A cut view on right side)
    const svX = w * 0.72;
    const svY = 48;
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('SECTION A-A (1:2)', svX, svY);

    // Simple cross-section of rail + plate
    const secY = svY + 12;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.2;
    // Plate cross section
    ctx.strokeRect(svX, secY, 80, 12);
    this.drawHatch(ctx, svX, secY, 80, 12, 4);
    // Rail slot
    ctx.strokeRect(svX + 15, secY + 12, 10, 40);
    ctx.strokeRect(svX + 55, secY + 12, 10, 40);
    // Slider
    ctx.fillStyle = '#ddd';
    ctx.fillRect(svX + 10, secY + 18, 20, 24);
    ctx.strokeRect(svX + 10, secY + 18, 20, 24);
    ctx.fillRect(svX + 50, secY + 18, 20, 24);
    ctx.strokeRect(svX + 50, secY + 18, 20, 24);

    // Section line through front view
    this.drawCenterline(ctx, cx, 42, cx, baseY + 55);

    // Notes
    ctx.fillStyle = '#555';
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.fillText('① 0.25" 6061-T6 + 4mm CF PLATE', svX, secY + 80);
    ctx.fillText('② DUAL MGN9H LINEAR RAIL', svX, secY + 92);
    ctx.fillText('③ HELICAL SPRING (k=12.4 N/mm)', svX, secY + 104);
    ctx.fillText('④ OMNI WHEEL ASSEMBLY', svX, secY + 116);
    ctx.fillText('ANSYS: 560N LATERAL / 2x DROP', svX, secY + 134);

    // Surface finish
    this.drawSurfaceFinish(ctx, svX, secY + 150, '3.2');

    // Title block
    this.drawTitleBlock(ctx, w, h, {
      title: 'OMNI SUSPENSION MODULE',
      subtitle: 'ARUW 2027 COMPETITION PLATFORM',
      dwgNo: 'ARUW-SUSP-01 REV B',
      material: '6061-T6 / CF COMPOSITE',
      scale: '1:2'
    });
  }

  // =====================================================================
  // 2. YAW MECHANISM — Top view of turret + gear detail
  // =====================================================================
  renderYaw() {
    const s = this.sheets.yaw;
    if (!s) return;
    const { ctx, w, h } = s;
    const t = this.t.yaw;
    const hovered = this.hoverStates.yaw;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f8f6f1';
    ctx.fillRect(0, 0, w, h);
    this.drawBorder(ctx, w, h);

    const gearAngle = hovered ? t * 1.5 : 0;

    // -- TOP VIEW
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('TOP VIEW — YAW ASSEMBLY', 24, 30);

    const cx = w * 0.35;
    const cy = h * 0.45;
    const outerR = 90;

    // Centerlines
    this.drawCenterline(ctx, cx - outerR - 20, cy, cx + outerR + 20, cy);
    this.drawCenterline(ctx, cx, cy - outerR - 20, cx, cy + outerR + 20);

    // Outer housing
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // Mounting holes on housing
    const mountR = outerR - 8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * mountR, cy + Math.sin(a) * mountR, 3, 0, Math.PI * 2);
      ctx.stroke();
      // Cross for threaded holes
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * mountR - 2, cy + Math.sin(a) * mountR);
      ctx.lineTo(cx + Math.cos(a) * mountR + 2, cy + Math.sin(a) * mountR);
      ctx.moveTo(cx + Math.cos(a) * mountR, cy + Math.sin(a) * mountR - 2);
      ctx.lineTo(cx + Math.cos(a) * mountR, cy + Math.sin(a) * mountR + 2);
      ctx.stroke();
    }

    // Ring gear (with teeth)
    const ringR = 65;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Gear teeth
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(gearAngle);
    const nTeeth = 48;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < nTeeth; i++) {
      const a = (i / nTeeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * ringR, Math.sin(a) * ringR);
      ctx.lineTo(Math.cos(a) * (ringR + 4), Math.sin(a) * (ringR + 4));
      ctx.stroke();
    }
    ctx.restore();

    // Pinion gear (meshing)
    const pinionCX = cx + ringR + 16;
    const pinionCY = cy;
    const pinionR = 16;

    ctx.save();
    ctx.translate(pinionCX, pinionCY);
    ctx.rotate(-gearAngle * (ringR / pinionR)); // Correct gear ratio

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, pinionR, 0, Math.PI * 2);
    ctx.stroke();

    const pTeeth = 12;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < pTeeth; i++) {
      const a = (i / pTeeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * pinionR, Math.sin(a) * pinionR);
      ctx.lineTo(Math.cos(a) * (pinionR + 4), Math.sin(a) * (pinionR + 4));
      ctx.stroke();
    }
    ctx.restore();

    // Pinion center bore
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(pinionCX, pinionCY, 4, 0, Math.PI * 2);
    ctx.stroke();
    this.drawCenterline(ctx, pinionCX - pinionR - 8, pinionCY, pinionCX + pinionR + 8, pinionCY);

    // Turret bore (center)
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bearing cross
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Dimensions
    this.drawDimension(ctx, cx - outerR, cy + outerR + 5, cx + outerR, cy + outerR + 5, 'Ø180.0', 14, 'bottom');
    this.drawDimension(ctx, cx - ringR, cy - outerR - 5, cx + ringR, cy - outerR - 5, 'Ø130.0', 14, 'top');

    // Balloons
    this.drawBalloon(ctx, cx - outerR - 20, cy - 30, 1, cx - outerR + 5, cy - 15);
    this.drawBalloon(ctx, pinionCX + 26, pinionCY - 22, 2, pinionCX + pinionR + 2, pinionCY - 5);
    this.drawBalloon(ctx, cx + 30, cy - 35, 3, cx + 18, cy - 20);

    // -- DETAIL VIEW: Tensioner (right side)
    const dvX = w * 0.72;
    const dvY = 48;
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('DETAIL B — BELT TENSIONER', dvX, dvY);

    // Tensioner mechanism
    const tensY = dvY + 20;
    const tensOff = hovered ? Math.sin(t * 6) * 5 : 0;

    // Belt path
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dvX, tensY + 30);
    ctx.lineTo(dvX + 90, tensY + 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dvX, tensY + 38);
    ctx.lineTo(dvX + 90, tensY + 38);
    ctx.stroke();

    // Tensioner slider
    ctx.fillStyle = '#eee';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.fillRect(dvX + 35 + tensOff, tensY + 14, 20, 52);
    ctx.strokeRect(dvX + 35 + tensOff, tensY + 14, 20, 52);

    // Tensioner roller
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(dvX + 45 + tensOff, tensY + 34, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dvX + 45 + tensOff, tensY + 34, 3, 0, Math.PI * 2);
    ctx.stroke();

    // Spring symbol on slider
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const spY = tensY + 70;
    ctx.moveTo(dvX + 45 + tensOff, spY);
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(dvX + 45 + tensOff + (i % 2 === 0 ? 8 : -8), spY + 5 + i * 5);
    }
    ctx.lineTo(dvX + 45 + tensOff, spY + 24);
    ctx.stroke();

    // Notes
    ctx.fillStyle = '#555';
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.fillText('① OUTER HOUSING (nTop LATTICE)', dvX, tensY + 110);
    ctx.fillText('② PINION GEAR (12T, MOD 2)', dvX, tensY + 122);
    ctx.fillText('③ RING GEAR (48T, ZERO BACKLASH)', dvX, tensY + 134);
    ctx.fillText('BACKLASH: ±0.012°', dvX, tensY + 152);
    ctx.fillText('WEIGHT SAVED: -28%', dvX, tensY + 164);

    this.drawSurfaceFinish(ctx, dvX, tensY + 180, '1.6');

    this.drawTitleBlock(ctx, w, h, {
      title: 'HERO YAW DRIVE ASSEMBLY',
      subtitle: '3RD PLACE INTERNATIONAL',
      dwgNo: 'HERO-YAW-03 REV C',
      material: '7075-T6 / nTop GEN',
      scale: '1:1'
    });
  }

  // =====================================================================
  // 3. BALANCING ROBOT — Side elevation + control diagram
  // =====================================================================
  renderBalance() {
    const s = this.sheets.balance;
    if (!s) return;
    const { ctx, w, h } = s;
    const t = this.t.balance;
    const hovered = this.hoverStates.balance;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f8f6f1';
    ctx.fillRect(0, 0, w, h);
    this.drawBorder(ctx, w, h);

    // Theta oscillates only when hovered
    const theta = hovered ? Math.sin(t * 3.5) * 0.12 : 0;
    const wheelSpin = hovered ? t * 4 : 0;

    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('SIDE ELEVATION — WHEEL-LEGGED ROBOT', 24, 30);

    const cx = w * 0.35;
    const groundY = h * 0.78;
    const wheelR = 28;
    const wheelCY = groundY - wheelR;

    // Ground line
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 100, groundY);
    ctx.lineTo(cx + 100, groundY);
    ctx.stroke();

    // Ground hatch
    ctx.lineWidth = 0.5;
    for (let gx = cx - 95; gx < cx + 100; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx - 6, groundY + 7);
      ctx.stroke();
    }

    // Centerline through wheel axis
    this.drawCenterline(ctx, cx - 50, wheelCY, cx + 50, wheelCY);

    // Wheel
    ctx.save();
    ctx.translate(cx, wheelCY);
    ctx.rotate(wheelSpin);

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bore
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR - 6, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * (wheelR - 6), Math.sin(a) * (wheelR - 6));
      ctx.stroke();
    }

    // Axle
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inverted pendulum body (tilting)
    ctx.save();
    ctx.translate(cx, wheelCY);
    ctx.rotate(theta);

    const legLen = 95;

    // Leg struts (parallel pair)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-5, -legLen);
    ctx.moveTo(5, 0);
    ctx.lineTo(5, -legLen);
    ctx.stroke();

    // Cross braces
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-5, -legLen * 0.3);
    ctx.lineTo(5, -legLen * 0.5);
    ctx.moveTo(-5, -legLen * 0.6);
    ctx.lineTo(5, -legLen * 0.8);
    ctx.stroke();

    // Electronics chassis box
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-28, -legLen - 32, 56, 35);
    this.drawHatch(ctx, -28, -legLen - 32, 56, 35, 6);

    // ESP32 label
    ctx.fillStyle = '#222';
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP32', 0, -legLen - 12);
    ctx.textAlign = 'left';

    // CoM marker
    ctx.strokeStyle = '#c00';
    ctx.fillStyle = '#c00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -legLen - 15, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -legLen - 15, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Theta arc (angle indicator)
    if (Math.abs(theta) > 0.005) {
      ctx.strokeStyle = '#c00';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, wheelCY, 45, -Math.PI / 2, -Math.PI / 2 + theta, theta < 0);
      ctx.stroke();

      ctx.fillStyle = '#c00';
      ctx.font = '8px "IBM Plex Mono", monospace';
      ctx.fillText(`θ=${theta.toFixed(3)}`, cx + 50, wheelCY - 50);
    }

    // Dimensions
    this.drawDimension(ctx, cx - wheelR, groundY + 5, cx + wheelR, groundY + 5, 'Ø56.0', 12, 'bottom');

    // Balloons
    this.drawBalloon(ctx, cx + 65, wheelCY, 1, cx + wheelR + 3, wheelCY);
    this.drawBalloon(ctx, cx + 55, wheelCY - 80, 2, cx + 8, wheelCY - 55);
    this.drawBalloon(ctx, cx + 55, wheelCY - 125, 3, cx + 28, wheelCY - legLen - 15);

    // Control block diagram (right side)
    const bdX = w * 0.62;
    const bdY = 48;
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('CONTROL BLOCK DIAGRAM', bdX, bdY);

    // Blocks
    const blocks = [
      { label: 'REF\nθ=0', x: bdX, y: bdY + 20, w: 40, h: 28 },
      { label: 'PID\nCONTROL', x: bdX + 58, y: bdY + 20, w: 50, h: 28 },
      { label: 'MOTOR\nDRIVER', x: bdX + 126, y: bdY + 20, w: 50, h: 28 },
      { label: 'PLANT\n(PEND)', x: bdX + 58, y: bdY + 65, w: 50, h: 28 },
      { label: 'IMU\nSENSOR', x: bdX + 126, y: bdY + 65, w: 50, h: 28 },
    ];

    blocks.forEach(b => {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#222';
      ctx.font = '6.5px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      const lines = b.label.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, b.x + b.w / 2, b.y + 11 + i * 9);
      });
      ctx.textAlign = 'left';
    });

    // Arrows between blocks
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.8;
    // REF -> PID
    ctx.beginPath(); ctx.moveTo(bdX + 40, bdY + 34); ctx.lineTo(bdX + 58, bdY + 34); ctx.stroke();
    // PID -> MOTOR
    ctx.beginPath(); ctx.moveTo(bdX + 108, bdY + 34); ctx.lineTo(bdX + 126, bdY + 34); ctx.stroke();
    // MOTOR -> PLANT (down)
    ctx.beginPath(); ctx.moveTo(bdX + 151, bdY + 48); ctx.lineTo(bdX + 151, bdY + 58);
    ctx.lineTo(bdX + 108, bdY + 58); ctx.lineTo(bdX + 108, bdY + 65); ctx.stroke();
    // PLANT -> IMU
    ctx.beginPath(); ctx.moveTo(bdX + 108, bdY + 79); ctx.lineTo(bdX + 126, bdY + 79); ctx.stroke();
    // IMU -> PID (feedback)
    ctx.beginPath(); ctx.moveTo(bdX + 151, bdY + 93); ctx.lineTo(bdX + 151, bdY + 105);
    ctx.lineTo(bdX + 83, bdY + 105); ctx.lineTo(bdX + 83, bdY + 48); ctx.stroke();

    // Notes
    ctx.fillStyle = '#555';
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.fillText('① BLDC HUB MOTOR WHEEL', bdX, bdY + 130);
    ctx.fillText('② CF LINKAGE LEGS', bdX, bdY + 142);
    ctx.fillText('③ ELECTRONICS BAY (ESP32+IMU)', bdX, bdY + 154);
    ctx.fillText('u(t) = -(Kp·θ + Kd·θ̇)', bdX, bdY + 174);
    ctx.fillText('STATUS: BALANCES IN PLACE', bdX, bdY + 186);

    this.drawTitleBlock(ctx, w, h, {
      title: 'BIPEDAL BALANCE ROBOT',
      subtitle: 'PERSONAL PROJECT — ESP32 PID',
      dwgNo: 'BAL-BOT-01 REV A',
      material: 'CF / PLA / AL',
      scale: '1:1'
    });
  }

  // =====================================================================
  // 4. FRC ROBOT — Side view with 4-bar linkage
  // =====================================================================
  renderFrc() {
    const s = this.sheets.frc;
    if (!s) return;
    const { ctx, w, h } = s;
    const t = this.t.frc;
    const hovered = this.hoverStates.frc;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f8f6f1';
    ctx.fillRect(0, 0, w, h);
    this.drawBorder(ctx, w, h);

    const armAngle = hovered ? Math.sin(t * 2) * 0.5 + 0.7 : 0.7;
    const driveAngle = hovered ? t * 3 : 0;

    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('SIDE VIEW — 125 LB FRC ROBOT', 24, 30);

    const groundY = h * 0.76;
    const chassisX = w * 0.15;
    const chassisW = 180;
    const chassisH = 30;
    const wheelR = 22;

    // Ground
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, groundY);
    ctx.lineTo(chassisX + chassisW + 60, groundY);
    ctx.stroke();
    ctx.lineWidth = 0.5;
    for (let gx = 24; gx < chassisX + chassisW + 60; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx - 6, groundY + 7);
      ctx.stroke();
    }

    // Wheels
    const wheelCY = groundY - wheelR;
    const w1x = chassisX + 30;
    const w2x = chassisX + chassisW - 30;

    [w1x, w2x].forEach(wx => {
      ctx.save();
      ctx.translate(wx, wheelCY);
      ctx.rotate(driveAngle);

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR - 5, 0, Math.PI * 2);
      ctx.stroke();

      // Tread pattern
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (wheelR - 5), Math.sin(a) * (wheelR - 5));
        ctx.lineTo(Math.cos(a) * wheelR, Math.sin(a) * wheelR);
        ctx.stroke();
      }

      // Axle
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.drawCenterline(ctx, wx - wheelR - 8, wheelCY, wx + wheelR + 8, wheelCY);
    });

    // Chassis frame
    const chassisY = groundY - wheelR - chassisH + 4;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(chassisX, chassisY, chassisW, chassisH);

    // Bellypan detail
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(chassisX, chassisY + chassisH / 2);
    ctx.lineTo(chassisX + chassisW, chassisY + chassisH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Lightening holes
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.roundRect(chassisX + 18 + i * 40, chassisY + 6, 26, 12, 3);
      ctx.stroke();
    }

    // Superstructure tower
    const towerX = chassisX + chassisW - 35;
    const towerTop = chassisY - 90;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(towerX - 8, chassisY);
    ctx.lineTo(towerX - 8, towerTop);
    ctx.lineTo(towerX + 8, towerTop);
    ctx.lineTo(towerX + 8, chassisY);
    ctx.stroke();

    // Cross bracing in tower
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(towerX - 8, chassisY);
    ctx.lineTo(towerX + 8, towerTop);
    ctx.moveTo(towerX + 8, chassisY);
    ctx.lineTo(towerX - 8, towerTop);
    ctx.stroke();

    // 4-bar linkage
    const pivotAx = towerX;
    const pivotAy = towerTop + 8;
    const pivotBx = towerX;
    const pivotBy = towerTop + 28;
    const armLen = 85;

    const endAx = pivotAx - Math.cos(armAngle) * armLen;
    const endAy = pivotAy - Math.sin(armAngle) * armLen;
    const endBx = pivotBx - Math.cos(armAngle) * armLen;
    const endBy = pivotBy - Math.sin(armAngle) * armLen;

    // Primary arm
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivotAx, pivotAy);
    ctx.lineTo(endAx, endAy);
    ctx.stroke();

    // Follower
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pivotBx, pivotBy);
    ctx.lineTo(endBx, endBy);
    ctx.stroke();

    // Connecting link at end
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(endAx, endAy);
    ctx.lineTo(endBx, endBy);
    ctx.stroke();

    // End effector / intake roller
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(endAx, endAy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(endAx, endAy, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Pivot pins
    [[pivotAx, pivotAy], [pivotBx, pivotBy], [endAx, endAy], [endBx, endBy]].forEach(([px, py]) => {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8f6f1';
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dimensions
    this.drawDimension(ctx, chassisX, chassisY + chassisH + 2, chassisX + chassisW, chassisY + chassisH + 2, '460.0', 14, 'bottom');
    this.drawDimension(ctx, w1x - wheelR, groundY + 5, w1x + wheelR, groundY + 5, 'Ø44.0', 10, 'bottom');

    // Balloons
    this.drawBalloon(ctx, chassisX - 15, chassisY + 10, 1, chassisX + 5, chassisY + 15);
    this.drawBalloon(ctx, towerX + 28, towerTop + 10, 2, towerX + 8, towerTop + 15);
    this.drawBalloon(ctx, endAx - 25, endAy - 15, 3, endAx - 12, endAy - 5);
    this.drawBalloon(ctx, w1x - 30, wheelCY - 20, 4, w1x - wheelR, wheelCY);

    // Notes (right side)
    const nX = w * 0.7;
    const nY = 48;
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText('PARTS LIST', nX, nY);

    ctx.fillStyle = '#555';
    ctx.font = '7px "IBM Plex Mono", monospace';
    ctx.fillText('① CHASSIS FRAME (6061 BOX TUBE)', nX, nY + 18);
    ctx.fillText('② SUPERSTRUCTURE TOWER', nX, nY + 30);
    ctx.fillText('③ 4-BAR INTAKE LINKAGE', nX, nY + 42);
    ctx.fillText('④ DRIVE WHEELS (COLSON)', nX, nY + 54);

    ctx.fillText('ROBOT WEIGHT: 125 LB', nX, nY + 76);
    ctx.fillText('BUILD TIME: 6 WEEKS', nX, nY + 88);
    ctx.fillText('TEAM SIZE: 10 ROOKIES', nX, nY + 100);
    ctx.fillText('RESULT: BEST IN 15-YR HISTORY', nX, nY + 112);
    ctx.fillText('FAILURES: ZERO (FULL SEASON)', nX, nY + 124);

    // General tolerances note
    ctx.font = 'italic 7px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('General tolerance ISO 2768-m', nX, nY + 150);
    ctx.fillText('Deburr and break sharp edges', nX, nY + 162);

    this.drawSurfaceFinish(ctx, nX, nY + 180, '3.2');

    this.drawTitleBlock(ctx, w, h, {
      title: '125 LB FRC COMPETITION ROBOT',
      subtitle: 'FRC TEAM — SCOTTSDALE, AZ',
      dwgNo: 'FRC-COMP-01',
      material: '6061-T6 / POLYCARB',
      scale: '1:4'
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.drawingEngine = new DrawingEngine();
});
