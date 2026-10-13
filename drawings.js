/* ==========================================================================
   GAVIN HIGGINS — CAD DRAWINGS & THREE.JS ENGINE
   - Multi-viewport technical CAD drawing views (Isometric, Front, Side)
   - Flat white shading with crisp black feature edges (SolidWorks style)
   - Real-time vertical exploded view on hover for 2026 Hero Robot
   - Procedural CAD line-art baseline so canvases are NEVER blank
   - Safe Draco decompression & isolated PDF.js resume rendering
   ========================================================================== */

// ==========================================================================
// 1. THREE.JS CAD ENGINE FOR DRAWING SHEETS
// ==========================================================================
class CadDrawingsEngine {
  constructor() {
    this.sheets = {};

    try {
      // Configure DracoLoader if available
      if (typeof THREE.DRACOLoader !== 'undefined') {
        this.dracoLoader = new THREE.DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      }

      this.loader = new THREE.GLTFLoader();
      if (this.dracoLoader) {
        this.loader.setDRACOLoader(this.dracoLoader);
      }
    } catch (e) {
      console.warn('Draco setup fallback:', e);
      this.loader = new THREE.GLTFLoader();
    }

    this.initSuspensionSheet();
    this.initHeroSheet();
    this.startLoop();
  }

  // ------------------------------------------------------------------------
  // HELPER: Convert meshes to Flat White CAD material with Crisp Edges
  // ------------------------------------------------------------------------
  applyCadMaterial(object) {
    const cadMat = new THREE.MeshStandardMaterial({
      color: 0xf6f6f4,
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

        try {
          const edges = new THREE.EdgesGeometry(child.geometry, 26);
          const line = new THREE.LineSegments(edges, edgeMat);
          child.add(line);
        } catch (e) {}
      }
    });
  }

  // ------------------------------------------------------------------------
  // PROCEDURAL CAD BASELINE (Guarantees drawing is never blank)
  // ------------------------------------------------------------------------
  createSuspensionProceduralCad() {
    const group = new THREE.Group();
    const cadMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.35, flatShading: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222 });

    const addPart = (geom, pos) => {
      const mesh = new THREE.Mesh(geom, cadMat);
      mesh.position.copy(pos);
      const edges = new THREE.EdgesGeometry(geom, 26);
      mesh.add(new THREE.LineSegments(edges, edgeMat));
      group.add(mesh);
      return mesh;
    };

    // Base plate
    addPart(new THREE.BoxGeometry(1.8, 0.22, 1.2), new THREE.Vector3(0, -0.9, 0));
    // Dual MGN9H Rails
    addPart(new THREE.BoxGeometry(0.18, 1.6, 0.22), new THREE.Vector3(-0.55, 0, 0));
    addPart(new THREE.BoxGeometry(0.18, 1.6, 0.22), new THREE.Vector3(0.55, 0, 0));
    // Carriage Slider Block (moving part)
    const carriage = addPart(new THREE.BoxGeometry(1.6, 0.35, 0.9), new THREE.Vector3(0, 0.1, 0));
    carriage.userData.isSlider = true;
    carriage.userData.initY = 0.1;

    // Helical spring cylinder
    addPart(new THREE.CylinderGeometry(0.24, 0.24, 1.1, 16), new THREE.Vector3(0, 0.15, 0));

    return { group, movingParts: [carriage] };
  }

  createHeroProceduralCad() {
    const group = new THREE.Group();
    const cadMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.35, flatShading: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222 });

    const addPart = (geom, pos, explodeDeltaY = 0) => {
      const mesh = new THREE.Mesh(geom, cadMat);
      mesh.position.copy(pos);
      mesh.userData.initY = pos.y;
      mesh.userData.explodeDeltaY = explodeDeltaY;
      const edges = new THREE.EdgesGeometry(geom, 26);
      mesh.add(new THREE.LineSegments(edges, edgeMat));
      group.add(mesh);
      return mesh;
    };

    // Subsystem 1: Chassis / Base Ring
    addPart(new THREE.CylinderGeometry(1.4, 1.5, 0.3, 32), new THREE.Vector3(0, -0.9, 0), -0.4);
    // Subsystem 2: Yaw Azimuth Bearing & Ring Gear
    addPart(new THREE.CylinderGeometry(1.2, 1.2, 0.22, 28), new THREE.Vector3(0, -0.6, 0), -0.15);
    // Subsystem 3: Gimbal Neck / Uprights
    addPart(new THREE.BoxGeometry(0.3, 1.1, 0.8), new THREE.Vector3(-0.75, 0.05, 0), 0.25);
    addPart(new THREE.BoxGeometry(0.3, 1.1, 0.8), new THREE.Vector3(0.75, 0.05, 0), 0.25);
    // Subsystem 4: Launcher Barrel & Housing (Top)
    addPart(new THREE.BoxGeometry(1.1, 0.55, 1.4), new THREE.Vector3(0, 0.7, 0), 0.75);
    addPart(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 16), new THREE.Vector3(0, 0.75, 0.8), 0.95);

    return group;
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
    const camSide = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

    // Initial procedural CAD baseline so view is NEVER empty
    const baseline = this.createSuspensionProceduralCad();
    scene.add(baseline.group);

    const sheetState = {
      canvas,
      renderer,
      scene,
      camIso,
      camFront,
      camSide,
      modelGroup: baseline.group,
      movingParts: baseline.movingParts,
      hovered: false,
      time: 0,
      compression: 0
    };

    sheetEl.addEventListener('mouseenter', () => { sheetState.hovered = true; });
    sheetEl.addEventListener('mouseleave', () => { sheetState.hovered = false; });

    this.sheets.suspension = sheetState;

    // Cameras
    camIso.position.set(2.6, 2.3, 2.6);
    camIso.lookAt(0, 0, 0);

    const orthoSize = 1.45;
    camFront.left = -orthoSize; camFront.right = orthoSize;
    camFront.top = orthoSize; camFront.bottom = -orthoSize;
    camFront.position.set(0, 0, 5); camFront.lookAt(0, 0, 0);
    camFront.updateProjectionMatrix();

    camSide.left = -orthoSize; camSide.right = orthoSize;
    camSide.top = orthoSize; camSide.bottom = -orthoSize;
    camSide.position.set(5, 0, 0); camSide.lookAt(0, 0, 0);
    camSide.updateProjectionMatrix();

    // Load actual GLB in background
    const glbUrl = encodeURI('2027,_Linear_Suspension_V3,_Assembly (1).glb');
    this.loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;
        this.applyCadMaterial(model);

        const bbox = new THREE.Box3().setFromObject(model);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        model.position.sub(center);
        const scale = 2.4 / maxDim;
        model.scale.set(scale, scale, scale);

        // Replace procedural baseline with loaded model
        scene.remove(baseline.group);
        const newGroup = new THREE.Group();
        newGroup.add(model);
        scene.add(newGroup);

        sheetState.modelGroup = newGroup;
        sheetState.movingParts = [];

        model.traverse((child) => {
          if (child.isMesh) {
            child.userData.initY = child.position.y;
            if (child.name.toLowerCase().includes('carriage') || child.name.toLowerCase().includes('slider') || child.position.y > 0.05) {
              sheetState.movingParts.push(child);
            }
          }
        });

        if (badge) badge.classList.add('loaded');
      },
      undefined,
      (err) => {
        if (badge) badge.classList.add('loaded');
      }
    );
  }

  // ------------------------------------------------------------------------
  // SHEET 2: 2026 HERO MK1 ASSEMBLY & EI TENSIONER
  // (Full assembly explodes vertically on hover)
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

    // Initial procedural CAD baseline so view is NEVER empty
    const baselineHero = this.createHeroProceduralCad();
    scene.add(baselineHero);

    // Initial procedural Tensioner in bottom-left
    const baselineTensioner = new THREE.Group();
    baselineTensioner.position.set(100, 0, 0);
    const cadMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.35, flatShading: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 24), cadMat);
    tBase.add(new THREE.LineSegments(new THREE.EdgesGeometry(tBase.geometry, 26), edgeMat));
    const tArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1.2), cadMat);
    tArm.position.set(0, 0.25, 0.3);
    tArm.add(new THREE.LineSegments(new THREE.EdgesGeometry(tArm.geometry, 26), edgeMat));
    baselineTensioner.add(tBase, tArm);
    scene.add(baselineTensioner);

    const baselineHeroMeshes = [];
    baselineHero.traverse((c) => { if (c.isMesh) baselineHeroMeshes.push(c); });

    const sheetState = {
      canvas,
      renderer,
      scene,
      camIso,
      camFront,
      camTensioner,
      heroGroup: baselineHero,
      tensionerGroup: baselineTensioner,
      heroMeshes: baselineHeroMeshes,
      explodeAmount: 0.0,
      targetExplode: 0.0,
      hovered: false,
      time: 0
    };

    sheetEl.addEventListener('mouseenter', () => { 
      sheetState.hovered = true;
      sheetState.targetExplode = 1.0; // Trigger vertical exploded view!
    });
    sheetEl.addEventListener('mouseleave', () => { 
      sheetState.hovered = false;
      sheetState.targetExplode = 0.0;
    });

    this.sheets.hero = sheetState;

    camIso.position.set(3.2, 2.7, 3.2);
    camIso.lookAt(0, 0, 0);

    const orthoSize = 1.55;
    camFront.left = -orthoSize; camFront.right = orthoSize;
    camFront.top = orthoSize; camFront.bottom = -orthoSize;
    camFront.position.set(0, 0.1, 5); camFront.lookAt(0, 0.1, 0);
    camFront.updateProjectionMatrix();

    camTensioner.position.set(100 + 2.2, 1.8, 2.2);
    camTensioner.lookAt(100, 0, 0);

    // Load actual Hero GLB in background
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

        scene.remove(baselineHero);
        const heroGroup = new THREE.Group();
        heroGroup.add(heroModel);
        scene.add(heroGroup);

        sheetState.heroGroup = heroGroup;
        sheetState.heroMeshes = [];

        heroModel.updateMatrixWorld(true);
        heroModel.traverse((child) => {
          if (child.isMesh) {
            const meshBBox = new THREE.Box3().setFromObject(child);
            const meshCenter = meshBBox.getCenter(new THREE.Vector3());
            
            child.userData.initY = child.position.y;
            const relativeY = meshCenter.y - center.y;
            child.userData.explodeDeltaY = relativeY * 1.85 + Math.sign(relativeY || 1) * 0.45;
            sheetState.heroMeshes.push(child);
          }
        });

        if (badge) badge.classList.add('loaded');
      },
      undefined,
      (err) => {
        if (badge) badge.classList.add('loaded');
      }
    );

    // Load EI Tensioner GLB in background
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

        scene.remove(baselineTensioner);
        const tensGroup = new THREE.Group();
        tensGroup.position.set(100, 0, 0);
        tensGroup.add(tensionerModel);
        scene.add(tensGroup);
        sheetState.tensionerGroup = tensGroup;
      },
      undefined,
      (err) => {}
    );
  }

  // ------------------------------------------------------------------------
  // MAIN RENDER LOOP
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
    s.explodeAmount = THREE.MathUtils.lerp(s.explodeAmount, s.targetExplode, 0.08);

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
// 2. ISOLATED RESUME PDF RENDERER (PDF.JS)
// ==========================================================================
class ResumePdfRenderer {
  constructor() {
    this.canvas = document.getElementById('resumeCanvas');
    if (!this.canvas) return;
    this.renderPdf();
  }

  renderPdf() {
    if (typeof pdfjsLib === 'undefined') {
      setTimeout(() => this.renderPdf(), 300);
      return;
    }

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdfUrl = encodeURI('Gavin_Higgins_Resume.pdf');
      pdfjsLib.getDocument(pdfUrl).promise.then((pdf) => {
        pdf.getPage(1).then((page) => {
          const viewport = page.getViewport({ scale: 2.2 });
          const canvas = this.canvas;
          const ctx = canvas.getContext('2d');

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          page.render({
            canvasContext: ctx,
            viewport: viewport
          });
        });
      }).catch((err) => {
        console.warn('PDF load note:', err);
      });
    } catch (e) {
      console.warn('Resume render catch:', e);
    }
  }
}

// Initialize on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  try {
    window.cadEngine = new CadDrawingsEngine();
  } catch (e) {
    console.warn('Cad Engine Init Catch:', e);
  }

  try {
    window.resumePdf = new ResumePdfRenderer();
  } catch (e) {
    console.warn('Resume PDF Init Catch:', e);
  }
});
