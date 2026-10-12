/* ==========================================================================
   GAVIN HIGGINS - SKEUOMORPHIC PORTFOLIO
   Interactive Engineering Drawing Animations (Canvas Engine)
   Drawings come to life when hovered or interacted with!
   ========================================================================== */

class DrawingEngine {
  constructor() {
    this.canvases = {};
    this.states = {
      suspension: { hovered: false, mouseX: 0, mouseY: 0, time: 0, compression: 0, vel: 0, wheelAngle: 0, bumpTrigger: 0 },
      yaw: { hovered: false, mouseX: 0, mouseY: 0, time: 0, angle: 0, speed: 0.015, tensionerOffset: 0 },
      balance: { hovered: false, mouseX: 0, mouseY: 0, time: 0, theta: 0.05, thetaDot: 0, x: 0, xDot: 0, torque: 0, pushForce: 0 },
      frc: { hovered: false, mouseX: 0, mouseY: 0, time: 0, armAngle: 0, driveAngle: 0 }
    };
    
    this.initCanvases();
    this.setupListeners();
    this.startLoop();
  }

  initCanvases() {
    const list = ['Suspension', 'Yaw', 'Balance', 'Frc'];
    list.forEach(name => {
      const id = `canvas${name}`;
      const canvas = document.getElementById(id);
      if (!canvas) return;

      const key = name.toLowerCase();
      const ctx = canvas.getContext('2d');
      
      // Handle High DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = (rect.width || 460) * dpr;
      canvas.height = (rect.height || 320) * dpr;
      ctx.scale(dpr, dpr);

      this.canvases[key] = {
        canvas,
        ctx,
        width: rect.width || 460,
        height: rect.height || 320,
        dpr
      };
    });
  }

  setupListeners() {
    // Resize handler
    window.addEventListener('resize', () => {
      Object.keys(this.canvases).forEach(key => {
        const item = this.canvases[key];
        const rect = item.canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          item.width = rect.width;
          item.height = rect.height;
          item.canvas.width = rect.width * item.dpr;
          item.canvas.height = rect.height * item.dpr;
          item.ctx.scale(item.dpr, item.dpr);
        }
      });
    });

    // Parent paper hover listeners
    const sheets = [
      { id: 'drawingSuspension', key: 'suspension', canvasId: 'canvasSuspension' },
      { id: 'drawingYaw', key: 'yaw', canvasId: 'canvasYaw' },
      { id: 'drawingBalance', key: 'balance', canvasId: 'canvasBalance' },
      { id: 'drawingFrc', key: 'frc', canvasId: 'canvasFrc' }
    ];

    sheets.forEach(({ id, key, canvasId }) => {
      const sheet = document.getElementById(id);
      const canvas = document.getElementById(canvasId);
      if (!sheet || !canvas) return;

      const onEnter = () => {
        this.states[key].hovered = true;
        if (window.soundFX) window.soundFX.playHum();
      };

      const onLeave = () => {
        this.states[key].hovered = false;
      };

      sheet.addEventListener('mouseenter', onEnter);
      sheet.addEventListener('mouseleave', onLeave);

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        this.states[key].mouseX = e.clientX - rect.left;
        this.states[key].mouseY = e.clientY - rect.top;

        if (key === 'balance' && e.buttons === 1) {
          // Push balancing robot with mouse drag
          this.states.balance.pushForce = (e.movementX || 0) * 0.05;
        }
      });

      canvas.addEventListener('mousedown', (e) => {
        if (key === 'suspension') {
          // Trigger bump drop test on click
          this.states.suspension.bumpTrigger = 1.0;
        } else if (key === 'balance') {
          this.states.balance.pushForce = (Math.random() - 0.5) * 0.3;
        }
      });
    });
  }

  startLoop() {
    const loop = (timestamp) => {
      this.update(timestamp);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(timestamp) {
    // 1. Suspension Update (Mass-spring-damper)
    const s = this.states.suspension;
    s.time += 0.016;
    const sTarget = s.hovered ? (Math.sin(s.time * 6) * 18 + 20 + s.bumpTrigger * 35) : Math.sin(s.time * 2) * 4;
    s.bumpTrigger *= 0.88; // Damping
    const springK = 0.12;
    const damperC = 0.82;
    s.vel += (sTarget - s.compression) * springK;
    s.vel *= damperC;
    s.compression += s.vel;
    s.wheelAngle += s.hovered ? 0.08 : 0.015;

    // 2. Yaw Mechanism Update
    const y = this.states.yaw;
    y.time += 0.016;
    const targetSpeed = y.hovered ? 0.045 : 0.012;
    y.speed += (targetSpeed - y.speed) * 0.08;
    y.angle += y.speed;
    y.tensionerOffset = Math.sin(y.time * 8) * (y.hovered ? 3.5 : 1.0);

    // 3. Balance Robot Update (Inverted Pendulum PID)
    const b = this.states.balance;
    b.time += 0.016;
    // Inverted Pendulum equations of motion
    const g = 9.81;
    const L = 0.8;
    // PID Gains
    const Kp = 38.0;
    const Kd = 6.5;
    const Ki = 0.8;
    
    // Natural gravity tilt
    const gravTorque = (g / L) * Math.sin(b.theta);
    // Control torque
    b.torque = -(Kp * b.theta + Kd * b.thetaDot);
    if (b.hovered) {
      // Natural perturbations when hovered
      b.thetaDot += Math.sin(b.time * 4) * 0.003;
    }
    // Apply external push
    b.thetaDot += b.pushForce;
    b.pushForce = 0;

    // Total angular acceleration
    const thetaDdot = gravTorque + b.torque * 0.08;
    b.thetaDot += thetaDdot * 0.016;
    b.theta += b.thetaDot * 0.016;
    // Damp bounds to prevent extreme runaway
    if (Math.abs(b.theta) > 0.45) {
      b.theta = Math.sign(b.theta) * 0.45;
      b.thetaDot *= -0.5;
    }
    // Wheel displacement
    b.xDot = -b.torque * 0.04;
    b.x += b.xDot;

    // Telemetry updates
    const teleTheta = document.getElementById('teleTheta');
    const teleTorque = document.getElementById('teleTorque');
    if (teleTheta && teleTorque) {
      teleTheta.innerText = `${b.theta.toFixed(3)} rad`;
      teleTorque.innerText = `${(b.torque * 0.05).toFixed(2)} N·m`;
    }

    // 4. FRC Linkage Update
    const f = this.states.frc;
    f.time += 0.016;
    const frcSpeed = f.hovered ? 2.5 : 0.8;
    f.armAngle = Math.sin(f.time * frcSpeed) * 0.45 + 0.55; // 0.1 to 1.0 rad
    f.driveAngle += f.hovered ? 0.08 : 0.02;
  }

  render() {
    this.renderSuspension();
    this.renderYaw();
    this.renderBalance();
    this.renderFrc();
  }

  // =========================================================================
  // 1. RENDER OMNI WHEEL SUSPENSION & DUAL MGN9H RAILS
  // =========================================================================
  renderSuspension() {
    const item = this.canvases.suspension;
    if (!item) return;
    const { ctx, width, height } = item;
    const s = this.states.suspension;

    ctx.clearRect(0, 0, width, height);

    // CAD Blueprint Grid
    this.drawBlueprintGrid(ctx, width, height);

    const cx = width * 0.5;
    const baseY = height * 0.78;
    const travelY = -s.compression;

    // Title / ISO Dimension lines
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - 150, baseY - 180);
    ctx.lineTo(cx - 150, baseY + 20);
    ctx.moveTo(cx + 150, baseY - 180);
    ctx.lineTo(cx + 150, baseY + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Fixed Chassis Mounting Plate (0.25" 6061 Aluminum & 4mm CF)
    ctx.fillStyle = '#0f2744';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 110, 35, 220, 40, 4);
    ctx.fill();
    ctx.stroke();

    // Carbon Fiber weave accent
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(cx - 100, 42, 200, 26);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillText('0.25" 6061-T6 / 4mm CARBON FIBER CHASSIS BASE', cx - 95, 58);

    // 2. Dual MGN9H Linear Rails (Vertical Guides)
    const railX1 = cx - 75;
    const railX2 = cx + 75;
    const railTop = 75;
    const railBottom = baseY - 20;

    [railX1, railX2].forEach(rx => {
      // Rail bar
      ctx.fillStyle = '#1e3a5f';
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.fillRect(rx - 7, railTop, 14, railBottom - railTop);
      ctx.strokeRect(rx - 7, railTop, 14, railBottom - railTop);

      // Linear slider block (MGN9H) moving with suspension
      const sliderY = railTop + 45 + travelY;
      ctx.fillStyle = s.hovered ? '#0284c7' : '#0369a1';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.fillRect(rx - 12, sliderY, 24, 38);
      ctx.strokeRect(rx - 12, sliderY, 24, 38);

      // Bearings inside
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(rx, sliderY + 10 + i * 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Heavy Duty Helical Coil Spring
    const springTop = 75;
    const springBottom = railTop + 45 + travelY;
    const coils = 9;
    const springWidth = 32;

    ctx.strokeStyle = s.hovered ? '#38bdf8' : '#7dd3fc';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, springTop);

    const dy = (springBottom - springTop) / coils;
    for (let i = 0; i < coils; i++) {
      const cy1 = springTop + i * dy + dy * 0.25;
      const cy2 = springTop + i * dy + dy * 0.75;
      const xOffset = (i % 2 === 0 ? 1 : -1) * springWidth;
      ctx.lineTo(cx + xOffset, cy1);
      ctx.lineTo(cx - xOffset, cy2);
    }
    ctx.lineTo(cx, springBottom);
    ctx.stroke();

    // 4. Moving Wheel Mount & Axle
    const wheelCenterY = baseY + travelY;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX1 - 10, wheelCenterY - 30);
    ctx.lineTo(railX2 + 10, wheelCenterY - 30);
    ctx.lineTo(cx + 35, wheelCenterY);
    ctx.lineTo(cx - 35, wheelCenterY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Omni Wheel Hub & Rotating Barrel Rollers
    const wheelRadius = 55;
    ctx.save();
    ctx.translate(cx, wheelCenterY);
    ctx.rotate(s.wheelAngle);

    // Main wheel rim
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wheel spokes
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (wheelRadius - 10), Math.sin(a) * (wheelRadius - 10));
      ctx.stroke();
    }

    // Peripheral Barrel Rollers (Omni Rollers)
    const numRollers = 10;
    for (let i = 0; i < numRollers; i++) {
      const angle = (i / numRollers) * Math.PI * 2;
      const rx = Math.cos(angle) * wheelRadius;
      const ry = Math.sin(angle) * wheelRadius;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-8, -4, 16, 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center Hub Bearing
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 6. Impact & Force Vector Callout
    if (s.hovered) {
      const forceMag = Math.min(560, Math.abs(s.vel * 250) + 180);
      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle = '#f59e0b';
      ctx.lineWidth = 3;
      // Force Arrow pointing up at ground contact
      ctx.beginPath();
      ctx.moveTo(cx, baseY + wheelRadius + 25);
      ctx.lineTo(cx, baseY + wheelRadius + 5);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(cx - 6, baseY + wheelRadius + 12);
      ctx.lineTo(cx, baseY + wheelRadius + 2);
      ctx.lineTo(cx + 6, baseY + wheelRadius + 12);
      ctx.fill();

      // Force Label
      ctx.font = 'bold 10px "JetBrains Mono"';
      ctx.fillText(`IMPACT: ${forceMag.toFixed(0)} N (LATERAL TEST: 560 N)`, cx + 15, baseY + wheelRadius + 20);
    }
  }

  // =========================================================================
  // 2. RENDER HERO ROBOT LOW-BACKLASH YAW & GENERATIVE LATTICE
  // =========================================================================
  renderYaw() {
    const item = this.canvases.yaw;
    if (!item) return;
    const { ctx, width, height } = item;
    const y = this.states.yaw;

    ctx.clearRect(0, 0, width, height);
    this.drawBlueprintGrid(ctx, width, height);

    const cx = width * 0.5;
    const cy = height * 0.48;

    // 1. Generative nTop Outer Lattice Ring
    ctx.save();
    ctx.translate(cx, cy);

    // Lattice Voronoi / Strut nodes
    ctx.strokeStyle = y.hovered ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.5;
    const ringRadius = 110;
    const numNodes = 18;
    for (let i = 0; i < numNodes; i++) {
      const a1 = (i / numNodes) * Math.PI * 2;
      const a2 = ((i + 1) / numNodes) * Math.PI * 2;
      const x1 = Math.cos(a1) * ringRadius;
      const y1 = Math.sin(a1) * ringRadius;
      const x2 = Math.cos(a2) * ringRadius;
      const y2 = Math.sin(a2) * ringRadius;

      const xi1 = Math.cos(a1) * (ringRadius - 28);
      const yi1 = Math.sin(a1) * (ringRadius - 28);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(xi1, yi1);
      ctx.closePath();
      ctx.stroke();

      if (y.hovered && i % 3 === 0) {
        // Stress gradient pulse
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fill();
      }
    }

    // 2. Main Azimuth Rotating Gear / Ring (Low Backlash)
    ctx.rotate(y.angle);
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();

    // Gear Teeth
    const teeth = 36;
    for (let t = 0; t < teeth; t++) {
      const ta = (t / teeth) * Math.PI * 2;
      const tx = Math.cos(ta) * 75;
      const ty = Math.sin(ta) * 75;
      const tx2 = Math.cos(ta) * 82;
      const ty2 = Math.sin(ta) * 82;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    }

    // Turret crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-65, 0); ctx.lineTo(65, 0);
    ctx.moveTo(0, -65); ctx.lineTo(0, 65);
    ctx.stroke();
    ctx.setLineDash([]);

    // Turret core / bearing hub
    ctx.fillStyle = '#0f2744';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 3. Sliding Belt Tensioner Mechanism (Zero Backlash)
    const tensionerX = cx + 88 + y.tensionerOffset;
    const tensionerY = cy - 40;

    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tensionerX - 16, tensionerY - 14, 32, 28, 4);
    ctx.fill();
    ctx.stroke();

    // Tensioner Pulley
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(tensionerX, tensionerY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Synchronous Timing Belt lines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 75, cy);
    ctx.lineTo(tensionerX, tensionerY - 10);
    ctx.stroke();

    // Telemetry Dial
    const deg = ((y.angle * (180 / Math.PI)) % 360).toFixed(1);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillText(`AZIMUTH: ${deg}°`, cx - 45, cy + 125);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillText('BACKLASH: ±0.012° | WT: -28%', cx - 65, cy + 140);
  }

  // =========================================================================
  // 3. RENDER PID WHEEL-LEGGED BALANCING ROBOT (PHYSICS ENGINE)
  // =========================================================================
  renderBalance() {
    const item = this.canvases.balance;
    if (!item) return;
    const { ctx, width, height } = item;
    const b = this.states.balance;

    ctx.clearRect(0, 0, width, height);

    // Graph Paper Grid (Lab notebook style)
    this.drawNotebookGrid(ctx, width, height);

    const groundY = height * 0.82;
    const cx = width * 0.5 + Math.sin(b.x * 0.2) * 50;

    // Ground line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, groundY);
    ctx.lineTo(width - 20, groundY);
    ctx.stroke();

    // Hatch marks under ground
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    for (let x = 30; x < width - 20; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - 8, groundY + 10);
      ctx.stroke();
    }

    const wheelRadius = 32;
    const wheelCenterY = groundY - wheelRadius;

    // Wheel (Rolling with angle)
    ctx.save();
    ctx.translate(cx, wheelCenterY);
    ctx.rotate(b.x * 0.5);

    // Wheel tire
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wheel spokes & markers
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-wheelRadius + 4, 0); ctx.lineTo(wheelRadius - 4, 0);
    ctx.moveTo(0, -wheelRadius + 4); ctx.lineTo(0, wheelRadius - 4);
    ctx.stroke();

    // Motor Hub
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Articulated Leg & Inverted Pendulum Chassis
    ctx.save();
    ctx.translate(cx, wheelCenterY);
    ctx.rotate(b.theta);

    // Knee linkage joint
    const legLength = 110;
    const hipX = 0;
    const hipY = -legLength;

    // Bipedal linkage struts (Carbon Fiber Tubes)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // Parallel 4-bar rod
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(12 + hipX, hipY);
    ctx.stroke();

    // Robot Main Chassis / Electronics Bay (ESP32, IMU, LiPo)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(hipX - 45, hipY - 45, 90, 50, 6);
    ctx.fill();
    ctx.stroke();

    // ESP32 Microcontroller chip graphic
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(hipX - 25, hipY - 35, 50, 22);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 8px "JetBrains Mono"';
    ctx.fillText('ESP32 // IMU', hipX - 22, hipY - 21);

    // Center of Mass (CoM) indicator
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hipX, hipY - 20, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hipX, hipY - 20, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pitch Angle Vector Arc
    ctx.restore();

    // Draw balance error arc & angle notation
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, wheelCenterY, 60, -Math.PI / 2, -Math.PI / 2 + b.theta, b.theta < 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Handwritten control equation
    ctx.font = '13px "Caveat"';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('u(t) = - (Kp·θ + Kd·θ̇)', cx + 55, groundY - 140);
  }

  // =========================================================================
  // 4. RENDER 125 LB FRC COMPETITION ROBOT (4-BAR LINKAGE ARM)
  // =========================================================================
  renderFrc() {
    const item = this.canvases.frc;
    if (!item) return;
    const { ctx, width, height } = item;
    const f = this.states.frc;

    ctx.clearRect(0, 0, width, height);
    this.drawDraftingVellumGrid(ctx, width, height);

    const groundY = height * 0.82;
    const chassisX = width * 0.35;
    const chassisWidth = 160;
    const chassisHeight = 42;

    // Ground
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, groundY);
    ctx.lineTo(width - 20, groundY);
    ctx.stroke();

    // 1. Robot Drivetrain Wheels (WCP / Colson Wheels)
    const wheelR = 24;
    const w1 = chassisX + 25;
    const w2 = chassisX + chassisWidth - 25;
    [w1, w2].forEach(wx => {
      ctx.save();
      ctx.translate(wx, groundY - wheelR);
      ctx.rotate(f.driveAngle);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Tread grooves
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * wheelR, Math.sin(a) * wheelR);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 2. Chassis Box Frame (In-House 6061 Tube CNC)
    const chassisY = groundY - wheelR - chassisHeight + 8;
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(chassisX, chassisY, chassisWidth, chassisHeight, 3);
    ctx.fill();
    ctx.stroke();

    // Bellypan lightening pattern
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.roundRect(chassisX + 20 + i * 32, chassisY + 12, 22, 18, 2);
      ctx.fill();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px "JetBrains Mono"';
    ctx.fillText('125 LB FRC PLATFORM // CNC 6061', chassisX + 8, chassisY + 8);

    // 3. Superstructure Tower
    const towerX = chassisX + 115;
    const towerY = chassisY - 80;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(towerX, chassisY);
    ctx.lineTo(towerX, towerY);
    ctx.stroke();

    // 4. 4-Bar Linkage Intake Mechanism
    const pivotA_X = towerX;
    const pivotA_Y = towerY;
    const pivotB_X = towerX - 25;
    const pivotB_Y = towerY + 20;

    const armLength = 95;
    const jointC_X = pivotA_X - Math.cos(f.armAngle) * armLength;
    const jointC_Y = pivotA_Y - Math.sin(f.armAngle) * armLength;

    const jointD_X = pivotB_X - Math.cos(f.armAngle) * armLength;
    const jointD_Y = pivotB_Y - Math.sin(f.armAngle) * armLength;

    // Link 1 (Primary Arm)
    ctx.strokeStyle = f.hovered ? '#0284c7' : '#1e3a8a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotA_X, pivotA_Y);
    ctx.lineTo(jointC_X, jointC_Y);
    ctx.stroke();

    // Link 2 (Follower Link)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(pivotB_X, pivotB_Y);
    ctx.lineTo(jointD_X, jointD_Y);
    ctx.stroke();

    // End-Effector / Intake Roller Claw
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(jointC_X, jointC_Y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pivot Pin Highlights
    [ [pivotA_X, pivotA_Y], [pivotB_X, pivotB_Y], [jointC_X, jointC_Y], [jointD_X, jointD_Y] ].forEach(([px, py]) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Pneumatic cylinder drive line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(chassisX + 40, chassisY);
    ctx.lineTo(jointC_X + 10, jointC_Y + 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // =========================================================================
  // GRID DRAWING UTILITIES
  // =========================================================================
  drawBlueprintGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawNotebookGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
    ctx.lineWidth = 1;
    const step = 18;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawDraftingVellumGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)';
    ctx.lineWidth = 1;
    const step = 24;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}

// Instantiate once loaded
window.addEventListener('DOMContentLoaded', () => {
  window.drawingEngine = new DrawingEngine();
});
