# Gavin Higgins — Skeuomorphic Engineering Portfolio

A tactile, mechanical-engineer-themed skeuomorphic portfolio website designed for **GitHub Pages**.

Styled to look like a mechanical engineer's workbench, complete with a self-healing cutting mat, stainless steel calipers, a Rotring mechanical pencil, a ceramic coffee mug, and engineering blueprints and resume papers scattered across the desk.

---

## ✨ Features

- **Skeuomorphic Workbench Environment**:
  - Authentic self-healing cutting mat with 10mm grid, degree guides, and millimeter edge rulers.
  - Switchable desk surfaces & lighting modes: **Self-Healing Cutting Mat**, **Dark Walnut Hardwood**, or **Nocturnal CAD Blueprint**.
  - Interactive desk props including a stainless steel digital caliper with dynamic LCD millimeter readout, a 0.5mm Rotring mechanical pencil, and a ceramic coffee mug with a table stain ring.

- **Big Canary Yellow Post-It Note**:
  - Realistic 3M yellow paper texture, curled peel corner, adhesive tape strip, and drop shadows.
  - Prominently showcases Gavin's name, role (**Hero Robot Lead** @ ARUW), UW Seattle affiliation, contact links (Email, Phone, LinkedIn), core skill badges, and active project checklist.

- **"Drawings Come to Life" on Hover**:
  - **Omni Wheel Suspension Module (Dual MGN9H)**: Real-time mass-spring-damper physics simulation where the coil spring dynamically compresses, linear guide blocks reciprocate, and omni barrel rollers spin with live 560 N impact force vectors!
  - **Hero Robot Low-Backlash Yaw Drive**: Active meshing gear train, sliding belt tensioner motion, rotating azimuth dial, and nTop generative lattice stress gradients (-28% weight reduction).
  - **Bipedal Wheel-Legged Balancing Robot**: Live 2D inverted pendulum physics engine running a PID balance loop; hover and nudge the robot to watch it dynamically stabilize on two wheels!
  - **125 lb FRC Competition Robot**: Articulated 4-bar linkage intake cycling through its kinematic motion envelope with drivetrain telemetry.

- **Click to Fullscreen Inspection**:
  - Clicking any blueprint or the formal resume paper opens an inspection modal, presenting deep-dive CAD breakdowns, FEA Von Mises stress heatmaps, MATLAB spring optimization equations, and full career narrative.

- **Physical Paper Drag & Drop**:
  - Grab, drag, and toss papers across the drafting board.
  - "Neaten Desk" button aligns all papers into an orderly CAD grid, while "Scatter Papers" restores casual organic angles.

- **Synthesized Web Audio**:
  - Realistic paper rustling and mechanical switch clicks generated entirely in-browser via the Web Audio API (zero audio file downloads, mute toggle included).

---

## 🚀 How to Run Locally

You don't need any build steps or npm packages. The project runs on standard HTML5, CSS3, and JavaScript.

### Option 1: Direct File
Simply double-click `index.html` to open it in Chrome, Edge, Safari, or Firefox.

### Option 2: Local HTTP Server (Recommended)
Open PowerShell or Terminal in this folder and run:
```powershell
# Using Python:
python -m http.server 8000
# Then visit http://localhost:8000 in your browser
```

---

## 🌐 How to Publish to GitHub Pages

1. **Initialize Git and Commit**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Skeuomorphic engineering portfolio"
   ```

2. **Create a Repository on GitHub**:
   - Go to [github.com/new](https://github.com/new).
   - Name your repository (e.g. `portfolio` or `gavin-higgins-portfolio`).
   - If you want the site URL to be `https://<your-username>.github.io`, name the repository `<your-username>.github.io`.

3. **Push your code**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - On GitHub, navigate to your repository's **Settings**.
   - In the left sidebar, click **Pages** (under the "Code and automation" section).
   - Under **Build and deployment > Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`, then click **Save**.
   - Wait 1-2 minutes. GitHub will provide your live URL:
     `https://<your-username>.github.io/<repo-name>/` (or `https://<your-username>.github.io/`).

---

## 🛠️ Customization

- **Resume & Details**: All contact information, GPA, bullet points, and project milestones are cleanly structured in `index.html` and `app.js`.
- **Styling**: Colors, shadows, fonts, and textures are organized in `styles.css` using CSS custom properties (`:root`).
- **Simulations**: The physics and animation parameters (spring stiffness, gear speeds, PID gains) are located in `drawings.js`.
