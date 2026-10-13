/* ==========================================================================
   GAVIN HIGGINS — CAD DRAWINGS & PROCEDURAL THREE.JS ENGINE
   - GLTFLoader configured with DRACOLoader (decodes KHR_draco_mesh_compression)
   - Multi-viewport technical drawing views with flat white shading & black edges
   - Hero full assembly vertical explosion along vertical axis on hover
   - EI Tensioner subassembly on the same sheet
   - PDF.js rendering of Gavin_Higgins_Resume.pdf at 75vh
   ========================================================================== */

class CadDrawingsEngine {
  constructor() {
    this.sheets = {};

    // 1. Initialize Draco Decoder for Draco-compressed GLB files
    this.dracoLoader = new THREE.DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.dracoLoader.preload();

    // 2. Configure GLTFLoader with Draco support
    this.loader = new THREE.GLTFLoader();
    this.loader.setDRACOLoader(this.dracoLoader);
    
    this.initSuspensionSheet();
    this.initHeroSheet();
    this.startLoop();
  }

  // ------------------------------------------------------------------------
  // HELPER: Convert meshes to Flat White CAD material with Crisp Edges
  // ------------------------------------------------------------------------
  applyCadMaterial(object) {
    const cadMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f2,
      roughness: 0.35,
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
          const edges = new THREE.EdgesGeometry(child.geometry, 26);
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

    // Technical CAD Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0d0cc, 1.3);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(6, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-6, -6, -6);
    scene.add(dirLight2);

    // Three Multi-View Cameras:
    // 1. Top-Left: Isometric View
    // 2. Top-Right: Front Orthographic View
    // 3. Bottom-Left: Side Orthographic View
    const camIso = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
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

    // Load Suspension Assembly GLB with Draco Support
    const glbUrl = encodeURI('2027,_Linear_Suspension_V3,_Assembly (1).glb');
    this.loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;
        this.applyCadMaterial(model);

        // Compute Bounding Box & Center
        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        model.position.sub(center);
        const scale = 2.4 / maxDim;
        model.scale.set(scale, scale, scale);

        const group = new THREE.Group();
        group.add(model);
        scene.add(group);
        sheetState.modelGroup = group;

        // Detect moving carriage/slider parts
        model.traverse((child) => {
          if (child.isMesh) {
            child.userData.initY = child.position.y;
            if (child.name.toLowerCase().includes('carriage') || child.name.toLowerCase().includes('slider') || child.position.y > 0.05) {
              sheetState.movingParts.push(child);
            }
          }
        });

        // Set Cameras
        camIso.position.set(2.6, 2.3, 2.6);
        camIso.lookAt(0, 0, 0);

        const orthoViewSize = 1.45;
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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0d0cc, 1.3);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight1.position.set(6, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-6, -6, -6);
    scene.add(dirLight2);

    const camIso = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    const camFront = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    const camTensioner = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);

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

    // 1. Load Hero Full Assembly GLB with Draco Support
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
            // Explode delta along vertical axis (Y):
            const relativeY = meshCenter.y - center.y;
            child.userData.explodeDeltaY = relativeY * 1.85 + Math.sign(relativeY || 1) * 0.45;
            sheetState.heroMeshes.push(child);
          }
        });

        // Set Isometric & Front Cameras
        camIso.position.set(3.2, 2.7, 3.2);
        camIso.lookAt(0, 0, 0);

        const orthoViewSize = 1.55;
        camFront.left = -orthoViewSize;
        camFront.right = orthoViewSize;
        camFront.top = orthoViewSize;
        camFront.bottom = -orthoViewSize;
        camFront.position.set(0, 0.1, 5);
        camFront.lookAt(0, 0.1, 0);
        camFront.updateProjectionMatrix();

        if (badge) badge.classList.add('loaded');
      },
      undefined,
      (err) => {
        console.warn('Hero GLB load note:', err);
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

        const tensGroup = new THREE.Group();
        tensGroup.position.set(100, 0, 0);
        tensGroup.add(tensionerModel);
        scene.add(tensGroup);
        sheetState.tensionerGroup = tensGroup;

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

    if (s.hovered) {
      s.heroGroup.rotation.y = Math.sin(s.time * 0.8) * 0.22;
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
// 2. AUTHENTIC VECTOR RESUME PDF RENDERER (PDF.JS)
// ==========================================================================
class ResumePdfRenderer {
  constructor() {
    this.canvas = document.getElementById('resumeCanvas');
    if (!this.canvas) return;
    this.renderPdf();
  }

  renderPdf() {
    if (typeof pdfjsLib === 'undefined') {
      setTimeout(() => this.renderPdf(), 350);
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdfUrl = encodeURI('Gavin_Higgins_Resume.pdf');
    pdfjsLib.getDocument(pdfUrl).promise.then((pdf) => {
      pdf.getPage(1).then((page) => {
        const viewport = page.getViewport({ scale: 2.2 });
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
  window.cadEngine = new CadDrawingsEngine();
  window.resumePdf = new ResumePdfRenderer();
});
