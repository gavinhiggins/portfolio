/* ==========================================================================
   APP.JS — Paper hover/click, fullscreen modals
   ========================================================================== */

class PortfolioApp {
  constructor() {
    this.modal = document.getElementById('modal');
    this.modalContent = document.getElementById('modalContent');
    this.modalClose = document.getElementById('modalClose');

    this.setupPaperClicks();
    this.setupModal();
  }

  setupPaperClicks() {
    // Drawing sheets — click to open modal
    document.querySelectorAll('.drawing-sheet').forEach(sheet => {
      sheet.addEventListener('click', () => {
        const key = sheet.dataset.drawing;
        this.openModal(key);
      });
    });

    // Resume — click to open modal
    const resume = document.getElementById('sheetResume');
    if (resume) {
      resume.addEventListener('click', () => {
        this.openModal('resume');
      });
    }
  }

  setupModal() {
    this.modalClose.addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  closeModal() {
    this.modal.classList.remove('open');
    this.modalContent.innerHTML = '';
  }

  openModal(key) {
    this.modalContent.innerHTML = this.getContent(key);
    this.modal.classList.add('open');
  }

  getContent(key) {
    const content = {
      resume: `
        <div class="modal-header">
          <h1>Gavin Higgins</h1>
          <p>B.S. Mechanical Engineering — University of Washington, Seattle &bull; 3.60 GPA</p>
        </div>
        <div class="modal-stats">
          <div><div class="modal-stat-label">Degree</div><div class="modal-stat-val">B.S. Mech Eng</div></div>
          <div><div class="modal-stat-label">GPA</div><div class="modal-stat-val">3.60 / 4.00</div></div>
          <div><div class="modal-stat-label">Current Role</div><div class="modal-stat-val">Hero Robot Lead</div></div>
          <div><div class="modal-stat-label">Graduation</div><div class="modal-stat-val">June 2029</div></div>
        </div>
        <div class="modal-cols">
          <div>
            <h3>Experience</h3>
            <p><strong>Hero Robot Lead</strong> — ARUW, Oct 2025–Present</p>
            <p>Engineered a low-backlash yaw mechanism using nTop generative design and Solidworks FEA. Robot placed 3rd internationally. Replaced faulty drive pulley with zero-backlash components and sliding belt tensioner, achieving 28% total weight reduction. Leading team of 5 for complete 2027 redevelopment.</p>
            <p><strong>Robot Lead</strong> — FRC Team, Aug 2022–May 2025</p>
            <p>Directed 10 rookie students to design and build a 125 lb competition robot in 6 weeks using in-house CNC manufacturing. Created the best-performing robot in the team's 15-year history with zero failures.</p>
          </div>
          <div>
            <h3>Projects &amp; Skills</h3>
            <p><strong>Omni Wheel Suspension Module:</strong> Dual MGN9H rails, 0.25" 6061 + 4mm CF. ANSYS validated for 560N lateral impact (4x improvement). MATLAB spring/damper optimization.</p>
            <p><strong>Wheel-Legged Balance Robot:</strong> ESP32 bipedal robot with PID control, progressing to LQR state-space control for jump recovery.</p>
            <p><strong>Skills:</strong> Solidworks, ANSYS FEA, Onshape, nTop, CNC Machining, Manual Mill/Lathe, MATLAB, ESP32/C++</p>
          </div>
        </div>
      `,

      suspension: `
        <div class="modal-header">
          <h1>Omni Wheel Suspension Module</h1>
          <p>ARUW 2027 Competition Platform &bull; DWG: ARUW-SUSP-01 REV B</p>
        </div>
        <div class="modal-stats">
          <div><div class="modal-stat-label">Lateral Impact</div><div class="modal-stat-val">560 N (4× 2026)</div></div>
          <div><div class="modal-stat-label">Drop Rating</div><div class="modal-stat-val">+200% Height</div></div>
          <div><div class="modal-stat-label">Guide System</div><div class="modal-stat-val">Dual MGN9H</div></div>
          <div><div class="modal-stat-label">Materials</div><div class="modal-stat-val">6061-T6 + CF</div></div>
        </div>
        <div class="modal-cols">
          <div>
            <h3>Engineering Challenge</h3>
            <p>The 2026 suspension module suffered from binding during high lateral shear events and structural cracking under rapid drop tests. For 2027, the architecture was completely reimagined using CNC-machined 0.25" 6061 aluminum plates paired with rigid 4mm carbon fiber composite plates.</p>
            <p>Dual high-load MGN9H linear rails eliminate all binding off-axis moments, while a tuned helical spring provides optimal energy absorption.</p>
          </div>
          <div>
            <h3>MATLAB &amp; FEA Optimization</h3>
            <p>A dedicated MATLAB simulation solved the non-linear mass-spring-damper response under impulse shock inputs. Spring constant k and viscous damping factor c were optimized against field obstacle geometries.</p>
            <p>ANSYS Mechanical validated a 2.4× yield safety factor under 560 N lateral shock loading — a 4× improvement over the 2026 season platform.</p>
          </div>
        </div>
      `,

      yaw: `
        <div class="modal-header">
          <h1>Hero Robot Yaw Drive Assembly</h1>
          <p>3rd Place International &bull; DWG: HERO-YAW-03 REV C</p>
        </div>
        <div class="modal-stats">
          <div><div class="modal-stat-label">Weight Saved</div><div class="modal-stat-val">-28% Total</div></div>
          <div><div class="modal-stat-label">Backlash</div><div class="modal-stat-val">±0.012°</div></div>
          <div><div class="modal-stat-label">Optimization</div><div class="modal-stat-val">nTop Generative</div></div>
          <div><div class="modal-stat-label">Result</div><div class="modal-stat-val">3rd Place Intl</div></div>
        </div>
        <div class="modal-cols">
          <div>
            <h3>Mechanism Innovation</h3>
            <p>The Hero robot's high-caliber launcher requires instantaneous targeting lock with zero mechanical hysteresis. Legacy gearboxes suffered from backlash slop that degraded long-range projectile grouping.</p>
            <p>The yaw drive was re-engineered using zero-backlash drive pulley mounting paired with a custom serviceable sliding belt tensioner that maintains uniform pre-tension under rapid reversal torques.</p>
          </div>
          <div>
            <h3>nTop Generative Design</h3>
            <p>Using nTop, a field-driven TPMS lattice infill was generated for the structural gimbal housing, validated via Solidworks FEA to withstand direct projectile impacts while cutting overall assembly mass by 28%.</p>
            <p>Currently leading a team of 5 engineers to rebuild the complete 2027 robot, optimizing modular electronics accessibility and shot trajectory consistency.</p>
          </div>
        </div>
      `,

      balance: `
        <div class="modal-header">
          <h1>Bipedal Wheel-Legged Balancing Robot</h1>
          <p>Personal Project &bull; ESP32 PID Control &bull; DWG: BAL-BOT-01 REV A</p>
        </div>
        <div class="modal-stats">
          <div><div class="modal-stat-label">Controller</div><div class="modal-stat-val">ESP32 240MHz</div></div>
          <div><div class="modal-stat-label">IMU</div><div class="modal-stat-val">MPU-6050</div></div>
          <div><div class="modal-stat-label">Status</div><div class="modal-stat-val">Balances In Place</div></div>
          <div><div class="modal-stat-label">Next</div><div class="modal-stat-val">LQR + Jump</div></div>
        </div>
        <div class="modal-cols">
          <div>
            <h3>Hardware</h3>
            <p>Custom bipedal wheel-legged robot using high-torque brushless hub motors with field-oriented control drivers, paired with lightweight carbon fiber articulated linkage legs.</p>
            <p>The ESP32 microcontroller executes balance loops at 500 Hz using complementary-filtered gyro and accelerometer feedback.</p>
          </div>
          <div>
            <h3>Control Theory Roadmap</h3>
            <p>Currently balances using dual cascaded PID loops (pitch stabilization inner loop + velocity position outer loop).</p>
            <p>Formulating a full 4th-order state-space model to implement Linear Quadratic Regulator (LQR) optimal control, enabling dynamic leg retraction during jumps and automated fall recovery.</p>
          </div>
        </div>
      `,

      frc: `
        <div class="modal-header">
          <h1>125 lb FRC Competition Robot</h1>
          <p>FRC Team, Scottsdale AZ &bull; DWG: FRC-COMP-01</p>
        </div>
        <div class="modal-stats">
          <div><div class="modal-stat-label">Weight</div><div class="modal-stat-val">125 lb</div></div>
          <div><div class="modal-stat-label">Team</div><div class="modal-stat-val">10 Rookies</div></div>
          <div><div class="modal-stat-label">Build Time</div><div class="modal-stat-val">6 Weeks</div></div>
          <div><div class="modal-stat-label">Record</div><div class="modal-stat-val">Best in 15 Years</div></div>
        </div>
        <div class="modal-cols">
          <div>
            <h3>Leadership</h3>
            <p>Inherited a team with recurring electrical faults and gearbox failures. Restructured the engineering workflow, trained 10 rookie team members in CAD modeling, wiring harness best practices, and precision machining on manual knee mills and lathes.</p>
          </div>
          <div>
            <h3>Technical Architecture</h3>
            <p>Engineered an articulated 4-bar linkage intake and scoring mechanism from in-house CNC-machined 6061 box tubing and polycarbonate.</p>
            <p>The robot competed with zero electrical or mechanical failures throughout the entire season, breaking all previous team records.</p>
          </div>
        </div>
      `
    };

    return content[key] || '';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PortfolioApp();
});
