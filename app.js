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

    partCards.forEach(card => {
      const partKeyRaw = card.dataset.part || '';
      const partKeys = partKeyRaw.split(',').map(s => s.trim().toLowerCase());

      card.addEventListener('mouseenter', () => {
        card.classList.add('active');

        // 1. Highlight 3D Meshes (Hero & Suspension)
        if (window.cadEngine && window.cadEngine.highlightInspectionPart) {
          window.cadEngine.highlightInspectionPart(partKeys);
        }

        // 2. Highlight 2D Vector SVG Elements (Folder Projects)
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

        // 3. Highlight Callout Lines
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
        card.classList.remove('active');

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
            <h1 style="font-size: 1.6rem; font-weight: 800; margin: 0 0 4px 0;">Gavin Higgins — Resume</h1>
            <p style="font-size: 0.88rem; color: #555; margin: 0;">University of Washington, Seattle &bull; B.S. Mechanical Engineering</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="Gavin_Higgins_Resume.pdf" download="Gavin_Higgins_Resume.pdf" style="background: #1e293b; color: #fff; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              &#11015; Download PDF
            </a>
            <a href="Gavin_Higgins_Resume.pdf" target="_blank" style="background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-size: 0.82rem; text-decoration: none;">
              &#8599; Open in New Tab
            </a>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; display: flex; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <canvas id="modalResumeCanvas" style="max-width: 100%; height: auto; display: block;"></canvas>
        </div>
      </div>
    `;
  }

  getZoneBorderSvg() {
    return `
      <svg class="zone-border-svg" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <rect x="2" y="2" width="996" height="696" fill="none" stroke="#777" stroke-width="1.5" />
        <rect x="18" y="18" width="964" height="664" fill="none" stroke="#555" stroke-width="1.8" />
        
        <!-- Zone Ticks Top & Bottom -->
        <line x1="265" y1="2" x2="265" y2="18" stroke="#777" stroke-width="1.2" />
        <line x1="500" y1="2" x2="500" y2="18" stroke="#777" stroke-width="1.2" />
        <line x1="735" y1="2" x2="735" y2="18" stroke="#777" stroke-width="1.2" />
        <line x1="265" y1="682" x2="265" y2="698" stroke="#777" stroke-width="1.2" />
        <line x1="500" y1="682" x2="500" y2="698" stroke="#777" stroke-width="1.2" />
        <line x1="735" y1="682" x2="735" y2="698" stroke="#777" stroke-width="1.2" />

        <!-- Zone Numbers Top -->
        <text x="145" y="14" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">4</text>
        <text x="382" y="14" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">3</text>
        <text x="618" y="14" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">2</text>
        <text x="855" y="14" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">1</text>

        <!-- Zone Numbers Bottom -->
        <text x="145" y="694" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">4</text>
        <text x="382" y="694" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">3</text>
        <text x="618" y="694" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">2</text>
        <text x="855" y="694" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">1</text>

        <!-- Zone Ticks Left & Right -->
        <line x1="2" y1="185" x2="18" y2="185" stroke="#777" stroke-width="1.2" />
        <line x1="2" y1="350" x2="18" y2="350" stroke="#777" stroke-width="1.2" />
        <line x1="2" y1="515" x2="18" y2="515" stroke="#777" stroke-width="1.2" />
        <line x1="982" y1="185" x2="998" y2="185" stroke="#777" stroke-width="1.2" />
        <line x1="982" y1="350" x2="998" y2="350" stroke="#777" stroke-width="1.2" />
        <line x1="982" y1="515" x2="998" y2="515" stroke="#777" stroke-width="1.2" />

        <!-- Zone Letters Left -->
        <text x="10" y="105" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">D</text>
        <text x="10" y="272" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">C</text>
        <text x="10" y="438" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">B</text>
        <text x="10" y="605" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">A</text>

        <!-- Zone Letters Right -->
        <text x="990" y="105" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">D</text>
        <text x="990" y="272" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">C</text>
        <text x="990" y="438" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">B</text>
        <text x="990" y="605" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#333" text-anchor="middle">A</text>
      </svg>
    `;
  }

  getCadTitleBlock(title, subtitle, rev, scale, notes) {
    return `
      <div class="drawing-title-block unified-cad-block">
        <div class="cad-sec cad-sec-1">
          <div class="cad-sec-header">SPECIFICATIONS &amp; NOTES</div>
          <div class="cad-sec-body">
            <div class="cad-sec-text">
              ${notes || '1. ALL DIMENSIONS IN MM.<br>2. REMOVE ALL BURRS &amp; SHARP EDGES.<br>3. HOVER BOM ROWS TO HIGHLIGHT.'}
            </div>
          </div>
        </div>
        <div class="cad-section-right">
          <div class="cad-sec-2">
            <div class="cad-sec-header">PART TITLE &amp; ORG</div>
            <div class="cad-sec-body">
              <div class="cad-sec-title">${title}</div>
              <div class="cad-sec-subtitle">${subtitle || 'UNIV OF WASH &bull; ADVANCED ROBOTICS &bull; ARUW'}</div>
            </div>
          </div>
          <div class="cad-sec-3">
            <div class="cad-sec-header">CAD METRICS</div>
            <div class="cad-sec-body">
              <div class="cad-sec-text">
                DWN: G.H. &bull; CHK: G.H. &bull; REV: ${rev || 'A'}<br>
                CONFIG: Default &bull; SIZE: D &bull; SCALE: ${scale || '1:1'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getModalContent(id) {
    const zoneSvg = this.getZoneBorderSvg();

    switch (id) {
      // ======================================================================
      // 1. 2027 LINEAR SUSPENSION V3 ASSEMBLY
      // ======================================================================
      case 'suspension':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-sheet-inner-frame">
                  ${zoneSvg}
                  <div class="sheet-corner-tag">ZONE D-2 &bull; 3D CAD BEAUTY ASSEMBLY</div>
                  <div class="sheet-corner-hint">NOTE: DRAG TO ORBIT &bull; SCROLL TO ZOOM</div>
                  
                  <canvas id="inspectionCanvas3D"></canvas>
                  
                  ${this.getCadTitleBlock(
                    '2027, Linear Suspension V3, Assembly',
                    'UNIV OF WASH &bull; ADVANCED ROBOTICS &bull; ARUW 2027',
                    'B',
                    '1:1',
                    '1. ALL DIMENSIONS IN MM. REMOVE ALL BURRS.<br>2. MATERIAL: AL 6061-T6 / CF. CLEAR ANODIZE.<br>3. HOVER BOM ROWS TO HIGHLIGHT PARTS.'
                  )}
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="eng-report-header">
                  <div class="eng-header-org">UNIVERSITY OF WASHINGTON &bull; ADVANCED ROBOTICS (ARUW)</div>
                  <div class="eng-header-sub">DEPARTMENT OF MECHANICAL ENGINEERING &bull; SUBSYSTEM DESIGN REPORT</div>
                  <div class="eng-header-rule"></div>
                  <div class="eng-doc-info-row">
                    <span><strong>DOC ID:</strong> ARUW-2027-SUSP-01</span>
                    <span><strong>REV:</strong> B</span>
                    <span><strong>LEAD:</strong> Gavin Higgins (Suspension Lead)</span>
                  </div>
                  <h1 class="eng-report-title">2027 Linear Suspension V3 Assembly</h1>
                </header>

                <div class="eng-sec-heading">1.0 Subsystem Design &amp; Performance Specifications</div>
                <table class="eng-param-table">
                  <tr>
                    <td class="param-lbl">Lateral Shock Rating</td>
                    <td class="param-val">560 N (4x 2026 Module)</td>
                    <td class="param-lbl">Vertical Travel</td>
                    <td class="param-val">38 mm Full Deflection</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Drop Survivability</td>
                    <td class="param-val">+200% Kinetic Absorption</td>
                    <td class="param-lbl">Linear Guidance</td>
                    <td class="param-val">Dual MGN9H Ground Rails</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Structural Materials</td>
                    <td class="param-val">0.25" 6061-T6 + Carbon Fiber</td>
                    <td class="param-lbl">Kinematic State</td>
                    <td class="param-val">Dynamic MATLAB Constraint</td>
                  </tr>
                </table>

                <div class="eng-sec-heading">2.0 Kinematic Synthesis &amp; Non-Linear FEA</div>
                <p class="eng-doc-p">
                  Engineered an independent linear suspension and drive module for deployment across two ARUW 2027 competition robots. Constructed from precision CNC-machined 0.25" 6061-T6 aluminum structural members paired with 4mm continuous carbon fiber plates, guided by dual MGN9H linear rails to resolve severe carriage binding and structural yield issues observed during the 2026 season.
                </p>
                <p class="eng-doc-p">
                  Executed non-linear dynamic FEA in ANSYS Workbench to simulate field curb drops and obstacle strikes, verifying survival under 560 N lateral shock loads (a 4x increase over the previous module). Authored a custom MATLAB optimization routine to synthesize non-linear spring constants and viscous damping ratios, guaranteeing stable optical targeting lock for the robot's high-speed computer vision turret during aggressive field maneuvers.
                </p>

                <div class="eng-sec-heading">3.0 Bill of Materials &amp; Subsystem Breakdown</div>
                <div class="eng-bom-hint">HOVER ANY ROW TO HIGHLIGHT ON DRAWING &rarr;</div>
                <table class="eng-bom-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">ITEM</th>
                      <th style="width: 32%;">COMPONENT NAME</th>
                      <th style="width: 28%;">MATERIAL / SPEC</th>
                      <th style="width: 32%;">FUNCTION / SUBSYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="doc-part-card" data-part="rail,carriage,mgn9h">
                      <td class="bom-no">01</td>
                      <td class="bom-name">Dual MGN9H Precision Linear Rails</td>
                      <td>Bearing Steel &bull; &plusmn;0.005mm</td>
                      <td>Rigid dual guide rails eliminating off-axis binding during obstacle collisions.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="spring,suspensionspring,shock,damper,9657k498">
                      <td class="bom-no">02</td>
                      <td class="bom-name">High-Deflection Suspension Spring Unit</td>
                      <td>Coil Steel &bull; 110mm Travel</td>
                      <td>Tuned via MATLAB constraint algorithms to absorb high-impact ramp landings.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="omni,wheel,roller,hub,outerplate,rollerspacer,dowel">
                      <td class="bom-no">03</td>
                      <td class="bom-name">Concentric Omni Wheel &amp; Hub Structure</td>
                      <td>7075-T6 Hub &bull; Dual-Row Polyurethane</td>
                      <td>Precision omnidirectional wheel engineered for zero runout lateral translation.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="bridgeplate,mountingplate,carriageplate,standoffplate">
                      <td class="bom-no">04</td>
                      <td class="bom-name">Machined 6061-T6 Bridge &amp; Base Plates</td>
                      <td>0.25" 6061-T6 Aluminum</td>
                      <td>Ties suspension module to chassis perimeter, distributing shear loads evenly.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="gearbox,gearboxplate,bearing,xroll,m3508">
                      <td class="bom-no">05</td>
                      <td class="bom-name">Planetary Gearbox Housing &amp; Interface</td>
                      <td>Xroll Planetary &bull; Dual Radial Bearings</td>
                      <td>Direct-coupled planetary reduction transferring M3508 motor torque into wheel.</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 2. 2026 HERO MK1 ASSEMBLY & TURRET BASE EI TENSIONER
      // ======================================================================
      case 'hero':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-sheet-inner-frame">
                  ${zoneSvg}
                  <div class="sheet-corner-tag">ZONE C-1 &bull; 3D TURRET BASE CAD ASSEMBLY</div>
                  <div class="sheet-corner-hint">NOTE: DRAG TO ORBIT &bull; SCROLL TO ZOOM</div>
                  
                  <canvas id="inspectionCanvas3D"></canvas>
                  
                  ${this.getCadTitleBlock(
                    'Hero Mk1 Turret Base EI Tensioner',
                    'UNIV OF WASH &bull; ADVANCED ROBOTICS &bull; ARUW 2026',
                    'A',
                    '1:1',
                    '1. CRITICAL YAW BEARING FIT TOLERANCES.<br>2. FINISH: MATTE BLACK ANODIZE &bull; 7075-T6.<br>3. HOVER BOM ROWS TO HIGHLIGHT PARTS.'
                  )}
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="eng-report-header">
                  <div class="eng-header-org">UNIVERSITY OF WASHINGTON &bull; ADVANCED ROBOTICS (ARUW)</div>
                  <div class="eng-header-sub">DEPARTMENT OF MECHANICAL ENGINEERING &bull; SUBSYSTEM DESIGN REPORT</div>
                  <div class="eng-header-rule"></div>
                  <div class="eng-doc-info-row">
                    <span><strong>DOC ID:</strong> ARUW-2026-HERO-01</span>
                    <span><strong>REV:</strong> A</span>
                    <span><strong>LEAD:</strong> Gavin Higgins (Hero Robot Lead)</span>
                  </div>
                  <h1 class="eng-report-title">2026 Hero Mk1 Assembly &amp; Turret Base EI Tensioner</h1>
                </header>

                <div class="eng-sec-heading">1.0 Subsystem Design &amp; Performance Specifications</div>
                <table class="eng-param-table">
                  <tr>
                    <td class="param-lbl">Continuous Yaw Backlash</td>
                    <td class="param-val">&plusmn;0.012&deg; (Zero Backlash)</td>
                    <td class="param-lbl">Mass Reduction</td>
                    <td class="param-val">-28% Total Assembly Weight</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Bearing Architecture</td>
                    <td class="param-val">Duplex Angular Contact (3.5" ID)</td>
                    <td class="param-lbl">Belt Tensioning</td>
                    <td class="param-val">Captive EI Sliding Nut Plate</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Competition Result</td>
                    <td class="param-val">3rd Place International</td>
                    <td class="param-lbl">Optimization Tool</td>
                    <td class="param-val">nTop Generative Design + FEA</td>
                  </tr>
                </table>

                <div class="eng-sec-heading">2.0 Low-Backlash Yaw Architecture &amp; EI Preload</div>
                <p class="eng-doc-p">
                  Engineered a zero-backlash continuous yaw mechanism for the ARUW competition Hero robot. Replaced failure-prone cantilevered pulley mountings with preloaded duplex angular-contact thin-section bearings, eliminating axis tilt and off-axis deflection during projectile recoil impulses.
                </p>
                <p class="eng-doc-p">
                  Introduced an innovative field-serviceable sliding belt tensioner (Turret Base EI Tensioner) that enables rapid timing belt tension calibration directly from the top plate without requiring turret disassembly in the pits. Designed sandwich structural plates utilizing nTop generative topology optimization, cutting overall assembly weight by 28% while improving torsional impact resistance.
                </p>

                <div class="eng-sec-heading">3.0 Bill of Materials &amp; Subsystem Breakdown</div>
                <div class="eng-bom-hint">HOVER ANY ROW TO HIGHLIGHT ON DRAWING &rarr;</div>
                <table class="eng-bom-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">ITEM</th>
                      <th style="width: 32%;">COMPONENT NAME</th>
                      <th style="width: 28%;">MATERIAL / SPEC</th>
                      <th style="width: 32%;">FUNCTION / SUBSYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="doc-part-card" data-part="bearing,35inid40inodbearing,innerbearingplate0">
                      <td class="bom-no">01</td>
                      <td class="bom-name">Thin-Section Duplex Angular Bearing</td>
                      <td>3.5" ID x 4.0" OD &bull; DB Preload</td>
                      <td>Provides extreme radial &amp; moment stiffness for continuous zero-backlash yaw.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="nutplate,spacerplate,bottomplate,topplate,tensioner">
                      <td class="bom-no">02</td>
                      <td class="bom-name">EI Sliding Belt Tensioner &amp; Nut Plate</td>
                      <td>Slotted 7075-T6 &bull; Captive EI Hardware</td>
                      <td>Enables fast top-accessible belt tensioning without full turret teardown.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="pulley,belt,hub2,configurablehtdbelt">
                      <td class="bom-no">03</td>
                      <td class="bom-name">HTD-3M Timing Belt &amp; Precision Pulleys</td>
                      <td>Curvilinear 3M Pitch &bull; 7075-T6 Hub</td>
                      <td>Delivers zero-slip torque transmission between motor and continuous yaw ring.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="sandwhichplate,supporttube,verticalsupport,attachment">
                      <td class="bom-no">04</td>
                      <td class="bom-name">Sandwich Structural Plates &amp; Standoffs</td>
                      <td>CNC 6061-T6 &bull; Pocketed Webbing</td>
                      <td>Clamps bearing outer race and isolates pitch motor reaction torque.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="m3508,motor,rm3508">
                      <td class="bom-no">05</td>
                      <td class="bom-name">RoboMaster M3508 Yaw Drive Motor</td>
                      <td>Brushless DC &bull; 19:1 Planetary</td>
                      <td>High-torque yaw motor driving high-speed targeting slews.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="encoder,holder,cover,alignment">
                      <td class="bom-no">06</td>
                      <td class="bom-name">Absolute Optical Encoder &amp; Mount</td>
                      <td>17-Bit Optical &bull; Precise Flange</td>
                      <td>Direct closed-loop yaw feedback for automated computer vision lock.</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 3. TURRET PITCH GIMBAL & BEARING HOUSING (BLANK 1)
      // ======================================================================
      case 'blank1':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-sheet-inner-frame">
                  ${zoneSvg}
                  <div class="sheet-corner-tag">ZONE B-3 &bull; 2D ORTHOGRAPHIC SCHEMATIC</div>
                  <div class="sheet-corner-hint">NOTE: HOVER BOM ROWS TO HIGHLIGHT VECTOR SCHEMATIC</div>

                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />
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

                    <!-- Callouts -->
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

                  ${this.getCadTitleBlock(
                    'Turret Pitch Gimbal & Bearing Housing',
                    'ARUW 2027 &bull; 2-DoF PRECISION POINTING',
                    'B',
                    '1:1',
                    '1. PRECISION TRUNNION BORE TOLERANCE H7.<br>2. MATERIAL: 7075-T6 ALUMINUM + TITANIUM.<br>3. HOVER BOM ROWS TO HIGHLIGHT PARTS.'
                  )}
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="eng-report-header">
                  <div class="eng-header-org">UNIVERSITY OF WASHINGTON &bull; ADVANCED ROBOTICS (ARUW)</div>
                  <div class="eng-header-sub">DEPARTMENT OF MECHANICAL ENGINEERING &bull; SUBSYSTEM DESIGN REPORT</div>
                  <div class="eng-header-rule"></div>
                  <div class="eng-doc-info-row">
                    <span><strong>DOC ID:</strong> ARUW-2027-GIMB-01</span>
                    <span><strong>REV:</strong> B</span>
                    <span><strong>ENGINEER:</strong> Gavin Higgins</span>
                  </div>
                  <h1 class="eng-report-title">Turret Pitch Gimbal &amp; Bearing Housing</h1>
                </header>

                <div class="eng-sec-heading">1.0 Subsystem Design &amp; Performance Specifications</div>
                <table class="eng-param-table">
                  <tr>
                    <td class="param-lbl">Pitch Travel Range</td>
                    <td class="param-val">-25&deg; to +40&deg; Elevation</td>
                    <td class="param-lbl">Drive Backlash</td>
                    <td class="param-val">&lt; 0.008&deg; (Harmonic)</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Targeting Precision</td>
                    <td class="param-val">Sub-Milliradian Optical Lock</td>
                    <td class="param-lbl">Drive Topology</td>
                    <td class="param-val">50:1 Harmonic Reduction</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Structural Materials</td>
                    <td class="param-val">7075-T6 + Titanium Hardware</td>
                    <td class="param-lbl">Sensor Feedback</td>
                    <td class="param-val">17-Bit SSI Optical Encoder</td>
                  </tr>
                </table>

                <div class="eng-sec-heading">2.0 High-Precision Gimbal Architecture</div>
                <p class="eng-doc-p">
                  Engineered the 2027 pitch axis mounting incorporating preloaded duplex angular-contact thin-section bearings, eliminating axis deflection under high projectile recoil loads during continuous fire sequences.
                </p>
                <p class="eng-doc-p">
                  Integrated closed-loop absolute optical encoder feedback directly on the trunnion shaft to guarantee sub-milliradian pointing precision for automatic computer vision target tracking. Conducted topology optimization in nTop and SolidWorks Simulation to minimize inertia, cutting mass by 22%.
                </p>

                <div class="eng-sec-heading">3.0 Bill of Materials &amp; Subsystem Breakdown</div>
                <div class="eng-bom-hint">HOVER ANY ROW TO HIGHLIGHT ON DRAWING &rarr;</div>
                <table class="eng-bom-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">ITEM</th>
                      <th style="width: 32%;">COMPONENT NAME</th>
                      <th style="width: 28%;">MATERIAL / SPEC</th>
                      <th style="width: 32%;">FUNCTION / SUBSYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="doc-part-card" data-part="pitch-yoke">
                      <td class="bom-no">01</td>
                      <td class="bom-name">7075-T6 CNC Machined Gimbal Yoke</td>
                      <td>Monolithic 7075-T6 &bull; Hard Anodized</td>
                      <td>Lightweight trunnion frame holding launcher barrel and flywheel module.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="harmonic-drive">
                      <td class="bom-no">02</td>
                      <td class="bom-name">Direct Harmonic Drive Reduction 50:1</td>
                      <td>50:1 Reduction &bull; Zero Backlash</td>
                      <td>Delivers zero-backlash holding torque directly on the pitch trunnion axis.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="bearing-duplex">
                      <td class="bom-no">03</td>
                      <td class="bom-name">Preloaded Duplex Angular Bearings</td>
                      <td>Matched Bearing Pair &bull; DB Preload</td>
                      <td>Resists high multi-axis recoil impulses without trunnion shaft deflection.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="encoder-shaft">
                      <td class="bom-no">04</td>
                      <td class="bom-name">Absolute Optical Encoder &amp; Shaft</td>
                      <td>17-Bit SSI Protocol &bull; Stainless Shaft</td>
                      <td>Provides absolute closed-loop angular feedback with sub-milliradian accuracy.</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 4. CHASSIS 4-BAR INDEPENDENT SUSPENSION (BLANK 2)
      // ======================================================================
      case 'blank2':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-sheet-inner-frame">
                  ${zoneSvg}
                  <div class="sheet-corner-tag">ZONE A-4 &bull; 2D KINEMATIC SCHEMATIC</div>
                  <div class="sheet-corner-hint">NOTE: HOVER BOM ROWS TO HIGHLIGHT VECTOR SCHEMATIC</div>

                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />
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

                  ${this.getCadTitleBlock(
                    'Chassis 4-Bar Independent Suspension',
                    'ARUW 2026 &bull; FOUR-BAR LINKAGE',
                    'C',
                    '1:2',
                    '1. SPHERICAL PIVOT BEARINGS SELF-LUBRICATING.<br>2. MATERIAL: 6061-T6 + CARBON FIBER.<br>3. HOVER BOM ROWS TO HIGHLIGHT PARTS.'
                  )}
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="eng-report-header">
                  <div class="eng-header-org">UNIVERSITY OF WASHINGTON &bull; ADVANCED ROBOTICS (ARUW)</div>
                  <div class="eng-header-sub">DEPARTMENT OF MECHANICAL ENGINEERING &bull; SUBSYSTEM DESIGN REPORT</div>
                  <div class="eng-header-rule"></div>
                  <div class="eng-doc-info-row">
                    <span><strong>DOC ID:</strong> ARUW-2026-SUSP-04</span>
                    <span><strong>REV:</strong> C</span>
                    <span><strong>ENGINEER:</strong> Gavin Higgins</span>
                  </div>
                  <h1 class="eng-report-title">Chassis 4-Bar Independent Suspension</h1>
                </header>

                <div class="eng-sec-heading">1.0 Subsystem Design &amp; Performance Specifications</div>
                <table class="eng-param-table">
                  <tr>
                    <td class="param-lbl">Wheel Travel</td>
                    <td class="param-val">42 mm Stroke Deflection</td>
                    <td class="param-lbl">Dampening Unit</td>
                    <td class="param-val">Oil-Damped Monoshock</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Camber Variation</td>
                    <td class="param-val">0.00&deg; Constant Parallel</td>
                    <td class="param-lbl">Impact Rating</td>
                    <td class="param-val">4.5g Shock Survivability</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Structural Materials</td>
                    <td class="param-val">0.125" CF + 6061-T6</td>
                    <td class="param-lbl">Bushing Type</td>
                    <td class="param-val">Maintenance-Free PTFE</td>
                  </tr>
                </table>

                <div class="eng-sec-heading">2.0 Four-Bar Kinematics &amp; Constant Camber</div>
                <p class="eng-doc-p">
                  Synthesized a parallel four-bar linkage geometry that maintains upright wheel ground contact across the entire 42mm suspension stroke, eliminating tire scrub and steering scrub radius shifts during high-speed omnidirectional maneuvers.
                </p>
                <p class="eng-doc-p">
                  FEA drop simulations validated under 4.5g shock loads on competition obstacle ramps. Hard-anodized standoffs and PTFE pivot bushings ensure lifetime serviceability without lubrication breakdown under abrasive field dust.
                </p>

                <div class="eng-sec-heading">3.0 Bill of Materials &amp; Subsystem Breakdown</div>
                <div class="eng-bom-hint">HOVER ANY ROW TO HIGHLIGHT ON DRAWING &rarr;</div>
                <table class="eng-bom-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">ITEM</th>
                      <th style="width: 32%;">COMPONENT NAME</th>
                      <th style="width: 28%;">MATERIAL / SPEC</th>
                      <th style="width: 32%;">FUNCTION / SUBSYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="doc-part-card" data-part="upper-link">
                      <td class="bom-no">01</td>
                      <td class="bom-name">6061-T6 Upper Control A-Arm</td>
                      <td>Machined 6061-T6 &bull; Dual Pivot Bores</td>
                      <td>Controls wheel assembly camber angle throughout the full vertical travel envelope.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="lower-link">
                      <td class="bom-no">02</td>
                      <td class="bom-name">Lower Link Rod &amp; Spherical Bushings</td>
                      <td>Tensile Aluminum &bull; PTFE Bushings</td>
                      <td>Absorbs braking forces and transmits road irregularities into the damper.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="shock-absorber">
                      <td class="bom-no">03</td>
                      <td class="bom-name">Oil-Damped Monoshock Coilover</td>
                      <td>Adjustable Preload &bull; Progressive Spring</td>
                      <td>Provides smooth, controlled energy dissipation over high obstacles.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="upright-knuckle">
                      <td class="bom-no">04</td>
                      <td class="bom-name">Wheel Hub Upright Knuckle Carrier</td>
                      <td>7075-T6 Knuckle &bull; Sealed Bearings</td>
                      <td>Rigidly couples the omni drive wheel to the suspension links with zero play.</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 5. HIGH-THROUGHPUT DART FEEDER (DARTFEEDER)
      // ======================================================================
      case 'dartfeeder':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-sheet-inner-frame">
                  ${zoneSvg}
                  <div class="sheet-corner-tag">ZONE C-2 &bull; 2D FEED SCHEMATIC</div>
                  <div class="sheet-corner-hint">NOTE: HOVER BOM ROWS TO HIGHLIGHT VECTOR SCHEMATIC</div>

                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />

                    <!-- Part 1: Polycarbonate Hopper Funnel -->
                    <polygon class="cad-svg-part" data-part="hopper-funnel" points="160,80 600,80 460,260 300,260" fill="#e0f2fe" stroke="#1e293b" stroke-width="2.2" opacity="0.8" />
                    
                    <!-- Part 2: Cycloidal Starwheel Agitator -->
                    <g class="cad-svg-part" data-part="cycloidal-star">
                      <circle cx="380" cy="310" r="75" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.4" />
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

                  ${this.getCadTitleBlock(
                    'High-Throughput Dart Feeder & Agitator',
                    'ARUW 2026 &bull; ZERO-JAM INDEXER',
                    'A',
                    '1:1',
                    '1. CRITICAL TOOTH CLEARANCE 0.25MM.<br>2. MATERIAL: CNC DELRIN 150 + POLYCARBONATE.<br>3. HOVER BOM ROWS TO HIGHLIGHT PARTS.'
                  )}
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="eng-report-header">
                  <div class="eng-header-org">UNIVERSITY OF WASHINGTON &bull; ADVANCED ROBOTICS (ARUW)</div>
                  <div class="eng-header-sub">DEPARTMENT OF MECHANICAL ENGINEERING &bull; SUBSYSTEM DESIGN REPORT</div>
                  <div class="eng-header-rule"></div>
                  <div class="eng-doc-info-row">
                    <span><strong>DOC ID:</strong> ARUW-2026-FEED-02</span>
                    <span><strong>REV:</strong> A</span>
                    <span><strong>ENGINEER:</strong> Gavin Higgins</span>
                  </div>
                  <h1 class="eng-report-title">High-Throughput Dart Feeder &amp; Cycloidal Agitator</h1>
                </header>

                <div class="eng-sec-heading">1.0 Subsystem Design &amp; Performance Specifications</div>
                <table class="eng-param-table">
                  <tr>
                    <td class="param-lbl">Sustained Feed Rate</td>
                    <td class="param-val">30 Rounds / Second</td>
                    <td class="param-lbl">Jam Rate</td>
                    <td class="param-val">0.00% Zero-Jam In Field</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Agitator Profile</td>
                    <td class="param-val">4-Pocket Continuous Cycloidal</td>
                    <td class="param-lbl">Test Endurance</td>
                    <td class="param-val">15,000+ Cycles Passed</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Agitator Material</td>
                    <td class="param-val">Delrin 150 (Low Friction)</td>
                    <td class="param-lbl">Sensor Feedback</td>
                    <td class="param-val">&lt;1ms IR Beam Break</td>
                  </tr>
                </table>

                <div class="eng-sec-heading">2.0 Anti-Jam Hopper Indexing Architecture</div>
                <p class="eng-doc-p">
                  Designed a custom cycloidal starwheel agitator that actively separates compressed foam projectiles in the bulk hopper, channeling individual rounds into the launch barrel at 30 rounds/second without double-feeding or pinching.
                </p>
                <p class="eng-doc-p">
                  CNC-machined Delrin 150 starwheels dramatically minimize frictional heat against polyurethane dart bodies, achieving 15,000+ continuous test cycles without mechanical wear or projectile jamming.
                </p>

                <div class="eng-sec-heading">3.0 Bill of Materials &amp; Subsystem Breakdown</div>
                <div class="eng-bom-hint">HOVER ANY ROW TO HIGHLIGHT ON DRAWING &rarr;</div>
                <table class="eng-bom-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">ITEM</th>
                      <th style="width: 32%;">COMPONENT NAME</th>
                      <th style="width: 28%;">MATERIAL / SPEC</th>
                      <th style="width: 32%;">FUNCTION / SUBSYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="doc-part-card" data-part="cycloidal-star">
                      <td class="bom-no">01</td>
                      <td class="bom-name">CNC Delrin 150 Cycloidal Starwheel</td>
                      <td>Machined Delrin 150 &bull; 4-Pocket Cycloid</td>
                      <td>Gently indexes soft polyurethane darts without crushing or jamming.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="hopper-funnel">
                      <td class="bom-no">02</td>
                      <td class="bom-name">Polycarbonate Feed Hopper Funnel</td>
                      <td>Polycarbonate &bull; Polished Slope</td>
                      <td>Directs projectiles smoothly into agitator pockets using gravity assist.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="indexing-pinion">
                      <td class="bom-no">03</td>
                      <td class="bom-name">Hardened Steel Indexing Pinion Gear</td>
                      <td>4140 Steel &bull; Mod 0.8 Keyed Interface</td>
                      <td>Transmits brushless motor torque into starwheel without tooth stripping.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="barrel-gate">
                      <td class="bom-no">04</td>
                      <td class="bom-name">Barrel Feed Escapement &amp; Sensor</td>
                      <td>Infrared Beam Break &bull; CNC Aluminum Gate</td>
                      <td>Detects dart position before flywheel insertion to ensure zero dry-firing.</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>
          </div>
        `;

      // ======================================================================
      // 6. EI TENSIONER & BELT DRIVE (TENSIONER)
      // ======================================================================
      case 'tensioner':
        return `
          <div class="inspection-split-layout">
            <div class="inspection-left-pane">
              <div class="inspection-drawing-board">
                <div class="inspection-sheet-inner-frame">
                  ${zoneSvg}
                  <div class="sheet-corner-tag">ZONE B-1 &bull; 2D DRIVE SCHEMATIC</div>
                  <div class="sheet-corner-hint">NOTE: HOVER BOM ROWS TO HIGHLIGHT VECTOR SCHEMATIC</div>

                  <svg class="inspection-svg-canvas" viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="20" width="720" height="500" fill="#fcfcf9" stroke="#d4d4ce" stroke-width="1.5" />

                    <!-- Part 1: Slotted Mounting Slide Plate -->
                    <g class="cad-svg-part" data-part="slide-plate">
                      <rect x="180" y="160" width="400" height="220" rx="8" fill="#f1f5f9" stroke="#1e293b" stroke-width="2.2" />
                      <rect x="230" y="240" width="160" height="40" rx="20" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                    </g>

                    <!-- Part 2: Dual Eccentric Cam Preload Adjuster -->
                    <g class="cad-svg-part" data-part="eccentric-cam">
                      <circle cx="340" cy="260" r="45" fill="#e2e8f0" stroke="#1e293b" stroke-width="2.2" />
                      <circle cx="355" cy="260" r="22" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
                      <polygon points="355,252 362,256 362,264 355,268 348,264 348,256" fill="#94a3b8" stroke="#1e293b" stroke-width="1.2" />
                    </g>

                    <!-- Part 3: Double-Flanged Idler Pulley -->
                    <g class="cad-svg-part" data-part="idler-pulley">
                      <rect x="440" y="210" width="55" height="100" rx="4" fill="#cbd5e1" stroke="#1e293b" stroke-width="2.2" />
                      <line x1="435" y1="210" x2="500" y2="210" stroke="#1e293b" stroke-width="3" />
                      <line x1="435" y1="310" x2="500" y2="310" stroke="#1e293b" stroke-width="3" />
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

                  ${this.getCadTitleBlock(
                    'EI Tensioner & Belt Drive Assembly',
                    'ARUW 2026 &bull; BELT PRELOAD MECHANISM',
                    'B',
                    '1:1',
                    '1. PRELOAD ACCURACY &plusmn;0.05MM OFFSET.<br>2. MATERIAL: 7075-T6 + GRADE 10.9 HARDWARE.<br>3. HOVER BOM ROWS TO HIGHLIGHT PARTS.'
                  )}
                </div>
              </div>
            </div>

            <div class="inspection-right-pane">
              <article class="inspection-paper-sheet">
                <header class="eng-report-header">
                  <div class="eng-header-org">UNIVERSITY OF WASHINGTON &bull; ADVANCED ROBOTICS (ARUW)</div>
                  <div class="eng-header-sub">DEPARTMENT OF MECHANICAL ENGINEERING &bull; SUBSYSTEM DESIGN REPORT</div>
                  <div class="eng-header-rule"></div>
                  <div class="eng-doc-info-row">
                    <span><strong>DOC ID:</strong> ARUW-2026-TENS-03</span>
                    <span><strong>REV:</strong> B</span>
                    <span><strong>ENGINEER:</strong> Gavin Higgins</span>
                  </div>
                  <h1 class="eng-report-title">EI Tensioner &amp; Belt Drive Assembly</h1>
                </header>

                <div class="eng-sec-heading">1.0 Subsystem Design &amp; Performance Specifications</div>
                <table class="eng-param-table">
                  <tr>
                    <td class="param-lbl">Compound Drive Ratio</td>
                    <td class="param-val">4.2:1 Reduction</td>
                    <td class="param-lbl">Belt Standard</td>
                    <td class="param-val">HTD-3M Curvilinear</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Preload Mechanism</td>
                    <td class="param-val">Dual Eccentric Cam (4mm Offset)</td>
                    <td class="param-lbl">Hardware Grade</td>
                    <td class="param-val">Grade 10.9 High-Tensile</td>
                  </tr>
                  <tr>
                    <td class="param-lbl">Mass Optimization</td>
                    <td class="param-val">-34% Pocketed FEA Structure</td>
                    <td class="param-lbl">Dynamic Behavior</td>
                    <td class="param-val">Zero Belt Tooth Skipping</td>
                  </tr>
                </table>

                <div class="eng-sec-heading">2.0 Continuous Belt Preload &amp; Zero Slip</div>
                <p class="eng-doc-p">
                  Designed an eccentric idler tensioner that maintains consistent tooth engagement during rapid reversals without belt tooth jumping, skipping, or backlash under violent deceleration impulses.
                </p>
                <p class="eng-doc-p">
                  Pocketed 7075-T6 aluminum mounting plates designed with FEA stress concentration relief, reducing weight by 34% while withstanding maximum belt pre-tensioning without plate deflection.
                </p>

                <div class="eng-sec-heading">3.0 Bill of Materials &amp; Subsystem Breakdown</div>
                <div class="eng-bom-hint">HOVER ANY ROW TO HIGHLIGHT ON DRAWING &rarr;</div>
                <table class="eng-bom-table">
                  <thead>
                    <tr>
                      <th style="width: 8%;">ITEM</th>
                      <th style="width: 32%;">COMPONENT NAME</th>
                      <th style="width: 28%;">MATERIAL / SPEC</th>
                      <th style="width: 32%;">FUNCTION / SUBSYSTEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="doc-part-card" data-part="eccentric-cam">
                      <td class="bom-no">01</td>
                      <td class="bom-name">Dual Eccentric Cam Preload Adjuster</td>
                      <td>Stainless Steel &bull; 4mm Continuous Offset</td>
                      <td>Rotates smoothly to take up belt slack without altering pulley alignment.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="idler-pulley">
                      <td class="bom-no">02</td>
                      <td class="bom-name">Double-Flanged HTD-3M Idler Pulley</td>
                      <td>6061-T6 &bull; Sealed Bearings &bull; HTD-3M</td>
                      <td>Guides the timing belt securely, preventing axial belt walking during reversals.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="slide-plate">
                      <td class="bom-no">03</td>
                      <td class="bom-name">7075-T6 Pocketed Tensioner Slide Plate</td>
                      <td>CNC 7075-T6 &bull; Hard Anodized</td>
                      <td>Structural mounting bracket featuring rigid guide slots for track adjustment.</td>
                    </tr>
                    <tr class="doc-part-card" data-part="locking-hardware">
                      <td class="bom-no">04</td>
                      <td class="bom-name">Grade 10.9 Locking Hardware &amp; Washers</td>
                      <td>Grade 10.9 &bull; Nord-Lock Washers</td>
                      <td>Locks tensioner position permanently during fierce battle shocks and vibration.</td>
                    </tr>
                  </tbody>
                </table>
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
