/* ==========================================================================
   GAVIN HIGGINS - SKEUOMORPHIC PORTFOLIO
   Main Application Logic: Desk Dragging, Skeuomorphic Tools,
   Synthesized Audio, and Fullscreen Inspection Modals
   ========================================================================== */

// ==========================================================================
// 1. SYNTHESIZED WEB AUDIO ENGINE (Realistic Paper & Mechanical Clicks)
// ==========================================================================
class SoundEffects {
  constructor() {
    this.enabled = true;
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Soft mechanical toggle click
  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  // Realistic paper whoosh / rustle
  playPaperRustle() {
    if (!this.enabled) return;
    try {
      this.init();
      const bufferSize = this.audioCtx.sampleRate * 0.12;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(1.8, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.14, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      whiteNoise.start();
    } catch (e) {}
  }

  // Soft hum on hover
  playHum() {
    if (!this.enabled) return;
    try {
      this.init();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch (e) {}
  }
}

window.soundFX = new SoundEffects();

// ==========================================================================
// 2. DESK APPLICATION CONTROLLER
// ==========================================================================
class WorkbenchApp {
  constructor() {
    this.workbench = document.getElementById('workbench');
    this.deskLighting = document.getElementById('deskLighting');
    this.modal = document.getElementById('inspectionModal');
    this.modalTarget = document.getElementById('modalPaperTarget');
    this.modalCloseBtn = document.getElementById('modalCloseBtn');
    
    this.highestZIndex = 50;
    this.activeTheme = 'workbench'; // workbench, wood, blueprint
    this.isNeat = false;
    
    this.initDeskProps();
    this.initDraggableItems();
    this.initToolbarControls();
    this.initModalEngine();
  }

  // =========================================================================
  // DESK PROPS & CALIPER INTERACTION
  // =========================================================================
  initDeskProps() {
    const caliper = document.getElementById('caliperProp');
    const caliperVal = document.getElementById('caliperValue');
    if (!caliper || !caliperVal) return;

    let isDraggingCaliper = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;

    caliper.addEventListener('pointerdown', (e) => {
      isDraggingCaliper = true;
      startX = e.clientX - currentX;
      startY = e.clientY - currentY;
      caliper.setPointerCapture(e.pointerId);
      window.soundFX.playClick();
    });

    caliper.addEventListener('pointermove', (e) => {
      if (!isDraggingCaliper) return;
      currentX = e.clientX - startX;
      currentY = e.clientY - startY;
      caliper.style.transform = `translate(${currentX}px, ${currentY}px) rotate(-6deg)`;

      // Dynamic LCD measurement display
      const simulatedMm = (Math.abs(currentX % 70) + 12.35).toFixed(2);
      caliperVal.innerText = simulatedMm;
    });

    caliper.addEventListener('pointerup', (e) => {
      isDraggingCaliper = false;
      try { caliper.releasePointerCapture(e.pointerId); } catch(err) {}
    });
  }

  // =========================================================================
  // DRAGGABLE DESK PAPERS & CLICK DETECTION
  // =========================================================================
  initDraggableItems() {
    const items = document.querySelectorAll('.desk-item');

    items.forEach(item => {
      let isDragging = false;
      let startPointerX = 0, startPointerY = 0;
      let initialItemX = 0, initialItemY = 0;
      let movedDistance = 0;
      const initialTilt = parseFloat(item.dataset.tilt || 0);

      item.style.setProperty('--rotation', `${initialTilt}deg`);

      item.addEventListener('pointerdown', (e) => {
        // Prevent drag on inner link or button clicks
        if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) {
          return;
        }

        isDragging = true;
        movedDistance = 0;
        startPointerX = e.clientX;
        startPointerY = e.clientY;

        // Bring to front
        this.highestZIndex += 1;
        item.style.zIndex = this.highestZIndex;

        // Capture current offset
        const computedTransform = window.getComputedStyle(item).transform;
        if (computedTransform !== 'none') {
          const matrix = new DOMMatrixReadOnly(computedTransform);
          initialItemX = matrix.m41;
          initialItemY = matrix.m42;
        } else {
          initialItemX = 0;
          initialItemY = 0;
        }

        item.classList.add('dragging');
        item.setPointerCapture(e.pointerId);
        window.soundFX.playPaperRustle();
      });

      item.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startPointerX;
        const dy = e.clientY - startPointerY;
        movedDistance = Math.hypot(dx, dy);

        const newX = initialItemX + dx;
        const newY = initialItemY + dy;
        const dragTilt = initialTilt * 0.6 + (dx * 0.02);

        item.style.transform = `translate(${newX}px, ${newY}px) rotate(${dragTilt}deg) translateY(-14px) scale(1.04)`;
      });

      const onPointerEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        item.classList.remove('dragging');

        try { item.releasePointerCapture(e.pointerId); } catch(err) {}

        // Restore resting transform with offset
        const computedTransform = window.getComputedStyle(item).transform;
        const matrix = new DOMMatrixReadOnly(computedTransform);
        const finalX = matrix.m41;
        const finalY = matrix.m42;

        item.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${initialTilt}deg)`;

        // If movement was small, treat as intentional click to inspect!
        if (movedDistance < 6) {
          const paperId = item.dataset.id;
          if (paperId) {
            this.openPaperModal(paperId);
          }
        }
      };

      item.addEventListener('pointerup', onPointerEnd);
      item.addEventListener('pointercancel', onPointerEnd);
    });

    // Post-It Note quick inspect button
    const btnQuickResume = document.getElementById('btnQuickResume');
    if (btnQuickResume) {
      btnQuickResume.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPaperModal('resume');
      });
    }
  }

  // =========================================================================
  // TOOLBAR CONTROLS
  // =========================================================================
  initToolbarControls() {
    const btnNeaten = document.getElementById('btnNeaten');
    const btnScatter = document.getElementById('btnScatter');
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const btnMatToggle = document.getElementById('btnMatToggle');
    const matLabel = document.getElementById('matLabel');
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const soundLabel = document.getElementById('soundLabel');

    // Neaten desk
    btnNeaten.addEventListener('click', () => {
      window.soundFX.playClick();
      window.soundFX.playPaperRustle();
      this.workbench.classList.add('neat-layout');
      document.querySelectorAll('.desk-item').forEach(item => {
        item.style.transform = 'none';
      });
    });

    // Scatter papers
    btnScatter.addEventListener('click', () => {
      window.soundFX.playClick();
      window.soundFX.playPaperRustle();
      this.workbench.classList.remove('neat-layout');
      document.querySelectorAll('.desk-item').forEach(item => {
        const tilt = (Math.random() * 8 - 4).toFixed(1);
        item.dataset.tilt = tilt;
        item.style.setProperty('--rotation', `${tilt}deg`);
        const offsetX = (Math.random() * 30 - 15).toFixed(0);
        const offsetY = (Math.random() * 20 - 10).toFixed(0);
        item.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${tilt}deg)`;
      });
    });

    // Desk Lamp / Lighting Toggle
    btnThemeToggle.addEventListener('click', () => {
      window.soundFX.playClick();
      if (document.body.classList.contains('theme-blueprint')) {
        document.body.className = 'theme-workbench';
        themeLabel.innerText = 'Warm Lamp';
      } else if (document.body.classList.contains('theme-workbench')) {
        document.body.className = 'theme-wood';
        themeLabel.innerText = 'Tungsten Wood';
      } else {
        document.body.className = 'theme-blueprint';
        themeLabel.innerText = 'Nocturnal CAD';
      }
    });

    // Mat Surface Toggle
    btnMatToggle.addEventListener('click', () => {
      window.soundFX.playClick();
      if (document.body.classList.contains('theme-workbench')) {
        document.body.className = 'theme-wood';
        matLabel.innerText = 'Walnut Table';
      } else {
        document.body.className = 'theme-workbench';
        matLabel.innerText = 'Cutting Mat';
      }
    });

    // Sound toggle
    btnSoundToggle.addEventListener('click', () => {
      window.soundFX.enabled = !window.soundFX.enabled;
      soundLabel.innerText = window.soundFX.enabled ? 'Sound: On' : 'Sound: Off';
      window.soundFX.playClick();
    });
  }

  // =========================================================================
  // FULLSCREEN INSPECTION MODAL ENGINE
  // =========================================================================
  initModalEngine() {
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal || e.target.classList.contains('modal-workbench')) {
        this.closeModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('open')) {
        this.closeModal();
      }
    });
  }

  closeModal() {
    window.soundFX.playPaperRustle();
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    this.modalTarget.innerHTML = '';
  }

  openPaperModal(id) {
    window.soundFX.playPaperRustle();
    const content = this.getModalContent(id);
    this.modalTarget.innerHTML = content;
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');

    // Attach modal internal actions
    const copyEmailBtn = document.getElementById('modalCopyEmail');
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('ghigg385@uw.edu');
        copyEmailBtn.innerText = '✓ Email Copied!';
        setTimeout(() => { copyEmailBtn.innerText = 'Copy Email Address'; }, 2000);
      });
    }

    const printResumeBtn = document.getElementById('modalPrintResume');
    if (printResumeBtn) {
      printResumeBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Modal Interactive Simulation Canvas
    this.initModalCanvas(id);
  }

  initModalCanvas(id) {
    const canvas = document.getElementById('modalInteractiveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let frame = 0;
    const modalLoop = () => {
      if (!this.modal.classList.contains('open')) return;
      frame++;
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (id === 'suspension') {
        // Detailed FEA Stress Contour Simulation
        this.drawModalFEA(ctx, rect.width, rect.height, frame);
      } else if (id === 'yaw') {
        // Detailed Planetary Gear Mesh & Tensioner
        this.drawModalYawDetail(ctx, rect.width, rect.height, frame);
      } else if (id === 'balance') {
        // Live State-Space LQR Inverted Pendulum
        this.drawModalBalanceDetail(ctx, rect.width, rect.height, frame);
      } else if (id === 'frc') {
        // Detailed 4-Bar Linkage Kinematics & Path
        this.drawModalFrcDetail(ctx, rect.width, rect.height, frame);
      }

      requestAnimationFrame(modalLoop);
    };
    requestAnimationFrame(modalLoop);
  }

  // FEA Stress Heatmap visualizer in modal
  drawModalFEA(ctx, w, h, frame) {
    ctx.fillStyle = '#081629';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // FEA Plate with animated stress gradients
    const cx = w * 0.5, cy = h * 0.5;
    const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 180 * pulse);
    grad.addColorStop(0, '#ef4444'); // Peak Von Mises Stress (Red)
    grad.addColorStop(0.3, '#f59e0b'); // High (Orange)
    grad.addColorStop(0.6, '#38bdf8'); // Nominal (Cyan)
    grad.addColorStop(1, '#0c2340'); // Low (Deep Blue)

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(cx - 200, cy - 100, 400, 200, 10);
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Strain lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([4, 4]);
    for (let r = 30; r < 180; r += 28) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Callout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillText(`ANSYS FEA // PEAK VON MISES: ${(342 * pulse).toFixed(1)} MPa [SAFETY FACTOR: 2.4]`, cx - 180, cy - 75);
    ctx.fillStyle = '#bae6fd';
    ctx.font = '10px "JetBrains Mono"';
    ctx.fillText('0.25" 6061-T6 + 4mm CF COMPOSITE SANDWICH // 560 N LATERAL LOAD', cx - 180, cy + 85);
  }

  drawModalYawDetail(ctx, w, h, frame) {
    ctx.fillStyle = '#081629';
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.5;
    const a = frame * 0.02;

    // Meshing Gear 1
    ctx.save();
    ctx.translate(cx - 70, cy);
    ctx.rotate(a);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const ga = (i / 24) * Math.PI * 2;
      ctx.strokeRect(Math.cos(ga) * 65 - 4, Math.sin(ga) * 65 - 4, 8, 8);
    }
    ctx.restore();

    // Meshing Gear 2
    ctx.save();
    ctx.translate(cx + 70, cy);
    ctx.rotate(-a);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 65, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const ga = (i / 24) * Math.PI * 2;
      ctx.strokeRect(Math.cos(ga) * 65 - 4, Math.sin(ga) * 65 - 4, 8, 8);
    }
    ctx.restore();

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillText('ZERO-BACKLASH DIRECT MESH // SLIDING TENSIONER ENGAGED', cx - 170, cy + 120);
  }

  drawModalBalanceDetail(ctx, w, h, frame) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.75;
    const theta = Math.sin(frame * 0.04) * 0.15;

    // Ground
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, cy + 30); ctx.lineTo(w - 40, cy + 30); ctx.stroke();

    // Wheel
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3; ctx.stroke();

    // Pendulum Arm
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -140); ctx.stroke();
    // Chassis box
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-35, -180, 70, 45);
    ctx.restore();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillText(`LQR STATE VECTOR: [x, ẋ, θ=${theta.toFixed(3)}, θ̇]ᵀ`, cx - 140, 50);
  }

  drawModalFrcDetail(ctx, w, h, frame) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.65;
    const angle = Math.sin(frame * 0.03) * 0.5 + 0.6;

    // 4-bar linkage trace path
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy);
    const endX = cx - 60 - Math.cos(angle) * 120;
    const endY = cy - Math.sin(angle) * 120;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(endX, endY, 14, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillText('125 LB FRC PLATFORM // KINEMATIC MOTION ENVELOPE', cx - 160, 50);
  }

  // =========================================================================
  // MODAL CONTENT TEMPLATES
  // =========================================================================
  getModalContent(id) {
    switch (id) {
      case 'resume':
        return `
          <div class="modal-detailed-view">
            <div class="modal-header-section">
              <div>
                <h1 class="modal-title-main">Gavin Higgins</h1>
                <p class="modal-subtitle">B.S. Mechanical Engineering &bull; University of Washington, Seattle</p>
              </div>
              <div style="text-align: right; font-family: var(--font-mono); font-size: 0.8rem; color: #475569;">
                <div>ghigg385@uw.edu &bull; 602-471-8078</div>
                <div>Seattle, WA // Scottsdale, AZ</div>
                <div><a href="https://linkedin.com/in/gavin-higgins-640293334/" target="_blank" style="color:#0284c7; text-decoration:none;">linkedin.com/in/gavin-higgins-640293334</a></div>
              </div>
            </div>

            <div class="modal-meta-grid">
              <div>
                <div class="meta-box-label">DEGREE</div>
                <div class="meta-box-val">B.S. Mechanical Eng</div>
              </div>
              <div>
                <div class="meta-box-label">GPA</div>
                <div class="meta-box-val">3.60 / 4.00</div>
              </div>
              <div>
                <div class="meta-box-label">CURRENT ROLE</div>
                <div class="meta-box-val">Hero Robot Lead @ ARUW</div>
              </div>
              <div>
                <div class="meta-box-label">GRADUATION</div>
                <div class="meta-box-val">June 2029</div>
              </div>
            </div>

            <div class="modal-columns-2">
              <div>
                <h3 class="modal-section-title">ENGINEERING EXPERIENCE</h3>
                <div style="margin-bottom: 18px;">
                  <strong style="font-size: 1.05rem;">Hero Robot Lead</strong>
                  <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 6px;">
                    Advanced Robotics at the University of Washington (ARUW) &bull; Oct 2025 – Present
                  </div>
                  <ul style="padding-left: 18px; font-size: 0.88rem; line-height: 1.5; color: #334155;">
                    <li>Engineered a low-backlash yaw mechanism for the 'Hero' robot using nTop generative design and Solidworks FEA to maximize impact resistance and stiffness. <strong>Placed 3rd in international competition.</strong></li>
                    <li>Replaced faulty drive pulley mounting with zero-backlash components and introduced a serviceable sliding belt tensioner, achieving a <strong>28% total weight reduction</strong>.</li>
                    <li>Leading a team of 5 engineers to redevelop the robot for the 2027 season, targeting weight reduction, modular electronics access, increased shot accuracy, and 1st place standing.</li>
                  </ul>
                </div>

                <div>
                  <strong style="font-size: 1.05rem;">Robot Lead</strong>
                  <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 6px;">
                    High School FRC Robotics Competition Team &bull; Aug 2022 – May 2025
                  </div>
                  <ul style="padding-left: 18px; font-size: 0.88rem; line-height: 1.5; color: #334155;">
                    <li>Directed a team of 10 rookie students to design and fabricate a 125 lb competition robot on a strict 6-week timeline using in-house CNC and manual machining.</li>
                    <li>Eliminated systemic electrical and mechanical failures to build the <strong>highest-performing robot in the team's 15-year history</strong>.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 class="modal-section-title">PROJECTS &amp; SKILLS</h3>
                <div style="margin-bottom: 16px;">
                  <strong>Omni Wheel Suspension Module &amp; Spring Optimization</strong>
                  <p class="modal-text" style="margin-top: 4px;">
                    Engineered robust suspension module for two ARUW 2027 robots using 0.25" 6061 and 4mm carbon fiber with dual MGN9H rails. Validated via ANSYS to withstand <strong>560 N lateral impacts (4x 2026)</strong> and drops from 200% higher elevation. Optimized spring/damper constants via MATLAB script.
                  </p>
                </div>

                <div style="margin-bottom: 16px;">
                  <strong>PID Wheel-Legged Balancing Robot</strong>
                  <p class="modal-text" style="margin-top: 4px;">
                    ESP32-based bipedal balancing robot built to explore inverted pendulum control and state-space LQR modeling. Currently balancing in place; progressing towards jumping, drop damping, and fall recovery.
                  </p>
                </div>

                <div>
                  <strong>Technical Skills &amp; Coursework</strong>
                  <table class="specs-table">
                    <tr><th>CAD &amp; Simulation</th><td>Solidworks, ANSYS FEA, Onshape, nTop</td></tr>
                    <tr><th>Manufacturing</th><td>CNC Machining, Manual Mill &amp; Lathe, 3D Printing</td></tr>
                    <tr><th>Programming/Math</th><td>MATLAB, C/C++ (ESP32), Python, Differential Equations</td></tr>
                    <tr><th>Core MechE</th><td>Statics, Kinematics &amp; Dynamics, Material Science</td></tr>
                  </table>
                </div>
              </div>
            </div>

            <div class="modal-actions-bar">
              <button class="action-btn secondary" id="modalCopyEmail">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Email Address
              </button>
              <button class="action-btn primary" id="modalPrintResume">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / Save Formal PDF
              </button>
            </div>
          </div>
        `;

      case 'suspension':
        return `
          <div class="modal-detailed-view blueprint-theme">
            <div class="modal-header-section">
              <div>
                <span class="dwg-rev" style="font-family:var(--font-mono); margin-bottom: 6px; display:inline-block;">DWG: ARUW-2027-SUSP-01 // REV B</span>
                <h1 class="modal-title-main">Omni Wheel Suspension Module &amp; Spring Optimization</h1>
                <p class="modal-subtitle">Advanced Robotics at the University of Washington (ARUW) &bull; Fall 2026</p>
              </div>
            </div>

            <div class="modal-interactive-simulation">
              <canvas id="modalInteractiveCanvas" style="width:100%; height:100%; display:block;"></canvas>
            </div>

            <div class="modal-meta-grid">
              <div>
                <div class="meta-box-label">LATERAL IMPACT CAPABILITY</div>
                <div class="meta-box-val">560 N (4x 2026 Season)</div>
              </div>
              <div>
                <div class="meta-box-label">DROP TEST RATING</div>
                <div class="meta-box-val">+200% Higher Drop Height</div>
              </div>
              <div>
                <div class="meta-box-label">GUIDE MOTION SYSTEM</div>
                <div class="meta-box-val">Dual MGN9H Linear Rails</div>
              </div>
              <div>
                <div class="meta-box-label">MATERIALS</div>
                <div class="meta-box-val">0.25" 6061-T6 + 4mm CF</div>
              </div>
            </div>

            <div class="modal-columns-2">
              <div>
                <h3 class="modal-section-title">THE ENGINEERING CHALLENGE</h3>
                <p class="modal-text">
                  During the 2026 RoboMaster international competition season, the robot's previous suspension module suffered from binding during high lateral shear events and structural cracking under rapid drop tests. This compromised the computer vision (CV) turret targeting lock.
                </p>
                <p class="modal-text">
                  For the 2027 platform, I completely reimagined the module architecture. By pairing <strong>0.25" CNC-machined 6061 aluminum plates</strong> with rigid <strong>4mm carbon fiber composite plates</strong>, the chassis provides maximum torsional stiffness while shedding weight. Dual high-load <strong>MGN9H linear rails</strong> eliminate all binding off-axis moments.
                </p>
              </div>

              <div>
                <h3 class="modal-section-title">MATLAB &amp; FEA OPTIMIZATION</h3>
                <p class="modal-text">
                  I wrote a dedicated MATLAB simulation script to solve the non-linear mass-spring-damper response under impulse shock inputs. By tuning the spring constant $k$ and viscous damping factor $c$ against field obstacle geometries, we eliminated chassis bottoming-out while preventing resonant bounce during firing runs.
                </p>
                <table class="specs-table">
                  <tr><th>FEA Tool</th><td>ANSYS Mechanical Workbench</td></tr>
                  <tr><th>Yield Safety Factor</th><td>2.4x under 560 N lateral shock</td></tr>
                  <tr><th>Chassis Vehicles</th><td>Standard on both ARUW 2027 competition robots</td></tr>
                </table>
              </div>
            </div>
          </div>
        `;

      case 'yaw':
        return `
          <div class="modal-detailed-view blueprint-theme">
            <div class="modal-header-section">
              <div>
                <span class="dwg-rev" style="font-family:var(--font-mono); margin-bottom: 6px; display:inline-block;">PROJECT: HERO ROBOT // AZIMUTH YAW DRIVE</span>
                <h1 class="modal-title-main">Hero Robot Low-Backlash Yaw Drive &amp; Generative Topology</h1>
                <p class="modal-subtitle">ARUW Lead Role &bull; 3rd Place International Finish &bull; 2027 Redevelopment</p>
              </div>
            </div>

            <div class="modal-interactive-simulation">
              <canvas id="modalInteractiveCanvas" style="width:100%; height:100%; display:block;"></canvas>
            </div>

            <div class="modal-meta-grid">
              <div>
                <div class="meta-box-label">WEIGHT SAVINGS</div>
                <div class="meta-box-val">-28% Total Weight Reduction</div>
              </div>
              <div>
                <div class="meta-box-label">SYSTEM BACKLASH</div>
                <div class="meta-box-val">&plusmn;0.012&deg; (Zero Backlash)</div>
              </div>
              <div>
                <div class="meta-box-label">TOPOLOGY OPTIMIZATION</div>
                <div class="meta-box-val">nTop Generative Lattice</div>
              </div>
              <div>
                <div class="meta-box-label">COMPETITION OUTCOME</div>
                <div class="meta-box-val">3rd Place International</div>
              </div>
            </div>

            <div class="modal-columns-2">
              <div>
                <h3 class="modal-section-title">MECHANISM INNOVATION</h3>
                <p class="modal-text">
                  In international robotic combat, the Hero robot’s high-caliber launcher requires instantaneous targeting lock with zero mechanical hysteresis. Legacy gearboxes suffered from backlash slop that degraded long-range projectile grouping.
                </p>
                <p class="modal-text">
                  I re-engineered the yaw drive using zero-backlash drive pulley mounting paired with a custom serviceable <strong>sliding belt tensioner</strong>. This setup isolates belt slack under rapid reversal torques and maintains uniform pre-tension across extreme operational temperatures.
                </p>
              </div>

              <div>
                <h3 class="modal-section-title">nTop GENERATIVE DESIGN &amp; 2027 LEADERSHIP</h3>
                <p class="modal-text">
                  Using <strong>nTop</strong>, I generated a field-driven triply periodic minimal surface (TPMS) lattice infill for the structural gimbal housing, which was validated via Solidworks FEA to withstand direct projectile impacts while cutting overall assembly mass by 28%.
                </p>
                <p class="modal-text">
                  I am currently leading a team of 5 mechanical and mechatronics engineers to completely rebuild the 2027 robot, optimizing modular electronics accessibility and shot trajectory consistency to compete for 1st place.
                </p>
              </div>
            </div>
          </div>
        `;

      case 'balance':
        return `
          <div class="modal-detailed-view">
            <div class="modal-header-section">
              <div>
                <span style="font-family:var(--font-mono); font-size:0.75rem; background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:4px; font-weight:700;">PERSONAL RESEARCH PROJECT</span>
                <h1 class="modal-title-main" style="margin-top:6px;">ESP32 Bipedal Wheel-Legged Balancing Robot</h1>
                <p class="modal-subtitle">Control Theory, Inverted Pendulum Kinematics &amp; LQR State-Space Modeling</p>
              </div>
            </div>

            <div class="modal-interactive-simulation" style="background:#0f172a;">
              <canvas id="modalInteractiveCanvas" style="width:100%; height:100%; display:block;"></canvas>
            </div>

            <div class="modal-meta-grid">
              <div>
                <div class="meta-box-label">CONTROLLER ARCHITECTURE</div>
                <div class="meta-box-val">ESP32 Dual-Core @ 240MHz</div>
              </div>
              <div>
                <div class="meta-box-label">IMU FUSION</div>
                <div class="meta-box-val">MPU-6050 Complementary Filter</div>
              </div>
              <div>
                <div class="meta-box-label">CURRENT STATUS</div>
                <div class="meta-box-val" style="color:#16a34a;">Balances In Place (Stable)</div>
              </div>
              <div>
                <div class="meta-box-label">NEXT MILESTONES</div>
                <div class="meta-box-val">Jump, Drop &amp; LQR Upgrade</div>
              </div>
            </div>

            <div class="modal-columns-2">
              <div>
                <h3 class="modal-section-title">MOTIVATION &amp; HARDWARE SETUP</h3>
                <p class="modal-text">
                  To bridge theoretical coursework in Differential Equations, Kinematics, and Linear Algebra with real-world dynamic robotics, I designed and fabricated a custom bipedal wheel-legged robot from scratch.
                </p>
                <p class="modal-text">
                  The robot utilizes high-torque brushless hub motors with field-oriented control (FOC) drivers, paired with lightweight carbon fiber articulated linkage legs. An ESP32 microcontroller executes high-frequency balance loops at 500 Hz using low-latency gyro and accelerometer feedback.
                </p>
              </div>

              <div>
                <h3 class="modal-section-title">CONTROL THEORY ROADMAP</h3>
                <p class="modal-text">
                  The initial release balances reliably using dual cascaded PID loops (pitch stabilization inner loop + velocity position outer loop).
                </p>
                <p class="modal-text">
                  I am currently formulating the full 4th-order state-space model:
                  $$\\dot{\\mathbf{x}} = \\mathbf{A}\\mathbf{x} + \\mathbf{B}u$$
                  to implement <strong>Linear Quadratic Regulator (LQR)</strong> optimal control, allowing dynamic leg retraction during jumps and automated fall recovery.
                </p>
              </div>
            </div>
          </div>
        `;

      case 'frc':
        return `
          <div class="modal-detailed-view">
            <div class="modal-header-section">
              <div>
                <span style="font-family:var(--font-mono); font-size:0.75rem; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-weight:700;">FRC ROBOT LEAD &bull; SCOTTSDALE, AZ</span>
                <h1 class="modal-title-main" style="margin-top:6px;">125 lb Competition Robot &amp; In-House Manufacturing</h1>
                <p class="modal-subtitle">High School FRC Robotics Competition Team &bull; 15-Year Team History Record</p>
              </div>
            </div>

            <div class="modal-interactive-simulation" style="background:#0f172a;">
              <canvas id="modalInteractiveCanvas" style="width:100%; height:100%; display:block;"></canvas>
            </div>

            <div class="modal-meta-grid">
              <div>
                <div class="meta-box-label">ROBOT CLASS</div>
                <div class="meta-box-val">125 lb Full Competition Rig</div>
              </div>
              <div>
                <div class="meta-box-label">TEAM MENTORED</div>
                <div class="meta-box-val">10 Rookie Students Directed</div>
              </div>
              <div>
                <div class="meta-box-label">BUILD TIMELINE</div>
                <div class="meta-box-val">6-Week Rapid Manufacturing</div>
              </div>
              <div>
                <div class="meta-box-label">RECORD</div>
                <div class="meta-box-val">Best in 15-Year Team History</div>
              </div>
            </div>

            <div class="modal-columns-2">
              <div>
                <h3 class="modal-section-title">LEADERSHIP &amp; CURRICULUM OVERHAUL</h3>
                <p class="modal-text">
                  Inheriting a team with a history of recurring electrical faults and gearbox failures, I restructured the engineering workflow from the ground up. I trained 10 rookie team members in CAD modeling, wiring harness best practices, and precision machining on manual knee mills and lathes.
                </p>
              </div>

              <div>
                <h3 class="modal-section-title">TECHNICAL ARCHITECTURE</h3>
                <p class="modal-text">
                  We engineered an articulated 4-bar linkage intake and scoring mechanism built from in-house CNC-machined 6061 box tubing and polycarbonate. The robot competed with <strong>zero electrical or mechanical failures</strong> throughout the entire season, breaking all previous team records.
                </p>
              </div>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.workbenchApp = new WorkbenchApp();
});
