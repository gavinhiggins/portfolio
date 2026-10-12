/* ==========================================================================
   GAVIN HIGGINS — CAD DRAWINGS & PROCEDURAL WOOD DESK ENGINE
   - Natural vertical wood plank tabletop canvas (matching screenshot)
   - Three.js multi-viewport CAD renderer for GLB assemblies
   - Flat white technical drawing shader with black feature edges
   - Hero full assembly vertical explosion animation on hover
   - EI Tensioner subassembly on the same sheet
   - PDF.js rendering of Gavin_Higgins_Resume.pdf
   ========================================================================== */

// ==========================================================================
// 1. PROCEDURAL NATURAL WOODEN DESK CANVAS
// ==========================================================================
class WoodDeskRenderer {
  constructor() {
    this.canvas = document.getElementById('deskWoodCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.render();
    window.addEventListener('resize', () => this.render());
  }

  render() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.ctx;

    // Base warm timber background
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(0, 0, w, h);

    // Vertical plank parameters
    const plankWidth = Math.max(140, Math.floor(w / 8));
    const numPlanks = Math.ceil(w / plankWidth) + 1;

    // Color palettes for planks (warm amber oak / walnut planks)
    const plankColors = [
      '#422b17', '#3c2613', '#49301b', '#382210', 
      '#462e19', '#3f2815', '#4d331c', '#3a2311'
    ];

    for (let i = 0; i < numPlanks; i++) {
      const px = i * plankWidth;
      const baseCol = plankColors[i % plankColors.length];
      
      // Plank body
      ctx.fillStyle = baseCol;
      ctx.fillRect(px, 0, plankWidth, h);

      // Fine vertical wood grain streaks inside each plank
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const numGrains = 28;
      for (let g = 0; g < numGrains; g++) {
        const gx = px + (g / numGrains) * plankWidth + (Math.sin(g * 3.7 + i) * 3);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        // Subtle wavy grain
        const waveAmp = (g % 3 === 0 ? 4 : 2);
        ctx.bezierCurveTo(
          gx + waveAmp, h * 0.3,
          gx - waveAmp, h * 0.7,
          gx, h
        );
        ctx.stroke();
      }

      // Darker grain fiber lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      for (let dg = 0; dg < 14; dg++) {
        const dgx = px + (dg / 14) * plankWidth;
        ctx.beginPath();
        ctx.moveTo(dgx, 0);
        ctx.lineTo(dgx + (Math.sin(dg * 5 + i) * 2), h);
        ctx.stroke();
      }

      // Subtle wood knot on select planks
      if (i % 3 === 1) {
        const knotY = (h * 0.25) + ((i * 137) % (h * 0.5));
        const knotX = px + plankWidth * 0.45;
        for (let r = 4; r < 28; r += 5) {
          ctx.strokeStyle = 'rgba(25, 14, 6, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(knotX, knotY, r * 0.7, r * 1.6, 0.1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Plank Seam: Dark shadow groove on left, subtle highlight on right
      // Dark groove
      ctx.fillStyle = 'rgba(10, 6, 3, 0.55)';
      ctx.fillRect(px - 1, 0, 2.5, h);
      // Soft ambient shadow next to groove
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(px - 4, 0, 3, h);
      // Edge highlight
      ctx.fillStyle = 'rgba(255, 235, 205, 0.06)';
      ctx.fillRect(px + 1.5, 0, 1.5, h);
    }

    // Soft global vignette (darker edges like workshop lighting)
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.25, w * 0.5, h * 0.5, w * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
    vignette.addColorStop(1, 'rgba(12, 6, 2, 0.48)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
}

// ==========================================================================
// 2. THREE.JS MULTI-VIEWPORT CAD DRAWINGS ENGINE
// ==========================================================================
class CadDrawingsEngine {
  constructor() {
    this.loader = new THREE.GLTFLoader();
    this.sheets = {};
    
    this.initSuspensionSheet();
    this.initHeroSheet();
    this.startLoop();
  }

  // ------------------------------------------------------------------------
  // HELPER: Convert meshes to Flat White CAD material with Crisp Edges
  // ------------------------------------------------------------------------
  applyCadMaterial(object) {
    const cadMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f3,
      roughness: 0.38,
      metalness: 0.08,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x222222,
      linewidth: 1.2
    });

    object.traverse((child) => {
      if (child.isMesh) {
        child.material = cadMat;
        child.castShadow = false;
        child.receiveShadow = false;

        // Add feature edge lines (SolidWorks drawing style)
        try {
          const edges = new THREE.EdgesGeometry(child.geometry, 28);
          const line = new THREE.LineSegments(edges, edgeMat);
          child.add(line);
        } catch (e) {}
      }
    });
  }

  // ------------------------------------------------------------------------
  // SHEET 1: 2027 LINEAR SUSPENSION V3 ASSEMBLY
  // ------------------------------------------------------------------------
  initSuspensionSheet() {
    const canvas = document.getElementById('canvasSuspension3D');
    const badge = document.getElementById('badgeSuspension');
    const sheetEl = document.getElementById('sheetSuspension');
    if (!canvas || !sheetEl) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const scene = new THREE.Scene();

    // Subtle CAD Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0d0cc, 1.2);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Three Multi-View Cameras:
    // 1. Top-Left: Isometric View
    // 2. Top-Right: Front Orthographic View
    // 3. Bottom-Left: Side Orthographic View
    const camIso = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    const camFront = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    const camSide = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

    const sheetState = {
      canvas,
      renderer,
      scene,
      camIso,
      camFront,
      camSide,
      modelGroup: null,
      movingParts: [],
      hovered: false,
      time: 0,
      compression: 0
    };

    sheetEl.addEventListener('mouseenter', () => { sheetState.hovered = true; });
    sheetEl.addEventListener('mouseleave', () => { sheetState.hovered = false; });

    this.sheets.suspension = sheetState;

    // Load Suspension Assembly GLB
    const glbUrl = encodeURI('2027,_Linear_Suspension_V3,_Assembly (1).glb');
    this.loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;
        this.applyCadMaterial(model);

        // Center and normalize bounding box
        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        model.position.sub(center);
        const scale = 2.4 / maxDim;
        model.scale.set(scale, scale, scale);

        // Group to hold model
        const group = new THREE.Group();
        group.add(model);
        scene.add(group);
        sheetState.modelGroup = group;

        // Detect carriage or linear rail slider parts for animation
        model.traverse((child) => {
          if (child.isMesh) {
            child.userData.initY = child.position.y;
            // Identify moving carriage components
            if (child.name.toLowerCase().includes('carriage') || child.name.toLowerCase().includes('slider') || child.position.y > 0.1) {
              sheetState.movingParts.push(child);
            }
          }
        });

        // Set Cameras to look at center
        camIso.position.set(2.8, 2.4, 2.8);
        camIso.lookAt(0, 0, 0);

        const orthoViewSize = 1.6;
        camFront.left = -orthoViewSize;
        camFront.right = orthoViewSize;
        camFront.top = orthoViewSize;
        camFront.bottom = -orthoViewSize;
        camFront.position.set(0, 0, 5);
        camFront.lookAt(0, 0, 0);
        camFront.updateProjectionMatrix();

        camSide.left = -orthoViewSize;
        camSide.right = orthoViewSize;
        camSide.top = orthoViewSize;
        camSide.bottom = -orthoViewSize;
        camSide.position.set(5, 0, 0);
        camSide.lookAt(0, 0, 0);
        camSide.updateProjectionMatrix();

        if (badge) badge.classList.add('loaded');
      },
      undefined,
      (err) => {
        console.warn('Suspension GLB load note:', err);
        if (badge) badge.innerText = 'CAD DISPLAY ACTIVE';
      }
    );
  }

  // ------------------------------------------------------------------------
  // SHEET 2: 2026 HERO MK1 ASSEMBLY & EI TENSIONER
  // (Full assembly explodes along vertical axis when hovered)
  // ------------------------------------------------------------------------
  initHeroSheet() {
    const canvas = document.getElementById('canvasHero3D');
    const badge = document.getElementById('badgeHero');
    const sheetEl = document.getElementById('sheetHero');
    if (!canvas || !sheetEl) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const scene = new THREE.Scene();

    // CAD Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0d0cc, 1.3);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(6, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-6, -6, -6);
    scene.add(dirLight2);

    const camIso = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    const camFront = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    const camTensioner = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

    const sheetState = {
      canvas,
      renderer,
      scene,
      camIso,
      camFront,
      camTensioner,
      heroGroup: null,
      tensionerGroup: null,
      heroMeshes: [],
      explodeAmount: 0.0,
      targetExplode: 0.0,
      hovered: false,
      time: 0
    };

    sheetEl.addEventListener('mouseenter', () => { 
      sheetState.hovered = true;
      sheetState.targetExplode = 1.0; // TRIGGER VERTICAL EXPLODED VIEW!
    });
    sheetEl.addEventListener('mouseleave', () => { 
      sheetState.hovered = false;
      sheetState.targetExplode = 0.0; // RETURN TO ASSEMBLED STATE
    });

    this.sheets.hero = sheetState;

    // 1. Load Hero Full Assembly GLB
    const heroGlbUrl = encodeURI('Hero_Mk1 (1).glb');
    this.loader.load(
      heroGlbUrl,
      (gltf) => {
        const heroModel = gltf.scene;
        this.applyCadMaterial(heroModel);

        const bbox = new THREE.Box3().setFromObject(heroModel);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        heroModel.position.sub(center);
        const scale = 2.5 / maxDim;
        heroModel.scale.set(scale, scale, scale);

        const heroGroup = new THREE.Group();
        heroGroup.add(heroModel);
        scene.add(heroGroup);
        sheetState.heroGroup = heroGroup;

        // Calculate vertical explode vector for each mesh
        heroModel.updateMatrixWorld(true);
        heroModel.traverse((child) => {
          if (child.isMesh) {
            const meshBBox = new THREE.Box3().setFromObject(child);
            const meshCenter = meshBBox.getCenter(new THREE.Vector3());
            
            child.userData.initY = child.position.y;
            // The explode delta along the vertical axis (Y):
            // Parts above center expand upward, parts below stay or shift downward
            const relativeY = meshCenter.y - center.y;
            child.userData.explodeDeltaY = relativeY * 1.8 + Math.sign(relativeY || 1) * 0.4;
            sheetState.heroMeshes.push(child);
          }
        });

        // Set Isometric & Front Cameras
        camIso.position.set(3.4, 2.8, 3.4);
        camIso.lookAt(0, 0, 0);

        const orthoViewSize = 1.7;
        camFront.left = -orthoViewSize;
        camFront.right = orthoViewSize;
        camFront.top = orthoViewSize;
        camFront.bottom = -orthoViewSize;
        camFront.position.set(0, 0.2, 5);
        camFront.lookAt(0, 0.2, 0);
        camFront.updateProjectionMatrix();

        if (badge) badge.classList.add('loaded');
      },
      undefined,
      (err) => {
        console.warn('Hero GLB load note:', err);
        if (badge) badge.innerText = 'CAD DISPLAY ACTIVE';
      }
    );

    // 2. Load EI Tensioner Assembly GLB on the same sheet (Bottom-Left)
    const tensionerGlbUrl = encodeURI('Hero_Mk1_TurretBase_EITensioner (1).glb');
    this.loader.load(
      tensionerGlbUrl,
      (gltf) => {
        const tensionerModel = gltf.scene;
        this.applyCadMaterial(tensionerModel);

        const bbox = new THREE.Box3().setFromObject(tensionerModel);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        tensionerModel.position.sub(center);
        const scale = 2.0 / maxDim;
        tensionerModel.scale.set(scale, scale, scale);

        // Put in its own isolated subscene or offset
        const tensGroup = new THREE.Group();
        tensGroup.position.set(100, 0, 0); // Offset in scene
        tensGroup.add(tensionerModel);
        scene.add(tensGroup);
        sheetState.tensionerGroup = tensGroup;

        // Tensioner camera looks at tensioner offset
        camTensioner.position.set(100 + 2.2, 1.8, 2.2);
        camTensioner.lookAt(100, 0, 0);
      },
      undefined,
      (err) => {
        console.warn('Tensioner GLB load note:', err);
      }
    );
  }

  // ------------------------------------------------------------------------
  // MAIN RENDER LOOP (Multi-Viewport Rendering)
  // ------------------------------------------------------------------------
  startLoop() {
    const loop = () => {
      this.renderSuspension();
      this.renderHero();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Render Sheet 1 (Suspension)
  renderSuspension() {
    const s = this.sheets.suspension;
    if (!s || !s.modelGroup) return;

    const canvas = s.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * window.devicePixelRatio || canvas.height !== h * window.devicePixelRatio) {
      s.renderer.setSize(w, h, false);
    }

    s.time += 0.016;
    if (s.hovered) {
      s.compression = Math.sin(s.time * 5.0) * 0.15;
    } else {
      s.compression = THREE.MathUtils.lerp(s.compression, 0, 0.08);
    }

    // Animate moving carriage slider parts
    s.movingParts.forEach((part) => {
      part.position.y = part.userData.initY + s.compression;
    });

    s.renderer.setScissorTest(true);
    s.renderer.clear();

    // VIEWPORT 1: TOP-LEFT ISOMETRIC VIEW
    const v1_x = Math.floor(w * 0.02);
    const v1_y = Math.floor(h * 0.42);
    const v1_w = Math.floor(w * 0.48);
    const v1_h = Math.floor(h * 0.56);
    s.renderer.setViewport(v1_x, v1_y, v1_w, v1_h);
    s.renderer.setScissor(v1_x, v1_y, v1_w, v1_h);
    s.camIso.aspect = v1_w / v1_h;
    s.camIso.updateProjectionMatrix();
    s.renderer.render(s.scene, s.camIso);

    // VIEWPORT 2: TOP-RIGHT FRONT ORTHOGRAPHIC VIEW
    const v2_x = Math.floor(w * 0.52);
    const v2_y = Math.floor(h * 0.42);
    const v2_w = Math.floor(w * 0.46);
    const v2_h = Math.floor(h * 0.56);
    s.renderer.setViewport(v2_x, v2_y, v2_w, v2_h);
    s.renderer.setScissor(v2_x, v2_y, v2_w, v2_h);
    s.renderer.render(s.scene, s.camFront);

    // VIEWPORT 3: BOTTOM-LEFT SIDE ORTHOGRAPHIC VIEW
    const v3_x = Math.floor(w * 0.02);
    const v3_y = Math.floor(h * 0.04);
    const v3_w = Math.floor(w * 0.48);
    const v3_h = Math.floor(h * 0.38);
    s.renderer.setViewport(v3_x, v3_y, v3_w, v3_h);
    s.renderer.setScissor(v3_x, v3_y, v3_w, v3_h);
    s.renderer.render(s.scene, s.camSide);

    s.renderer.setScissorTest(false);
  }

  // Render Sheet 2 (Hero Full Assembly & EI Tensioner)
  renderHero() {
    const s = this.sheets.hero;
    if (!s || !s.heroGroup) return;

    const canvas = s.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * window.devicePixelRatio || canvas.height !== h * window.devicePixelRatio) {
      s.renderer.setSize(w, h, false);
    }

    s.time += 0.016;

    // Smoothly interpolate vertical exploded view factor (lerp)
    s.explodeAmount = THREE.MathUtils.lerp(s.explodeAmount, s.targetExplode, 0.08);

    // Apply vertical explosion along vertical axis (Y-axis)
    s.heroMeshes.forEach((mesh) => {
      mesh.position.y = mesh.userData.initY + (mesh.userData.explodeDeltaY * s.explodeAmount);
    });

    // Subtle gentle rotation on hover
    if (s.hovered) {
      s.heroGroup.rotation.y = Math.sin(s.time * 0.8) * 0.25;
      if (s.tensionerGroup) {
        s.tensionerGroup.rotation.y = s.time * 0.5;
      }
    } else {
      s.heroGroup.rotation.y = THREE.MathUtils.lerp(s.heroGroup.rotation.y, 0, 0.06);
    }

    s.renderer.setScissorTest(true);
    s.renderer.clear();

    // VIEWPORT 1: TOP-LEFT ISOMETRIC VIEW (EXPLODES ON HOVER)
    const v1_x = Math.floor(w * 0.02);
    const v1_y = Math.floor(h * 0.42);
    const v1_w = Math.floor(w * 0.48);
    const v1_h = Math.floor(h * 0.56);
    s.renderer.setViewport(v1_x, v1_y, v1_w, v1_h);
    s.renderer.setScissor(v1_x, v1_y, v1_w, v1_h);
    s.camIso.aspect = v1_w / v1_h;
    s.camIso.updateProjectionMatrix();
    s.renderer.render(s.scene, s.camIso);

    // VIEWPORT 2: TOP-RIGHT FRONT ORTHOGRAPHIC VIEW (EXPLODES ON HOVER)
    const v2_x = Math.floor(w * 0.52);
    const v2_y = Math.floor(h * 0.42);
    const v2_w = Math.floor(w * 0.46);
    const v2_h = Math.floor(h * 0.56);
    s.renderer.setViewport(v2_x, v2_y, v2_w, v2_h);
    s.renderer.setScissor(v2_x, v2_y, v2_w, v2_h);
    s.renderer.render(s.scene, s.camFront);

    // VIEWPORT 3: BOTTOM-LEFT EI TENSIONER ASSEMBLY
    if (s.tensionerGroup) {
      const v3_x = Math.floor(w * 0.02);
      const v3_y = Math.floor(h * 0.04);
      const v3_w = Math.floor(w * 0.48);
      const v3_h = Math.floor(h * 0.38);
      s.renderer.setViewport(v3_x, v3_y, v3_w, v3_h);
      s.renderer.setScissor(v3_x, v3_y, v3_w, v3_h);
      s.camTensioner.aspect = v3_w / v3_h;
      s.camTensioner.updateProjectionMatrix();
      s.renderer.render(s.scene, s.camTensioner);
    }

    s.renderer.setScissorTest(false);
  }
}

// ==========================================================================
// 3. AUTHENTIC VECTOR RESUME PDF RENDERER (PDF.JS)
// ==========================================================================
class ResumePdfRenderer {
  constructor() {
    this.canvas = document.getElementById('resumeCanvas');
    if (!this.canvas) return;
    this.renderPdf();
  }

  renderPdf() {
    if (typeof pdfjsLib === 'undefined') {
      console.warn('PDF.js loading...');
      setTimeout(() => this.renderPdf(), 400);
      return;
    }

    // Set worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdfUrl = encodeURI('Gavin_Higgins_Resume.pdf');
    pdfjsLib.getDocument(pdfUrl).promise.then((pdf) => {
      pdf.getPage(1).then((page) => {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = this.canvas;
        const ctx = canvas.getContext('2d');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        page.render(renderContext);
      });
    }).catch((err) => {
      console.warn('PDF load note:', err);
    });
  }
}

// Initialize on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  window.woodDesk = new WoodDeskRenderer();
  window.cadEngine = new CadDrawingsEngine();
  window.resumePdf = new ResumePdfRenderer();
});
