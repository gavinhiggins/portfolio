/* ==========================================================================
   GAVIN HIGGINS — APPLICATION CONTROLLER
   Fullscreen Lightbox Modal, Inspection & Paper Transitions
   ========================================================================== */

class AppController {
  constructor() {
    this.modal = document.getElementById('modal');
    this.modalContainer = document.getElementById('modalContainer');
    this.modalClose = document.getElementById('modalClose');

    this.initEvents();
  }

  initEvents() {
    // Click on Drawing Sheets and Folder Projects to inspect fullscreen
    const sheets = document.querySelectorAll('.paper-item, .folder-paper-item');
    sheets.forEach(sheet => {
      sheet.addEventListener('click', (e) => {
        const id = sheet.dataset.id;
        if (id) {
          this.openModal(id);
        }
      });
    });

    // Click on Post-It note
    const postIt = document.getElementById('postIt');
    if (postIt) {
      postIt.addEventListener('click', () => {
        this.openModal('postit');
      });
    }

    // Modal close controls
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
    this.modalContainer.innerHTML = '';
  }

  openModal(id) {
    if (!this.modal || !this.modalContainer) return;
    this.modalContainer.innerHTML = this.getModalContent(id);
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');

    // If opening resume, render full high-res PDF into modal
    if (id === 'resume' && typeof pdfjsLib !== 'undefined') {
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
  }

  getModalContent(id) {
    switch (id) {
      case 'suspension':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <div style="border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 3px; font-weight: 700;">DWG: ARUW-2027-SUSP-01 &bull; REV B</span>
                <h1 style="font-size: 1.7rem; font-weight: 800; margin-top: 6px;">2027, Linear Suspension V3, Assembly</h1>
                <p style="font-size: 0.95rem; color: #555;">Advanced Robotics at the University of Washington (ARUW) &bull; 2027 Season</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f4f4f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #d4d4ce;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">LATERAL IMPACT</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">560 N (4x 2026 Season)</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">DROP TEST RATING</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">+200% Higher Drop</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">MOTION SYSTEM</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Dual MGN9H Rails</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">MATERIAL SPEC</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">0.25" 6061-T6 + 4mm CF</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; line-height: 1.6; font-size: 0.92rem; color: #333;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">ENGINEERING RE-DESIGN</h3>
                <p>Designed a suspension and drive module for use on two ARUW 2027 robots. Sturdy construction of 0.25" 6061-T6 aluminum and 4mm carbon fiber plates, combined with dual MGN9H linear rails for motion, directly correcting faults of the previous year's defective modules.</p>
                <p>Eliminated off-axis carriage binding during rapid field obstacle transitions, providing smooth dampening and rigid tracking for the computer vision turret.</p>
              </div>

              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">FEA &amp; MATLAB OPTIMIZATION</h3>
                <p>Validated structure via ANSYS FEA, confirming it handles drops from 200% higher and lateral impacts of 560 N (4x more than 2026).</p>
                <p>Wrote a dedicated MATLAB script to optimize spring and damper constants with drop test and bumpy surface stability constraints, to ensure the core robot CV targeting and firing system remains precise throughout unpredictable field obstacles.</p>
              </div>
            </div>
          </div>
        `;

      case 'hero':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <div style="border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 3px; font-weight: 700;">HERO ROBOT LEAD &bull; ARUW 2026-2027</span>
                <h1 style="font-size: 1.7rem; font-weight: 800; margin-top: 6px;">2026 Hero Mk1 Assembly &amp; Turret Base EI Tensioner</h1>
                <p style="font-size: 0.95rem; color: #555;">Advanced Robotics at the University of Washington &bull; 3rd Place International Finish</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f4f4f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #d4d4ce;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">BACKLASH</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">&plusmn;0.012&deg; (Zero Backlash)</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">WEIGHT SAVINGS</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">-28% Total Weight</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">OPTIMIZATION</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">nTop Generative Lattice</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">COMPETITION</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">3rd Place International</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; line-height: 1.6; font-size: 0.92rem; color: #333;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">YAW MECHANISM &amp; EI TENSIONER</h3>
                <p>Engineered a low-backlash yaw mechanism for the 'Hero' robot. Used nTop generative design and Solidworks FEA to increase impact resistance and overall stiffness. The robot placed 3rd in international competition.</p>
                <p>Replaced faulty drive pulley mounting with zero backlash components. Introduced a serviceable sliding belt tensioner (Turret Base EI Tensioner) to ensure ease of control throughout the robot's lifetime, reducing total robot weight by 28%.</p>
              </div>

              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">2027 REDEVELOPMENT TEAM LEAD</h3>
                <p>Currently leading a team of 5 engineers to fully redevelop the robot for the 2027 season, aiming to reduce weight, increase electronics accessibility, increase shot accuracy, and place 1st in competition.</p>
                <p>On the drawing sheet, the left half features an interactive exploded view of the Turret Base EI Tensioner revealing its stacked bearing and belt architecture on hover, paired with a full assembly beauty shot on the right.</p>
              </div>
            </div>
          </div>
        `;

      case 'blank1':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <div style="border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 3px; font-weight: 700;">DWG: ARUW-2027-GIMB-01 &bull; REV B</span>
                <h1 style="font-size: 1.7rem; font-weight: 800; margin-top: 6px;">Turret Pitch Gimbal &amp; Bearing Housing</h1>
                <p style="font-size: 0.95rem; color: #555;">Subsystem A &bull; 2-DoF Precision Drive &bull; Advanced Robotics at UW</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f4f4f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #d4d4ce;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">PITCH RANGE</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">-25&deg; to +40&deg;</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">BACKLASH</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">&lt; 0.008&deg; (Harmonic)</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">DRIVE TYPE</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Direct Harmonic Drive</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">MATERIAL</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">7075-T6 + Ti Hardware</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; line-height: 1.6; font-size: 0.92rem; color: #333;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">HIGH ACCURACY GIMBAL ARCHITECTURE</h3>
                <p>Engineered the 2027 pitch axis mounting incorporating preloaded duplex angular-contact thin-section bearings, eliminating axis deflection under high projectile recoil loads.</p>
                <p>Integrated closed-loop absolute optical encoder feedback directly on the trunnion shaft to guarantee sub-milliradian pointing precision for automatic computer vision tracking.</p>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">STRUCTURAL FEA &amp; MASS BUDGET</h3>
                <p>Conducted topology optimization in nTop and SolidWorks Simulation to minimize inertia while maintaining rigidity, reducing pitch assembly mass by 22% compared to previous iterations.</p>
              </div>
            </div>
          </div>
        `;

      case 'blank2':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <div style="border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 3px; font-weight: 700;">DWG: ARUW-2026-SUSP-04 &bull; REV C</span>
                <h1 style="font-size: 1.7rem; font-weight: 800; margin-top: 6px;">Chassis 4-Bar Independent Suspension</h1>
                <p style="font-size: 0.95rem; color: #555;">Subsystem B &bull; High-Speed Obstacle Dampening &bull; Advanced Robotics at UW</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f4f4f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #d4d4ce;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">WHEEL TRAVEL</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">42 mm Progressive</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">DAMPENING</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Oil-Damped Monoshock</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">CHASSIS TRACKING</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Zero Camber Shift</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">MATERIAL</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">0.125" Carbon Fiber + 6061</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; line-height: 1.6; font-size: 0.92rem; color: #333;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">FOUR-BAR KINEMATICS</h3>
                <p>Synthesized a four-bar linkage geometry that maintains upright wheel ground contact across the full suspension stroke, preventing scrub during rapid omnidirectional drive maneuvers.</p>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">IMPACT SURVIVABILITY</h3>
                <p>FEA drop simulations validated under 4.5g shock loads on field obstacle ramps. Hard-anodized standoffs and PTFE pivot bushings ensure lifetime serviceability.</p>
              </div>
            </div>
          </div>
        `;

      case 'dartfeeder':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <div style="border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #fef2f2; color: #b91c1c; padding: 2px 8px; border-radius: 3px; font-weight: 700;">DWG: ARUW-2026-FEED-02 &bull; REV A</span>
                <h1 style="font-size: 1.7rem; font-weight: 800; margin-top: 6px;">High-Throughput Dart Feeder &amp; Cycloidal Agitator</h1>
                <p style="font-size: 0.95rem; color: #555;">Subsystem C &bull; Zero-Jam Indexing Mechanism &bull; Advanced Robotics at UW</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f4f4f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #d4d4ce;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">FEED RATE</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">30 rounds / sec</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">JAM RATE</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">0.00% Zero-Jam</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">INDEXING</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Continuous Cycloidal</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">MATERIAL</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Delrin 150 + 6061 Alu</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; line-height: 1.6; font-size: 0.92rem; color: #333;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">ANTI-JAM HOPPER INDEXING</h3>
                <p>Designed a custom cycloidal starwheel agitator that actively separates compressed projectiles in the hopper, channeling individual rounds into the launch barrel without jamming.</p>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">RAPID CYCLE LIFE</h3>
                <p>CNC-machined Delrin starwheels minimize friction against polyurethane darts, delivering 15,000+ continuous test cycles without degradation.</p>
              </div>
            </div>
          </div>
        `;

      case 'tensioner':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <div style="border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 3px; font-weight: 700;">DWG: ARUW-2026-TENS-03 &bull; REV B</span>
                <h1 style="font-size: 1.7rem; font-weight: 800; margin-top: 6px;">EI Tensioner &amp; Belt Drive Assembly</h1>
                <p style="font-size: 0.95rem; color: #555;">Subsystem D &bull; Precision Belt Preload &bull; Advanced Robotics at UW</p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; background: #f4f4f0; padding: 16px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #d4d4ce;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">DRIVE RATIO</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">4.2:1 Compound</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">PRELOAD ADJUST</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">Dual Eccentric Cam</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">BELT SPEC</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">HTD-3M Pitch</div>
              </div>
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #666; text-transform: uppercase;">MATERIAL</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #111;">7075-T6 + Carbon Fiber</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; line-height: 1.6; font-size: 0.92rem; color: #333;">
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">CONTINUOUS BELT TENSIONING</h3>
                <p>Designed an eccentric idler tensioner that maintains consistent tooth engagement during rapid reversals without skipping or backlash.</p>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px; border-left: 3px solid #222; padding-left: 10px;">FEA &amp; MASS REDUCTION</h3>
                <p>Pocketed 7075-T6 aluminum mounting plates with FEA stress concentration relief, reducing weight while supporting high shock loads.</p>
              </div>
            </div>
          </div>
        `;

      case 'resume':
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

      case 'postit':
        return `
          <div style="font-family: var(--font-sans); color: #1a1a1a;">
            <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 6px;">Gavin Higgins</h1>
            <p style="font-size: 1rem; color: #555; margin-bottom: 16px;">Mechanical &amp; Robotics Engineer &bull; UW Seattle (3.60 GPA)</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 6px; margin-bottom: 20px; line-height: 1.6;">
              <p><strong>Primary Focus:</strong> High-performance robotic mechanisms, generative design (nTop), precision kinematics, and rapid prototyping.</p>
              <p style="margin-top: 8px;"><strong>Current Roles:</strong> Hero Robot Lead at Advanced Robotics at the University of Washington (ARUW). Leading 5 engineers for the 2027 international season.</p>
            </div>

            <div style="display: flex; gap: 14px;">
              <a href="mailto:ghigg385@uw.edu" style="color: #0284c7; font-weight: 700; text-decoration: none;">✉ ghigg385@uw.edu</a>
              <a href="tel:602-471-8078" style="color: #0284c7; font-weight: 700; text-decoration: none;">☎ 602-471-8078</a>
              <a href="https://linkedin.com/in/gavin-higgins-640293334/" target="_blank" style="color: #0284c7; font-weight: 700; text-decoration: none;">🔗 LinkedIn Profile ↗</a>
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
