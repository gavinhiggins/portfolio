/* ==========================================================================
   GAVIN HIGGINS — APPLICATION CONTROLLER
   Split-Screen Project Inspection & Interactive Component Highlighting
   - Left half:  High-precision CAD Drawing Display (3D WebGL for Hero & Suspension,
                 Interactive 2D Technical Vector Schematics for Folder Projects)
   - Right half: Authentic Vertical Scrollable Paper Sheet with Specs & Interactive Parts
   - Hovering Hero or Suspension on homepage highlights respective resume block
   - Hovering any component text block in inspection highlights parts on the drawing
   ========================================================================== */

class AppController {
  constructor() {
    this.modal = document.getElementById('modal');
    this.modalContainer = document.getElementById('modalContainer');
    this.modalClose = document.getElementById('modalClose');

    this.initEvents();
  }

  initEvents() {
    // 1. Homepage Drawing Hover -> Resume Section Highlighting
    const heroSheet = document.getElementById('sheetHero');
    const suspSheet = document.getElementById('sheetSuspension');
    const resumeHlHero = document.getElementById('resumeHlHero');
    const resumeHlSusp = document.getElementById('resumeHlSuspension');

    if (heroSheet && resumeHlHero) {
      heroSheet.addEventListener('mouseenter', () => resumeHlHero.classList.add('active'));
      heroSheet.addEventListener('mouseleave', () => resumeHlHero.classList.remove('active'));
    }

    if (suspSheet && resumeHlSusp) {
      suspSheet.addEventListener('mouseenter', () => resumeHlSusp.classList.add('active'));
      suspSheet.addEventListener('mouseleave', () => resumeHlSusp.classList.remove('active'));
    }

    // Also wire Manila folder thumbnails for hero and linear suspension
    const folderHero = document.querySelector('.folder-paper-item[data-id="hero"]');
    const folderSusp = document.querySelector('.folder-paper-item[data-id="suspension"]');

    if (folderHero && resumeHlHero) {
      folderHero.addEventListener('mouseenter', () => resumeHlHero.classList.add('active'));
      folderHero.addEventListener('mouseleave', () => resumeHlHero.classList.remove('active'));
    }

    if (folderSusp && resumeHlSusp) {
      folderSusp.addEventListener('mouseenter', () => resumeHlSusp.classList.add('active'));
      folderSusp.addEventListener('mouseleave', () => resumeHlSusp.classList.remove('active'));
    }

    // 2. Click to open modal (Drawing Sheets, Resume, & Folder Projects)
    const sheets = document.querySelectorAll('.paper-item, .folder-paper-item');
    sheets.forEach(sheet => {
      sheet.addEventListener('click', () => {
        const id = sheet.dataset.id;
        // Sticky note remains static per user request
        if (id && id !== 'postit') {
          this.openModal(id);
        }
      });
    });

    // 3. Modal close controls
    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('open')) {
        this.closeModal();
      }
    });
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');

    // Clean up Three.js 3D Inspection Viewer
    if (window.cadEngine && window.cadEngine.destroyInspectionViewer) {
      window.cadEngine.destroyInspectionViewer();
    }

    this.modalContainer.innerHTML = '';
    this.modalContainer.classList.remove('resume-mode');
  }

  openModal(id) {
    if (!this.modal || !this.modalContainer) return;

    if (id === 'resume') {
      this.modalContainer.classList.add('resume-mode');
      this.modalContainer.innerHTML = this.getResumeModalHtml();
      this.modal.classList.add('open');
      this.modal.setAttribute('aria-hidden', 'false');

      if (typeof pdfjsLib !== 'undefined') {
        const modalCanvas = document.getElementById('modalResumeCanvas');
        if (modalCanvas) {
          pdfjsLib.getDocument(encodeURI('Gavin_Higgins_Resume.pdf')).promise.then(pdf => {
            pdf.getPage(1).then(page => {
              const viewport = page.getViewport({ scale: 2.5 });
              modalCanvas.width = viewport.width;
              modalCanvas.height = viewport.height;
              page.render({
                canvasContext: modalCanvas.getContext('2d'),
                viewport: viewport
              });
            });
          });
        }
      }
      return;
    }

    // Split-Screen Inspection Layout for Projects
    this.modalContainer.classList.remove('resume-mode');
    this.modalContainer.innerHTML = this.getModalContent(id);
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');

    // Initialize 3D WebGL Inspection Viewer for Hero and Suspension
    if (id === 'hero' || id === 'suspension') {
      const inspectionCanvas = document.getElementById('inspectionCanvas3D');
      if (inspectionCanvas && window.cadEngine && window.cadEngine.initInspectionViewer) {
        window.cadEngine.initInspectionViewer(inspectionCanvas, id);
      }
    }

    // Wire Interactive Part Cards (Hovering highlights physical parts on drawing)
    this.wireInteractivePartCards();
  }

  wireInteractivePartCards() {
    const partCards = this.modalContainer.querySelectorAll('.doc-part-card');
    const highlightIndicator = this.modalContainer.querySelector('#inspectionHighlightIndicator');

    partCards.forEach(card => {
      const partKeyRaw = card.dataset.part || '';
      const partKeys = partKeyRaw.split(',').map(s => s.trim().toLowerCase());
      const partName = card.querySelector('.doc-part-name')?.textContent || 'COMPONENT';

      card.addEventListener('mouseenter', () => {
        // 1. Update Footer Indicator
        if (highlightIndicator) {
          highlightIndicator.textContent = `HIGHLIGHTING: ${partName.toUpperCase()}`;
          highlightIndicator.classList.add('active');
        }

        // 2. Highlight 3D Meshes (Hero & Suspension)
        if (window.cadEngine && window.cadEngine.highlightInspectionPart) {
          window.cadEngine.highlightInspectionPart(partKeys);
        }

        // 3. Highlight 2D Vector SVG Elements (Folder Projects)
        const svgParts = this.modalContainer.querySelectorAll('.cad-svg-part');
        svgParts.forEach(svgEl => {
          const elKey = (svgEl.dataset.part || '').toLowerCase();
          const isMatch = partKeys.some(k => elKey.includes(k) || k.includes(elKey));
          if (isMatch) {
            svgEl.classList.add('highlighted');
          } else {
            svgEl.classList.remove('highlighted');
          }
        });

        // 4. Highlight Callout Lines
        const calloutLines = this.modalContainer.querySelectorAll('.cad-callout-line');
        calloutLines.forEach(line => {
          const lineKey = (line.dataset.part || '').toLowerCase();
          const isMatch = partKeys.some(k => lineKey.includes(k) || k.includes(lineKey));
          if (isMatch) {
            line.classList.add('active');
          } else {
            line.classList.remove('active');
          }
        });
      });

      card.addEventListener('mouseleave', () => {
        // Reset Footer Indicator
        if (highlightIndicator) {
          highlightIndicator.textContent = 'HOVER A COMPONENT TO HIGHLIGHT';
          highlightIndicator.classList.remove('active');
        }

        // Clear 3D Highlights
        if (window.cadEngine && window.cadEngine.clearInspectionHighlight) {
          window.cadEngine.clearInspectionHighlight();
        }

        // Clear 2D SVG Highlights
        const svgParts = this.modalContainer.querySelectorAll('.cad-svg-part');
        svgParts.forEach(svgEl => svgEl.classList.remove('highlighted'));

        const calloutLines = this.modalContainer.querySelectorAll('.cad-callout-line');
        calloutLines.forEach(line => line.classList.remove('active'));
      });
    });
  }

  getResumeModalHtml() {
    return `
      <div style="font-family: var(--font-sans); color: #1a1a1a;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 18px;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800;">Gavin Higgins — Resume</h1>
            <p style="font-size: 0.88rem; color: #555;">University of Washington, Seattle &bull; B.S. Mechanical Engineering</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="Gavin_Higgins_Resume.pdf" download="Gavin_Higgins_Resume.pdf" style="background: #1e293b; color: #fff; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              ⬇ Download PDF
            </a>
            <a href="Gavin_Higgins_Resume.pdf" target="_blank" style="background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-size: 0.82rem; text-decoration: none;">
              ↗ Open in New Tab
            </a>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; display: flex; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <canvas id="modalResumeCanvas" style="max-width: 100%; height: auto; display: block;"></canvas>
        </div>
      </div>
    `;
  }

  getModalContent(id) {
    switch (id) {
      // ======================================================================
      // 1. 2027 LINEAR SUSPENSION V3 ASSEMBLY
      // Left Display: Full 3D Beauty Assembly (Right Side of Homepage Drawing)
      // ======================================================================
      case 'suspension':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-dwg-bar">
                  <div class="inspection-dwg-title-tag">
                    <span class="dwg-badge-id">ARUW-2027-SUSP-01</span>
                    <span class="dwg-badge-rev">REV B</span>
                    <span class="dwg-badge-name">2027 Linear Suspension V3 Assembly</span>
                  </div>
                  <div class="dwg-hint-text">DRAG TO ORBIT &bull; SCROLL TO ZOOM</div>
                </div>

                <div class="inspection-viewport-frame" id="inspectionViewport">
                  <canvas id="inspectionCanvas3D"></canvas>
                </div>

                <div class="inspection-dwg-footer">
                  <div class="dwg-status-pill">
                    <span class="pulse-dot"></span>
                    <span>ONLINE &bull; SYNCHRONIZED</span>
                  </div>
                  <div class="dwg-model-tag">MODEL: 2027,_Linear_Suspension_V3,_Assembly.glb</div>
                  <div class="dwg-highlight-indicator" id="inspectionHighlightIndicator">HOVER A COMPONENT TO HIGHLIGHT</div>
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="doc-paper-header">
                  <div class="doc-badge-row">
                    <span class="doc-tag doc-tag-blue">DWG: ARUW-2027-SUSP-01 &bull; REV B</span>
                    <span class="doc-tag doc-tag-green">2027 SEASON</span>
                    <span class="doc-tag doc-tag-amber">SUSPENSION LEAD</span>
                  </div>
                  <h1 class="doc-title">2027, Linear Suspension V3, Assembly</h1>
                  <p class="doc-subtitle">Advanced Robotics at the University of Washington (ARUW) &bull; Modular Robot Drivetrain</p>
                </header>

                <div class="doc-specs-grid">
                  <div>
                    <div class="doc-spec-cell-label">LATERAL IMPACT</div>
                    <div class="doc-spec-cell-val">560 N (4x 2026)</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">DROP RATING</div>
                    <div class="doc-spec-cell-val">+200% Higher Drop</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">MOTION SYSTEM</div>
                    <div class="doc-spec-cell-val">Dual MGN9H Rails</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">MATERIAL SPEC</div>
                    <div class="doc-spec-cell-val">0.25" 6061-T6 + CF</div>
                  </div>
                </div>

                <h2 class="doc-section-heading">ENGINEERING RE-DESIGN &amp; MOTION KINEMATICS</h2>
                <p class="doc-paragraph">
                  Engineered an independent linear suspension and drive module for deployment across two ARUW 2027 competition robots. Constructed from precision CNC-machined 0.25" 6061-T6 aluminum structural members paired with 4mm continuous carbon fiber plates, guided by dual MGN9H linear rails to resolve severe carriage binding and structural yield issues observed during the 2026 season.
                </p>

                <h2 class="doc-section-heading">FEA IMPACT VALIDATION &amp; MATLAB OPTIMIZATION</h2>
                <p class="doc-paragraph">
                  Executed non-linear dynamic FEA in ANSYS Workbench to simulate field curb drops and obstacle strikes, verifying survival under 560 N lateral shock loads (a 4x increase over the previous module). Authored a custom MATLAB optimization routine to synthesize non-linear spring constants and viscous damping ratios, guaranteeing stable optical targeting lock for the robot's high-speed computer vision turret during aggressive field maneuvers.
                </p>

                <div class="doc-parts-container">
                  <div class="doc-parts-intro">INTERACTIVE SUBSYSTEM &amp; PART BREAKDOWN (HOVER TO INSPECT)</div>

                  <div class="doc-part-card" data-part="rail,mgn9h,linearrail,carriage">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Dual MGN9H Precision Linear Rails &amp; Carriages</span>
                      <span class="doc-part-pill">MOTION SYSTEM</span>
                    </div>
                    <div class="doc-part-spec">Hardened Bearing Steel &bull; Dual Preloaded C-Carriages &bull; &plusmn;0.005mm</div>
                    <div class="doc-part-desc">
                      Replaces flexure pivots with rigid dual parallel linear guide rails, eliminating off-axis twisting moments and binding during high-speed obstacle collisions.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="spring,suspensionspring,shock,damper,9657k498,shockspacer">
                    <div class="doc-part-header">
                      <span class="doc-part-name">High-Deflection Suspension Spring &amp; Damper Unit</span>
                      <span class="doc-part-pill">DAMPENING</span>
                    </div>
                    <div class="doc-part-spec">Spring Steel Coil &bull; 110mm Travel Stroke &bull; Polyurethane Bumpers</div>
                    <div class="doc-part-desc">
                      Tuned via MATLAB constraint algorithms to absorb high-impact ramp landings while damping high-frequency chassis vibrations that corrupt camera localization.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="omni,wheel,roller,hub,outerplate,rollerspacer">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Concentric Omni Wheel, Rollers &amp; Hub Structure</span>
                      <span class="doc-part-pill">TRACTION UNIT</span>
                    </div>
                    <div class="doc-part-spec">7075-T6 Hub &bull; Dual-Row Polyurethane Rollers &bull; Stainless Pins</div>
                    <div class="doc-part-desc">
                      Precision omnidirectional wheel assembly engineered for seamless lateral translation. Rollers and hub spin concentrically with zero axle runout.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="bridgeplate,mountingplate,carriageplate,standoffplate">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Machined 6061-T6 Bridge Plate &amp; Mounting Base</span>
                      <span class="doc-part-pill">STRUCTURE</span>
                    </div>
                    <div class="doc-part-spec">0.25" 6061-T6 Aluminum &bull; Integrated Fastener Countersinks &bull; Hard Anodized</div>
                    <div class="doc-part-desc">
                      Lightweight bridge plate tying the suspension module to the chassis perimeter while distributing shear loads evenly into carbon fiber mounting webs.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="gearbox,gearboxplate,bearing_3mm,m3508">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Planetary Gearbox Housing &amp; Drive Interface</span>
                      <span class="doc-part-pill">POWERTRAIN</span>
                    </div>
                    <div class="doc-part-spec">Xroll Planetary Gearbox &bull; Dual Radial Bearings &bull; M3508 Drive</div>
                    <div class="doc-part-desc">
                      Direct-coupled planetary reduction transferring 3508 brushless motor torque directly into the omni wheel with low rotational backlash.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 2. 2026 HERO MK1 & TURRET BASE
      // Left Display: TurretBase 3D Assembly (Right Side of Homepage Drawing)
      // ======================================================================
      case 'hero':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-dwg-bar">
                  <div class="inspection-dwg-title-tag">
                    <span class="dwg-badge-id">ARUW-2026-HERO-01</span>
                    <span class="dwg-badge-rev">REV A</span>
                    <span class="dwg-badge-name">Hero Mk1 Turret Base EI Tensioner Assembly</span>
                  </div>
                  <div class="dwg-hint-text">DRAG TO ORBIT &bull; SCROLL TO ZOOM</div>
                </div>

                <div class="inspection-viewport-frame" id="inspectionViewport">
                  <canvas id="inspectionCanvas3D"></canvas>
                </div>

                <div class="inspection-dwg-footer">
                  <div class="dwg-status-pill">
                    <span class="pulse-dot"></span>
                    <span>ONLINE &bull; SYNCHRONIZED</span>
                  </div>
                  <div class="dwg-model-tag">MODEL: TurretBaseRender.glb</div>
                  <div class="dwg-highlight-indicator" id="inspectionHighlightIndicator">HOVER A COMPONENT TO HIGHLIGHT</div>
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="doc-paper-header">
                  <div class="doc-badge-row">
                    <span class="doc-tag doc-tag-amber">HERO ROBOT LEAD</span>
                    <span class="doc-tag doc-tag-green">3RD PLACE INTERNATIONAL</span>
                    <span class="doc-tag doc-tag-blue">ARUW 2026</span>
                  </div>
                  <h1 class="doc-title">2026 Hero Mk1 Assembly &amp; Turret Base EI Tensioner</h1>
                  <p class="doc-subtitle">Advanced Robotics at the University of Washington &bull; Seattle, WA</p>
                </header>

                <div class="doc-specs-grid">
                  <div>
                    <div class="doc-spec-cell-label">BACKLASH</div>
                    <div class="doc-spec-cell-val">&plusmn;0.012&deg; (Zero Backlash)</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">WEIGHT SAVINGS</div>
                    <div class="doc-spec-cell-val">-28% Total Weight</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">OPTIMIZATION</div>
                    <div class="doc-spec-cell-val">nTop Generative</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">FINISH</div>
                    <div class="doc-spec-cell-val">3rd International</div>
                  </div>
                </div>

                <h2 class="doc-section-heading">LOW-BACKLASH YAW MECHANISM &amp; EI TENSIONING</h2>
                <p class="doc-paragraph">
                  Engineered a zero-backlash continuous yaw mechanism for the competition 'Hero' robot. Utilized nTop generative design and FEA stress optimization in SolidWorks Simulation to drastically increase torsional impact resistance and overall stiffness, achieving a 3rd place finish in international competition.
                </p>
                <p class="doc-paragraph">
                  Replaced failure-prone drive pulley mounting with zero-backlash duplex angular-contact bearings. Introduced a field-serviceable sliding belt tensioner (Turret Base EI Tensioner) ensuring precise belt engagement throughout the robot's lifetime and dropping overall assembly mass by 28%.
                </p>

                <h2 class="doc-section-heading">2027 REDEVELOPMENT TEAM LEADERSHIP</h2>
                <p class="doc-paragraph">
                  Currently leading a multidisciplinary team of 5 engineers to re-architect the robot for the 2027 season, focusing on modular electronics accessibility, lower rotational inertia, and sub-milliradian projectile targeting precision.
                </p>

                <div class="doc-parts-container">
                  <div class="doc-parts-intro">INTERACTIVE SUBSYSTEM &amp; PART BREAKDOWN (HOVER TO INSPECT)</div>

                  <div class="doc-part-card" data-part="bearing,innerbearing">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Thin-Section Duplex Angular-Contact Bearing</span>
                      <span class="doc-part-pill">PRECISION YAW AXIS</span>
                    </div>
                    <div class="doc-part-spec">3.5" ID x 4.0" OD &bull; Preloaded Duplex Ball Race &bull; Zero Axial Runout</div>
                    <div class="doc-part-desc">
                      Provides extreme radial and moment stiffness for the continuous turret yaw axis while maintaining an ultra-compact vertical envelope.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="nutplate,einutplate,spacerplate,eispacerplate">
                    <div class="doc-part-header">
                      <span class="doc-part-name">EI Sliding Belt Tensioner &amp; Nut Plate System</span>
                      <span class="doc-part-pill">SERVICEABLE PRELOAD</span>
                    </div>
                    <div class="doc-part-spec">Slotted 7075-T6 Plate &bull; Captive EI Nut Hardware &bull; Rapid Calibration</div>
                    <div class="doc-part-desc">
                      Allows rapid tensioning and fine-tuning of the HTD-3M drive belt from above without requiring full disassembly of the turret yaw housing in competition pit conditions.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="sandwhichplate,sandwichplate,bottomplate,topplate,plate">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Sandwich Structural Plates &amp; Standoff Spacers</span>
                      <span class="doc-part-pill">PRIMARY STRUCTURE</span>
                    </div>
                    <div class="doc-part-spec">CNC 6061-T6 Aluminum &bull; Lightweight Pocketing &bull; Rigid Spacer Posts</div>
                    <div class="doc-part-desc">
                      Stacked structural plates designed with stress-concentration relief radiuses that clamp the duplex bearing outer race and isolate pitch motor reaction torques.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="innerbearingplate,bearing">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Inner Bearing Clamp &amp; Alignment Retainer Flange</span>
                      <span class="doc-part-pill">BEARING CLAMP</span>
                    </div>
                    <div class="doc-part-spec">7075-T6 Precision Ring &bull; 8x Radial Fasteners &bull; Concentric Bore</div>
                    <div class="doc-part-desc">
                      Precisely retains the inner bearing ring to lock yaw axis perpendicularity under high projectile launch recoil forces.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 3. TURRET PITCH GIMBAL & BEARING HOUSING (BLANK 1)
      // Left Display: Interactive 2D Technical Vector CAD Schematic
      // ======================================================================
      case 'blank1':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-dwg-bar">
                  <div class="inspection-dwg-title-tag">
                    <span class="dwg-badge-id">ARUW-2027-GIMB-01</span>
                    <span class="dwg-badge-rev">REV B</span>
                    <span class="dwg-badge-name">Turret Pitch Gimbal &amp; Bearing Housing</span>
                  </div>
                  <div class="dwg-hint-text">HOVER PARTS TO HIGHLIGHT ON SCHEMATIC</div>
                </div>

                <div class="inspection-viewport-frame" id="inspectionViewport">
                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="gimbalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" stroke-width="1.2" />
                      </pattern>
                    </defs>

                    <!-- Background Drafting Grid Lines -->
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />
                    
                    <!-- Centerlines & Axis -->
                    <line x1="60" y1="270" x2="700" y2="270" stroke="#94a3b8" stroke-width="1" stroke-dasharray="8 4 2 4" />
                    <line x1="380" y1="40" x2="380" y2="500" stroke="#94a3b8" stroke-width="1" stroke-dasharray="8 4 2 4" />

                    <!-- Part 1: CNC Machined Pitch Yoke -->
                    <path class="cad-svg-part" data-part="pitch-yoke" d="M 220 140 L 540 140 L 540 180 L 460 180 L 460 360 L 540 360 L 540 400 L 220 400 L 220 360 L 300 360 L 300 180 L 220 180 Z" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.4" />
                    
                    <!-- Part 2: Harmonic Drive Unit & Wave Generator -->
                    <rect class="cad-svg-part" data-part="harmonic-drive" x="320" y="210" width="120" height="120" rx="8" fill="#e2e8f0" stroke="#1e293b" stroke-width="2.2" />
                    <circle class="cad-svg-part" data-part="harmonic-drive" cx="380" cy="270" r="42" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                    <circle class="cad-svg-part" data-part="harmonic-drive" cx="380" cy="270" r="22" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8" />

                    <!-- Part 3: Preloaded Duplex Angular-Contact Bearings -->
                    <g class="cad-svg-part" data-part="bearing-duplex">
                      <rect x="180" y="220" width="38" height="100" fill="#e2e8f0" stroke="#1e293b" stroke-width="2" />
                      <line x1="180" y1="220" x2="218" y2="320" stroke="#1e293b" stroke-width="1.2" />
                      <line x1="180" y1="320" x2="218" y2="220" stroke="#1e293b" stroke-width="1.2" />
                      <circle cx="199" cy="245" r="9" fill="#ffffff" stroke="#1e293b" stroke-width="1.5" />
                      <circle cx="199" cy="295" r="9" fill="#ffffff" stroke="#1e293b" stroke-width="1.5" />

                      <rect x="542" y="220" width="38" height="100" fill="#e2e8f0" stroke="#1e293b" stroke-width="2" />
                      <line x1="542" y1="220" x2="580" y2="320" stroke="#1e293b" stroke-width="1.2" />
                      <line x1="542" y1="320" x2="580" y2="220" stroke="#1e293b" stroke-width="1.2" />
                      <circle cx="561" cy="245" r="9" fill="#ffffff" stroke="#1e293b" stroke-width="1.5" />
                      <circle cx="561" cy="295" r="9" fill="#ffffff" stroke="#1e293b" stroke-width="1.5" />
                    </g>

                    <!-- Part 4: Absolute Optical Encoder & Trunnion Shaft -->
                    <g class="cad-svg-part" data-part="encoder-shaft">
                      <rect x="582" y="248" width="65" height="44" rx="3" fill="#cbd5e1" stroke="#1e293b" stroke-width="2" />
                      <rect x="647" y="238" width="35" height="64" rx="4" fill="#94a3b8" stroke="#1e293b" stroke-width="2" />
                      <circle cx="664" cy="270" r="14" fill="#ffffff" stroke="#1e293b" stroke-width="1.6" />
                    </g>

                    <!-- Dimension Callout Lines & Text -->
                    <line class="cad-callout-line" data-part="pitch-yoke" x1="260" y1="140" x2="260" y2="70" />
                    <line class="cad-callout-line" data-part="pitch-yoke" x1="260" y1="70" x2="200" y2="70" />
                    <text x="190" y="65" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="end">7075-T6 CNC YOKE</text>

                    <line class="cad-callout-line" data-part="harmonic-drive" x1="380" y1="210" x2="380" y2="90" />
                    <text x="380" y="80" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">50:1 HARMONIC REDUCTION</text>

                    <line class="cad-callout-line" data-part="bearing-duplex" x1="199" y1="220" x2="199" y2="120" />
                    <text x="199" y="110" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">DUPLEX ANGULAR CONTACT</text>

                    <line class="cad-callout-line" data-part="encoder-shaft" x1="664" y1="238" x2="664" y2="140" />
                    <text x="664" y="130" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">OPTICAL ENCODER SHAFT</text>
                  </svg>
                </div>

                <div class="inspection-dwg-footer">
                  <div class="dwg-status-pill">
                    <span class="pulse-dot"></span>
                    <span>ONLINE &bull; SYNCHRONIZED</span>
                  </div>
                  <div class="dwg-model-tag">SCHEMATIC: ARUW-2027-GIMB-01.DWG</div>
                  <div class="dwg-highlight-indicator" id="inspectionHighlightIndicator">HOVER A COMPONENT TO HIGHLIGHT</div>
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="doc-paper-header">
                  <div class="doc-badge-row">
                    <span class="doc-tag doc-tag-blue">DWG: ARUW-2027-GIMB-01 &bull; REV B</span>
                    <span class="doc-tag doc-tag-green">2-DoF PRECISION</span>
                    <span class="doc-tag doc-tag-amber">ARUW 2027</span>
                  </div>
                  <h1 class="doc-title">Turret Pitch Gimbal &amp; Bearing Housing</h1>
                  <p class="doc-subtitle">Subsystem A &bull; 2-DoF Precision Pointing Drive &bull; Advanced Robotics at UW</p>
                </header>

                <div class="doc-specs-grid">
                  <div>
                    <div class="doc-spec-cell-label">PITCH RANGE</div>
                    <div class="doc-spec-cell-val">-25&deg; to +40&deg;</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">BACKLASH</div>
                    <div class="doc-spec-cell-val">&lt; 0.008&deg; (Harmonic)</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">DRIVE TYPE</div>
                    <div class="doc-spec-cell-val">Harmonic Drive</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">MATERIAL</div>
                    <div class="doc-spec-cell-val">7075-T6 + Titanium</div>
                  </div>
                </div>

                <h2 class="doc-section-heading">HIGH-PRECISION GIMBAL ARCHITECTURE</h2>
                <p class="doc-paragraph">
                  Engineered the 2027 pitch axis mounting incorporating preloaded duplex angular-contact thin-section bearings, eliminating axis deflection under high projectile recoil loads during continuous fire sequences.
                </p>
                <p class="doc-paragraph">
                  Integrated closed-loop absolute optical encoder feedback directly on the trunnion shaft to guarantee sub-milliradian pointing precision for automatic computer vision target tracking.
                </p>

                <h2 class="doc-section-heading">STRUCTURAL FEA &amp; MASS BUDGET</h2>
                <p class="doc-paragraph">
                  Conducted topology optimization in nTop and SolidWorks Simulation to minimize inertia while maintaining rigidity, reducing pitch assembly mass by 22% compared to previous iterations.
                </p>

                <div class="doc-parts-container">
                  <div class="doc-parts-intro">INTERACTIVE SUBSYSTEM &amp; PART BREAKDOWN (HOVER TO INSPECT)</div>

                  <div class="doc-part-card" data-part="harmonic-drive">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Direct Harmonic Drive Reduction</span>
                      <span class="doc-part-pill">POWERTRAIN</span>
                    </div>
                    <div class="doc-part-spec">50:1 Reduction &bull; Zero Backlash &bull; Flexspline Cup</div>
                    <div class="doc-part-desc">
                      Delivers high holding torque and zero measurable backlash in a compact form factor directly on the pitch trunnion axis.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="bearing-duplex">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Preloaded Duplex Angular-Contact Bearings</span>
                      <span class="doc-part-pill">BEARING RACE</span>
                    </div>
                    <div class="doc-part-spec">Matched Bearing Pair &bull; DB Preload &bull; Grade 5 Balls</div>
                    <div class="doc-part-desc">
                      Resists intense multi-axis projectile recoil impulses without shaft deflection or binding.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="pitch-yoke">
                    <div class="doc-part-header">
                      <span class="doc-part-name">7075-T6 CNC Machined Gimbal Yoke</span>
                      <span class="doc-part-pill">STRUCTURE</span>
                    </div>
                    <div class="doc-part-spec">Monolithic 7075-T6 &bull; Stress Relief Pockets &bull; Hard Anodized</div>
                    <div class="doc-part-desc">
                      Lightweight, high-stiffness trunnion frame that holds the launcher barrel and high-speed flywheel module.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="encoder-shaft">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Absolute Optical Encoder &amp; Trunnion Shaft</span>
                      <span class="doc-part-pill">SENSOR FEEDBACK</span>
                    </div>
                    <div class="doc-part-spec">17-Bit SSI Protocol &bull; Ground Stainless Shaft &bull; Flexible Coupling</div>
                    <div class="doc-part-desc">
                      Provides absolute closed-loop angular feedback with sub-milliradian accuracy for automated target locking.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 4. CHASSIS 4-BAR INDEPENDENT SUSPENSION (BLANK 2)
      // Left Display: Interactive 2D Technical Vector CAD Schematic
      // ======================================================================
      case 'blank2':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-dwg-bar">
                  <div class="inspection-dwg-title-tag">
                    <span class="dwg-badge-id">ARUW-2026-SUSP-04</span>
                    <span class="dwg-badge-rev">REV C</span>
                    <span class="dwg-badge-name">Chassis 4-Bar Independent Suspension</span>
                  </div>
                  <div class="dwg-hint-text">HOVER PARTS TO HIGHLIGHT ON SCHEMATIC</div>
                </div>

                <div class="inspection-viewport-frame" id="inspectionViewport">
                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />
                    
                    <!-- Ground Reference & Travel Datum -->
                    <line x1="50" y1="460" x2="710" y2="460" stroke="#64748b" stroke-width="2" stroke-dasharray="6 3" />
                    <text x="80" y="480" font-family="'IBM Plex Mono', monospace" font-size="10" fill="#64748b">GROUND DATUM PLANE &bull; 0.0mm</text>

                    <!-- Part 1: Upper Control A-Arm Link -->
                    <polygon class="cad-svg-part" data-part="upper-link" points="200,160 480,180 470,210 200,185" fill="#e2e8f0" stroke="#1e293b" stroke-width="2.2" />
                    <circle cx="200" cy="172" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                    <circle cx="475" cy="195" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="2" />

                    <!-- Part 2: Lower Control Link -->
                    <polygon class="cad-svg-part" data-part="lower-link" points="210,320 490,340 480,370 210,345" fill="#e2e8f0" stroke="#1e293b" stroke-width="2.2" />
                    <circle cx="210" cy="332" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                    <circle cx="485" cy="355" r="10" fill="#ffffff" stroke="#1e293b" stroke-width="2" />

                    <!-- Part 3: Oil-Damped Monoshock Damper Coil -->
                    <g class="cad-svg-part" data-part="shock-absorber">
                      <rect x="310" y="210" width="45" height="110" rx="6" fill="#cbd5e1" stroke="#1e293b" stroke-width="2.2" transform="rotate(-20 332 265)" />
                      <!-- Spring Coils -->
                      <line x1="315" y1="230" x2="355" y2="245" stroke="#0284c7" stroke-width="3.5" />
                      <line x1="315" y1="255" x2="355" y2="270" stroke="#0284c7" stroke-width="3.5" />
                      <line x1="315" y1="280" x2="355" y2="295" stroke="#0284c7" stroke-width="3.5" />
                    </g>

                    <!-- Part 4: Upright Knuckle Carrier & Hub -->
                    <g class="cad-svg-part" data-part="upright-knuckle">
                      <path d="M 470 170 L 530 170 L 530 380 L 470 380 Z" fill="#94a3b8" stroke="#1e293b" stroke-width="2.2" />
                      <circle cx="560" cy="370" r="48" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.4" />
                      <circle cx="560" cy="370" r="24" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
                    </g>

                    <!-- Callouts -->
                    <line class="cad-callout-line" data-part="upper-link" x1="340" y1="170" x2="340" y2="90" />
                    <text x="340" y="80" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">UPPER 6061 CONTROL ARM</text>

                    <line class="cad-callout-line" data-part="shock-absorber" x1="320" y1="260" x2="220" y2="260" />
                    <text x="210" y="264" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="end">OIL-DAMPED MONOSHOCK</text>

                    <line class="cad-callout-line" data-part="lower-link" x1="350" y1="330" x2="350" y2="420" />
                    <text x="350" y="435" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">PARALLEL LOWER LINK</text>

                    <line class="cad-callout-line" data-part="upright-knuckle" x1="530" y1="280" x2="620" y2="280" />
                    <text x="630" y="284" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="start">UPRIGHT KNUCKLE CARRIER</text>
                  </svg>
                </div>

                <div class="inspection-dwg-footer">
                  <div class="dwg-status-pill">
                    <span class="pulse-dot"></span>
                    <span>ONLINE &bull; SYNCHRONIZED</span>
                  </div>
                  <div class="dwg-model-tag">SCHEMATIC: ARUW-2026-SUSP-04.DWG</div>
                  <div class="dwg-highlight-indicator" id="inspectionHighlightIndicator">HOVER A COMPONENT TO HIGHLIGHT</div>
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="doc-paper-header">
                  <div class="doc-badge-row">
                    <span class="doc-tag doc-tag-green">DWG: ARUW-2026-SUSP-04 &bull; REV C</span>
                    <span class="doc-tag doc-tag-blue">FOUR-BAR LINKAGE</span>
                    <span class="doc-tag doc-tag-amber">ARUW 2026</span>
                  </div>
                  <h1 class="doc-title">Chassis 4-Bar Independent Suspension</h1>
                  <p class="doc-subtitle">Subsystem B &bull; High-Speed Obstacle Dampening &bull; Advanced Robotics at UW</p>
                </header>

                <div class="doc-specs-grid">
                  <div>
                    <div class="doc-spec-cell-label">WHEEL TRAVEL</div>
                    <div class="doc-spec-cell-val">42 mm Stroke</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">DAMPENING</div>
                    <div class="doc-spec-cell-val">Oil-Damped Monoshock</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">CAMBER SHIFT</div>
                    <div class="doc-spec-cell-val">0.0&deg; Zero Camber</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">MATERIAL</div>
                    <div class="doc-spec-cell-val">0.125" CF + 6061-T6</div>
                  </div>
                </div>

                <h2 class="doc-section-heading">FOUR-BAR KINEMATICS &amp; CONSTANT CAMBER</h2>
                <p class="doc-paragraph">
                  Synthesized a parallel four-bar linkage geometry that maintains upright wheel ground contact across the entire 42mm suspension stroke, eliminating tire scrub and steering scrub radius shifts during high-speed omnidirectional maneuvers.
                </p>

                <h2 class="doc-section-heading">IMPACT SURVIVABILITY &amp; BUSHING DURABILITY</h2>
                <p class="doc-paragraph">
                  FEA drop simulations validated under 4.5g shock loads on competition obstacle ramps. Hard-anodized standoffs and PTFE pivot bushings ensure lifetime serviceability without lubrication breakdown under abrasive field dust.
                </p>

                <div class="doc-parts-container">
                  <div class="doc-parts-intro">INTERACTIVE SUBSYSTEM &amp; PART BREAKDOWN (HOVER TO INSPECT)</div>

                  <div class="doc-part-card" data-part="upper-link">
                    <div class="doc-part-header">
                      <span class="doc-part-name">6061-T6 Upper Control A-Arm</span>
                      <span class="doc-part-pill">UPPER LINK</span>
                    </div>
                    <div class="doc-part-spec">Machined 6061-T6 &bull; Dual Pivot Bores &bull; Weight Pocketing</div>
                    <div class="doc-part-desc">
                      Controls wheel assembly camber angle throughout the full vertical travel envelope.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="lower-link">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Lower Link Rod &amp; Spherical Bushings</span>
                      <span class="doc-part-pill">LOWER LINK</span>
                    </div>
                    <div class="doc-part-spec">High-Tensile Aluminum &bull; Maintenance-Free PTFE Bushings</div>
                    <div class="doc-part-desc">
                      Absorbs horizontal drive braking forces and transmits vertical road irregularities into the damper.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="shock-absorber">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Oil-Damped Monoshock Coilover Unit</span>
                      <span class="doc-part-pill">COILOVER</span>
                    </div>
                    <div class="doc-part-spec">Adjustable Preload Collar &bull; Viscous Damping &bull; Progressive Spring</div>
                    <div class="doc-part-desc">
                      Provides smooth, controlled energy dissipation over high field obstacles preventing chassis bottoming.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="upright-knuckle">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Wheel Hub Upright Knuckle Carrier</span>
                      <span class="doc-part-pill">CARRIER</span>
                    </div>
                    <div class="doc-part-spec">7075-T6 Knuckle &bull; Dual Sealed Ball Bearings &bull; Drive Axle Boss</div>
                    <div class="doc-part-desc">
                      Rigidly couples the omni drive wheel to the suspension links with zero mechanical play.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 5. HIGH-THROUGHPUT DART FEEDER (DARTFEEDER)
      // Left Display: Interactive 2D Technical Vector CAD Schematic
      // ======================================================================
      case 'dartfeeder':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-dwg-bar">
                  <div class="inspection-dwg-title-tag">
                    <span class="dwg-badge-id">ARUW-2026-FEED-02</span>
                    <span class="dwg-badge-rev">REV A</span>
                    <span class="dwg-badge-name">High-Throughput Dart Feeder &amp; Agitator</span>
                  </div>
                  <div class="dwg-hint-text">HOVER PARTS TO HIGHLIGHT ON SCHEMATIC</div>
                </div>

                <div class="inspection-viewport-frame" id="inspectionViewport">
                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />

                    <!-- Part 1: Polycarbonate Hopper Funnel -->
                    <polygon class="cad-svg-part" data-part="hopper-funnel" points="160,80 600,80 460,260 300,260" fill="#e0f2fe" stroke="#1e293b" stroke-width="2.2" opacity="0.8" />
                    
                    <!-- Part 2: Cycloidal Starwheel Agitator -->
                    <g class="cad-svg-part" data-part="cycloidal-star">
                      <circle cx="380" cy="310" r="75" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.4" />
                      <!-- Starwheel Pockets -->
                      <circle cx="380" cy="245" r="16" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
                      <circle cx="445" cy="310" r="16" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
                      <circle cx="380" cy="375" r="16" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
                      <circle cx="315" cy="310" r="16" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
                      <circle cx="380" cy="310" r="22" fill="#cbd5e1" stroke="#1e293b" stroke-width="2" />
                    </g>

                    <!-- Part 3: Indexing Drive Pinion -->
                    <g class="cad-svg-part" data-part="indexing-pinion">
                      <circle cx="270" cy="310" r="28" fill="#94a3b8" stroke="#1e293b" stroke-width="2.2" />
                      <circle cx="270" cy="310" r="12" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
                    </g>

                    <!-- Part 4: Barrel Escapement Gate -->
                    <g class="cad-svg-part" data-part="barrel-gate">
                      <rect x="350" y="410" width="60" height="85" fill="#e2e8f0" stroke="#1e293b" stroke-width="2.2" />
                      <line x1="380" y1="410" x2="380" y2="495" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4 2" />
                      <!-- Optical Gate Beam Sensor -->
                      <circle cx="340" cy="450" r="5" fill="#ef4444" />
                      <circle cx="420" cy="450" r="5" fill="#ef4444" />
                      <line x1="340" y1="450" x2="420" y2="450" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3 3" />
                    </g>

                    <!-- Callouts -->
                    <line class="cad-callout-line" data-part="hopper-funnel" x1="220" y1="80" x2="220" y2="45" />
                    <text x="220" y="40" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">POLYCARBONATE HOPPER FUNNEL</text>

                    <line class="cad-callout-line" data-part="indexing-pinion" x1="270" y1="310" x2="180" y2="310" />
                    <text x="170" y="314" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="end">CYCLOIDAL DRIVE PINION</text>

                    <line class="cad-callout-line" data-part="cycloidal-star" x1="445" y1="310" x2="550" y2="310" />
                    <text x="560" y="314" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="start">CNC DELRIN 150 STARWHEEL</text>

                    <line class="cad-callout-line" data-part="barrel-gate" x1="410" y1="450" x2="520" y2="450" />
                    <text x="530" y="454" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="start">BARREL FEED ESCAPEMENT</text>
                  </svg>
                </div>

                <div class="inspection-dwg-footer">
                  <div class="dwg-status-pill">
                    <span class="pulse-dot"></span>
                    <span>ONLINE &bull; SYNCHRONIZED</span>
                  </div>
                  <div class="dwg-model-tag">SCHEMATIC: ARUW-2026-FEED-02.DWG</div>
                  <div class="dwg-highlight-indicator" id="inspectionHighlightIndicator">HOVER A COMPONENT TO HIGHLIGHT</div>
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="doc-paper-header">
                  <div class="doc-badge-row">
                    <span class="doc-tag doc-tag-red">DWG: ARUW-2026-FEED-02 &bull; REV A</span>
                    <span class="doc-tag doc-tag-amber">ZERO-JAM INDEXER</span>
                    <span class="doc-tag doc-tag-blue">ARUW 2026</span>
                  </div>
                  <h1 class="doc-title">High-Throughput Dart Feeder &amp; Cycloidal Agitator</h1>
                  <p class="doc-subtitle">Subsystem C &bull; Zero-Jam Indexing Mechanism &bull; Advanced Robotics at UW</p>
                </header>

                <div class="doc-specs-grid">
                  <div>
                    <div class="doc-spec-cell-label">FEED RATE</div>
                    <div class="doc-spec-cell-val">30 rds / sec</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">JAM RATE</div>
                    <div class="doc-spec-cell-val">0.00% Zero-Jam</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">INDEXING</div>
                    <div class="doc-spec-cell-val">Continuous Cycloidal</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">MATERIAL</div>
                    <div class="doc-spec-cell-val">Delrin 150 + 6061</div>
                  </div>
                </div>

                <h2 class="doc-section-heading">ANTI-JAM HOPPER INDEXING ARCHITECTURE</h2>
                <p class="doc-paragraph">
                  Designed a custom cycloidal starwheel agitator that actively separates compressed foam projectiles in the bulk hopper, channeling individual rounds into the launch barrel at 30 rounds/second without double-feeding or pinching.
                </p>

                <h2 class="doc-section-heading">CYCLE DURABILITY &amp; LOW-FRICTION DELRIN</h2>
                <p class="doc-paragraph">
                  CNC-machined Delrin 150 starwheels dramatically minimize frictional heat against polyurethane dart bodies, achieving 15,000+ continuous test cycles without mechanical wear or projectile jamming.
                </p>

                <div class="doc-parts-container">
                  <div class="doc-parts-intro">INTERACTIVE SUBSYSTEM &amp; PART BREAKDOWN (HOVER TO INSPECT)</div>

                  <div class="doc-part-card" data-part="cycloidal-star">
                    <div class="doc-part-header">
                      <span class="doc-part-name">CNC Delrin 150 Cycloidal Starwheel Agitator</span>
                      <span class="doc-part-pill">AGITATOR</span>
                    </div>
                    <div class="doc-part-spec">Machined Delrin 150 &bull; 4-Pocket Cycloidal Profile &bull; Low Friction</div>
                    <div class="doc-part-desc">
                      Gently indexes soft polyurethane darts without crushing them, preventing hopper blockages during sustained firing.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="hopper-funnel">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Low-Friction Polycarbonate Feed Hopper</span>
                      <span class="doc-part-pill">HOPPER</span>
                    </div>
                    <div class="doc-part-spec">Thermoformed Polycarbonate &bull; Polished Internal Slope &bull; 200 Rd Capacity</div>
                    <div class="doc-part-desc">
                      Directs projectiles smoothly into the agitator pockets using gravity and vibration assist.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="indexing-pinion">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Hardened Steel Indexing Pinion Gear</span>
                      <span class="doc-part-pill">DRIVE PINION</span>
                    </div>
                    <div class="doc-part-spec">4140 Steel Pinion &bull; Mod 0.8 &bull; Keyed Shaft Interface</div>
                    <div class="doc-part-desc">
                      Transmits brushless motor torque into the cycloidal starwheel with zero tooth stripping under jam-clearing spikes.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="barrel-gate">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Escapement Barrel Gate &amp; Optical Feed Sensor</span>
                      <span class="doc-part-pill">FEED SENSOR</span>
                    </div>
                    <div class="doc-part-spec">Infrared Beam Break &bull; CNC Aluminum Gate &bull; &lt;1ms Response</div>
                    <div class="doc-part-desc">
                      Detects dart position before flywheel insertion to ensure zero dry-firing and synchronize burst fire counts.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 6. EI TENSIONER & BELT DRIVE (TENSIONER)
      // Left Display: Interactive 2D Technical Vector CAD Schematic
      // ======================================================================
      case 'tensioner':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-dwg-bar">
                  <div class="inspection-dwg-title-tag">
                    <span class="dwg-badge-id">ARUW-2026-TENS-03</span>
                    <span class="dwg-badge-rev">REV B</span>
                    <span class="dwg-badge-name">EI Tensioner &amp; Belt Drive Assembly</span>
                  </div>
                  <div class="dwg-hint-text">HOVER PARTS TO HIGHLIGHT ON SCHEMATIC</div>
                </div>

                <div class="inspection-viewport-frame" id="inspectionViewport">
                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />

                    <!-- Part 1: Slotted Mounting Slide Plate -->
                    <g class="cad-svg-part" data-part="slide-plate">
                      <rect x="180" y="160" width="400" height="220" rx="8" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.2" />
                      <!-- Adjustment Slot -->
                      <rect x="230" y="240" width="160" height="40" rx="20" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                    </g>

                    <!-- Part 2: Dual Eccentric Cam Preload Adjuster -->
                    <g class="cad-svg-part" data-part="eccentric-cam">
                      <circle cx="340" cy="260" r="45" fill="#e2e8f0" stroke="#1e293b" stroke-width="2.2" />
                      <circle cx="355" cy="260" r="22" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                      <!-- Hex Key Slot -->
                      <polygon points="355,252 362,256 362,264 355,268 348,264 348,256" fill="#94a3b8" stroke="#1e293b" stroke-width="1.2" />
                    </g>

                    <!-- Part 3: Double-Flanged Idler Pulley -->
                    <g class="cad-svg-part" data-part="idler-pulley">
                      <rect x="440" y="210" width="55" height="100" rx="4" fill="#cbd5e1" stroke="#1e293b" stroke-width="2.2" />
                      <!-- Pulley Flanges -->
                      <line x1="435" y1="210" x2="500" y2="210" stroke="#1e293b" stroke-width="3" />
                      <line x1="435" y1="310" x2="500" y2="310" stroke="#1e293b" stroke-width="3" />
                      <!-- HTD-3M Belt Path -->
                      <path d="M 120 220 L 440 220 C 470 220 470 300 440 300 L 120 300" fill="none" stroke="#0284c7" stroke-width="4.5" stroke-dasharray="6 3" />
                    </g>

                    <!-- Part 4: High-Tensile Grade 10.9 Hardware -->
                    <g class="cad-svg-part" data-part="locking-hardware">
                      <circle cx="260" cy="260" r="16" fill="#64748b" stroke="#1e293b" stroke-width="2" />
                      <circle cx="260" cy="260" r="7" fill="#ffffff" stroke="#1e293b" stroke-width="1.5" />
                      <circle cx="530" cy="190" r="12" fill="#64748b" stroke="#1e293b" stroke-width="1.8" />
                      <circle cx="530" cy="350" r="12" fill="#64748b" stroke="#1e293b" stroke-width="1.8" />
                    </g>

                    <!-- Callouts -->
                    <line class="cad-callout-line" data-part="slide-plate" x1="280" y1="160" x2="280" y2="90" />
                    <text x="280" y="80" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">SLOTTED 7075-T6 SLIDE PLATE</text>

                    <line class="cad-callout-line" data-part="eccentric-cam" x1="340" y1="215" x2="340" y2="120" />
                    <text x="340" y="110" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">DUAL ECCENTRIC CAM</text>

                    <line class="cad-callout-line" data-part="idler-pulley" x1="470" y1="210" x2="470" y2="120" />
                    <text x="470" y="110" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">FLANGED HTD-3M IDLER</text>

                    <line class="cad-callout-line" data-part="locking-hardware" x1="260" y1="276" x2="260" y2="420" />
                    <text x="260" y="435" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#0284c7" font-weight="700" text-anchor="middle">GRADE 10.9 LOCKING HARDWARE</text>
                  </svg>
                </div>

                <div class="inspection-dwg-footer">
                  <div class="dwg-status-pill">
                    <span class="pulse-dot"></span>
                    <span>ONLINE &bull; SYNCHRONIZED</span>
                  </div>
                  <div class="dwg-model-tag">SCHEMATIC: ARUW-2026-TENS-03.DWG</div>
                  <div class="dwg-highlight-indicator" id="inspectionHighlightIndicator">HOVER A COMPONENT TO HIGHLIGHT</div>
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="doc-paper-header">
                  <div class="doc-badge-row">
                    <span class="doc-tag doc-tag-blue">DWG: ARUW-2026-TENS-03 &bull; REV B</span>
                    <span class="doc-tag doc-tag-amber">BELT PRELOAD</span>
                    <span class="doc-tag doc-tag-green">ARUW 2026</span>
                  </div>
                  <h1 class="doc-title">EI Tensioner &amp; Belt Drive Assembly</h1>
                  <p class="doc-subtitle">Subsystem D &bull; Precision Belt Preload &bull; Advanced Robotics at UW</p>
                </header>

                <div class="doc-specs-grid">
                  <div>
                    <div class="doc-spec-cell-label">DRIVE RATIO</div>
                    <div class="doc-spec-cell-val">4.2:1 Compound</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">PRELOAD ADJUST</div>
                    <div class="doc-spec-cell-val">Dual Eccentric Cam</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">BELT SPEC</div>
                    <div class="doc-spec-cell-val">HTD-3M Pitch</div>
                  </div>
                  <div>
                    <div class="doc-spec-cell-label">MATERIAL</div>
                    <div class="doc-spec-cell-val">7075-T6 + CF Plate</div>
                  </div>
                </div>

                <h2 class="doc-section-heading">CONTINUOUS BELT TENSIONING &amp; ZERO SLIP</h2>
                <p class="doc-paragraph">
                  Designed an eccentric idler tensioner that maintains consistent tooth engagement during rapid reversals without belt tooth jumping, skipping, or backlash under violent deceleration impulses.
                </p>

                <h2 class="doc-section-heading">FEA &amp; MASS REDUCTION OPTIMIZATION</h2>
                <p class="doc-paragraph">
                  Pocketed 7075-T6 aluminum mounting plates designed with FEA stress concentration relief, reducing weight by 34% while withstanding maximum belt pre-tensioning without plate deflection.
                </p>

                <div class="doc-parts-container">
                  <div class="doc-parts-intro">INTERACTIVE SUBSYSTEM &amp; PART BREAKDOWN (HOVER TO INSPECT)</div>

                  <div class="doc-part-card" data-part="eccentric-cam">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Dual Eccentric Cam Preload Adjuster</span>
                      <span class="doc-part-pill">CAM ADJUST</span>
                    </div>
                    <div class="doc-part-spec">Stainless Steel &bull; Hex Key Actuation &bull; 4mm Continuous Offset</div>
                    <div class="doc-part-desc">
                      Rotates smoothly to take up belt slack without altering center-to-center pulley alignment.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="idler-pulley">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Double-Flanged HTD-3M Idler Pulley</span>
                      <span class="doc-part-pill">IDLER PULLEY</span>
                    </div>
                    <div class="doc-part-spec">6061-T6 &bull; Dual Abec-7 Sealed Bearings &bull; HTD-3M Pitch</div>
                    <div class="doc-part-desc">
                      Guides the timing belt securely, preventing axial belt walking during rapid motor direction reversals.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="slide-plate">
                    <div class="doc-part-header">
                      <span class="doc-part-name">7075-T6 Pocketed Tensioner Slide Plate</span>
                      <span class="doc-part-pill">SLIDE PLATE</span>
                    </div>
                    <div class="doc-part-spec">CNC 7075-T6 &bull; Precision Machined Slot &bull; Hard Coat Anodized</div>
                    <div class="doc-part-desc">
                      Serves as the structural mounting bracket, featuring rigid guide slots for quick track adjustment.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>

                  <div class="doc-part-card" data-part="locking-hardware">
                    <div class="doc-part-header">
                      <span class="doc-part-name">Grade 10.9 Locking Hardware &amp; Washers</span>
                      <span class="doc-part-pill">FASTENERS</span>
                    </div>
                    <div class="doc-part-spec">Grade 10.9 Alloy Steel &bull; Serrated Nord-Lock Washers &bull; Anti-Vibration</div>
                    <div class="doc-part-desc">
                      Locks the tensioner position permanently during fierce robot battle impacts and chassis vibration.
                    </div>
                    <div class="doc-part-prompt">🔍 Highlight on drawing &rarr;</div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();
});
