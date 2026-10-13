/* ==========================================================================
   GAVIN HIGGINS — CAD DRAWINGS & THREE.JS ENGINE
   - Hero sheet:        LEFT HALF  = Exploded view of EI Tensioner Assembly (on hover)
                        RIGHT SIDE = Static beauty shot of full Hero Mk1 Assembly
   - Suspension sheet:  LEFT HALF  = Full assembly (wheel spins concentric with gearbox,
                                      carriage & all rail plates bump 10-20mm on rails)
                        TOP RIGHT  = Static beauty shot, no wheel / gearbox
   - Models scaled & framed to fill most of each page cleanly
   - Floating/detached components removed in both assemblies
   - Flat white shading with crisp black feature edges (SolidWorks style)
   - Procedural CAD baseline so canvases are never blank while GLBs load
   ========================================================================== */

// ==========================================================================
// 0. CONFIG
// ==========================================================================
const CAD_CONFIG = {
  tensioner: {
    explodeGap: 0.55 // vertical spacing multiplier when exploded
  },

  suspension: {
    travelAxis: 'y',            // rails run along Y axis
    nativeUnitMm: null,         // null = auto-detect
    wheelSpinRadPerSec: 16,     // wheel spin speed while hovered
    bump: {
      minMm: 10, maxMm: 20,     // bump travel range
      minGapSec: 0.8, maxGapSec: 2.2,
      holdSec: 0.12,
      freqHz: 4.0, damping: 0.65 // spring-back damping
    }
  }
};

// Viewport layout inside each canvas (fractions of canvas, origin bottom-left)
// Enlarged to fill most of the page normally without clipping
const VIEWS = {
  main:  { x: 0.02, y: 0.02, w: 0.48, h: 0.96 }, // left half, fills height
  right: { x: 0.50, y: 0.14, w: 0.48, h: 0.83 }  // right side, fills space above/beside title block
};

// Camera directions (from the target toward the camera)
const HERO_TENSIONER_DIR = new THREE.Vector3(0.92, 0.58, 0.95); // isometric for EI tensioner
const HERO_BEAUTY_DIR    = new THREE.Vector3(0.68, 0.45, 0.82); // isometric beauty shot for Hero Mk1
const SUSP_MAIN_DIR      = new THREE.Vector3(0.92, 0.46, 1.0);
const SUSP_BEAUTY_DIR    = new THREE.Vector3(-0.85, 0.45, 1.0);

const HERO_BEAUTY_X = 200; // Hero Mk1 lives off to the side in the hero scene

const normName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ==========================================================================
// 1. THREE.JS CAD ENGINE FOR DRAWING SHEETS
// ==========================================================================
class CadDrawingsEngine {
  constructor() {
    this.sheets = {};

    try {
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
  // SHARED HELPERS
  // ------------------------------------------------------------------------
  createRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    return r;
  }

  createLitScene() {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d0cc, 1.35));

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight1.position.set(6, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.42);
    dirLight2.position.set(-6, -6, -6);
    scene.add(dirLight2);

    return scene;
  }

  syncSize(s) {
    const w = s.canvas.clientWidth;
    const h = s.canvas.clientHeight;
    if (!w || !h) return false;
    if (w !== s.w || h !== s.h) {
      s.w = w;
      s.h = h;
      s.renderer.setSize(w, h, false);
      s.dirty = true;
    }
    return true;
  }

  pxRect(view, w, h) {
    return {
      x: Math.floor(view.x * w),
      y: Math.floor(view.y * h),
      w: Math.max(1, Math.floor(view.w * w)),
      h: Math.max(1, Math.floor(view.h * h))
    };
  }

  useRect(renderer, rect) {
    renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
    renderer.setScissor(rect.x, rect.y, rect.w, rect.h);
  }

  clearCanvas(s) {
    const r = s.renderer;
    r.setScissorTest(false);
    r.setViewport(0, 0, s.w, s.h);
    r.clear();
    r.setScissorTest(true);
  }

  rand(a, b) {
    return a + Math.random() * (b - a);
  }

  // Places a perspective camera so a box of `size` centered at `center` fits
  // the viewport aspect tightly so the models fill most of the page normally.
  frameCamera(cam, center, dir, size, aspect, margin = 1.04) {
    const d = dir.clone().normalize();
    const elev = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    const rXZ = 0.5 * Math.hypot(size.x, size.z);
    const halfW = rXZ * margin;
    const halfH = (0.5 * size.y * Math.cos(elev) + rXZ * Math.abs(Math.sin(elev))) * margin;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5);
    const dist = Math.max(halfH / tanV, halfW / (tanV * aspect));

    cam.aspect = aspect;
    cam.near = Math.max(0.01, dist * 0.05);
    cam.far = dist + size.length() * 2 + 10;
    cam.position.copy(center).addScaledVector(d, dist);
    cam.lookAt(center);
    cam.updateProjectionMatrix();
  }

  boxToFrame(box) {
    if (box.isEmpty()) {
      return { center: new THREE.Vector3(), size: new THREE.Vector3(2, 2, 2) };
    }
    return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  }

  // Convert meshes to flat white CAD material with crisp feature edges
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
  // PROCEDURAL CAD BASELINES
  // ------------------------------------------------------------------------
  makeBaselineMesh(geom, pos, rot) {
    const cadMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.35, flatShading: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    const mesh = new THREE.Mesh(geom, cadMat);
    mesh.position.copy(pos);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 26), edgeMat));
    return mesh;
  }

  createSuspensionProceduralCad() {
    const root = new THREE.Group();
    const parts = { fixed: [], carriage: [], wheel: [], gearbox: [] };
    const add = (kind, geom, pos, rot) => {
      const mesh = this.makeBaselineMesh(geom, pos, rot);
      root.add(mesh);
      parts[kind].push(mesh);
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    // Fixed: base mounting plate, dual rails, shock body
    add('fixed', new THREE.BoxGeometry(1.8, 0.22, 1.2), V(0, -0.95, 0));
    add('fixed', new THREE.BoxGeometry(0.18, 1.7, 0.22), V(-0.55, -0.05, 0));
    add('fixed', new THREE.BoxGeometry(0.18, 1.7, 0.22), V(0.55, -0.05, 0));
    add('fixed', new THREE.CylinderGeometry(0.14, 0.14, 1.0, 16), V(0, 0.1, -0.35));

    // Moving carriage assembly (carriages, plates, gearbox, wheel)
    add('carriage', new THREE.BoxGeometry(1.6, 0.3, 0.5), V(0, 0.0, 0));
    add('carriage', new THREE.BoxGeometry(1.2, 0.15, 0.6), V(0, -0.15, 0.2));
    add('gearbox', new THREE.BoxGeometry(0.5, 0.5, 0.4), V(0, -0.2, 0.5));
    add('wheel', new THREE.CylinderGeometry(0.55, 0.55, 0.22, 32), V(0, -0.2, 0.9), [0, 0, Math.PI / 2]);

    return { root, parts };
  }

  createProceduralTensionerLayers() {
    const root = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const layers = [];

    const makeLayer = (name, defs, offset) => {
      const g = new THREE.Group();
      g.name = name;
      defs.forEach(([geom, pos, rot]) => g.add(this.makeBaselineMesh(geom, pos, rot)));
      root.add(g);
      layers.push({ name, group: g, offset });
    };

    // 5 vertical stacked layers matching true tensioner
    // Layer 1: Motor & Driving Pulley
    makeLayer('Motor & Drive', [
      [new THREE.CylinderGeometry(0.38, 0.38, 0.55, 24), V(0.45, -0.5, 0)],
      [new THREE.CylinderGeometry(0.25, 0.25, 0.3, 20), V(0.45, -0.1, 0)]
    ], -0.65);

    // Layer 2: Nut & Bottom Plate + Belt
    makeLayer('Bottom Plate & Belt', [
      [new THREE.BoxGeometry(1.4, 0.12, 0.9), V(0, -0.2, 0)],
      [new THREE.TorusGeometry(0.52, 0.06, 12, 28), V(0, -0.15, 0), [Math.PI / 2, 0, 0]]
    ], -0.32);

    // Layer 3: Main Bearing & Driven Pulley
    makeLayer('Bearing & Driven Pulley', [
      [new THREE.CylinderGeometry(0.75, 0.75, 0.18, 32), V(-0.35, 0, 0)],
      [new THREE.CylinderGeometry(0.62, 0.62, 0.22, 32), V(-0.35, 0, 0)]
    ], 0.0);

    // Layer 4: Sandwich Plate & Spacers
    makeLayer('Sandwich Plate', [
      [new THREE.BoxGeometry(1.5, 0.12, 1.0), V(0, 0.2, 0)],
      [new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12), V(0.6, 0.2, 0.3)],
      [new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12), V(-0.6, 0.2, -0.3)]
    ], 0.32);

    // Layer 5: Top Plate & Encoder
    makeLayer('Top Plate & Encoder', [
      [new THREE.BoxGeometry(1.4, 0.12, 0.9), V(0, 0.45, 0)],
      [new THREE.CylinderGeometry(0.24, 0.24, 0.18, 20), V(0, 0.6, 0)]
    ], 0.65);

    return { root, layers };
  }

  createProceduralHeroBeauty() {
    const root = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const add = (geom, pos, rot) => root.add(this.makeBaselineMesh(geom, pos, rot));

    // Chassis
    add(new THREE.CylinderGeometry(1.4, 1.5, 0.3, 32), V(0, -0.85, 0));
    add(new THREE.BoxGeometry(0.35, 0.3, 1.4), V(1.2, -0.85, 0));
    add(new THREE.BoxGeometry(0.35, 0.3, 1.4), V(-1.2, -0.85, 0));

    // Yaw bearing & Turret base
    add(new THREE.CylinderGeometry(1.15, 1.15, 0.22, 28), V(0, -0.55, 0));

    // Gimbal uprights & Pitch mechanism
    add(new THREE.BoxGeometry(0.28, 1.1, 0.75), V(-0.7, 0.1, 0));
    add(new THREE.BoxGeometry(0.28, 1.1, 0.75), V(0.7, 0.1, 0));

    // Launcher barrel & feeder
    add(new THREE.BoxGeometry(1.05, 0.55, 1.35), V(0, 0.7, 0));
    add(new THREE.CylinderGeometry(0.16, 0.16, 1.9, 16), V(0, 0.75, 0.8), [Math.PI / 2, 0, 0]);

    return root;
  }

  // ------------------------------------------------------------------------
  // SHEET 1: 2027 LINEAR SUSPENSION V3 ASSEMBLY
  //   Left half : Full assembly (wheel spins concentric with gearbox,
  //               carriage + plates bump up and down 10-20mm)
  //   Top right : Static beauty shot (carriage at rest, no wheel / gearbox)
  // ------------------------------------------------------------------------
  initSuspensionSheet() {
    const canvas = document.getElementById('canvasSuspension3D');
    const badge = document.getElementById('badgeSuspension');
    const sheetEl = document.getElementById('sheetSuspension');
    if (!canvas || !sheetEl) return;

    const renderer = this.createRenderer(canvas);
    const scene = this.createLitScene();

    const s = {
      canvas, renderer, scene,
      camMain: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      camBeauty: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      w: 0, h: 0, dirty: true,
      hovered: false,
      time: 0, last: performance.now(),
      root: null, carriageGroup: null, wheelSpinGroup: null,
      hiddenInBeauty: [], unitsPerMm: 0.012,
      fullFrame: null, beautyFrame: null,
      spin: 0, wheelAngle: 0,
      bumpY: 0, bumpV: 0, bumpTarget: 0, bumpReleaseAt: 0, nextBumpAt: 0
    };
    this.sheets.suspension = s;

    // Procedural baseline so canvas is NEVER blank
    const baseline = this.createSuspensionProceduralCad();
    scene.add(baseline.root);
    this.rigSuspensionProcedural(s, baseline.root, baseline.parts);

    sheetEl.addEventListener('mouseenter', () => {
      s.hovered = true;
      s.nextBumpAt = s.time + 0.35;
    });
    sheetEl.addEventListener('mouseleave', () => {
      s.hovered = false;
    });

    // Load actual Suspension GLB in background
    const glbUrl = encodeURI('2027,_Linear_Suspension_V3,_Assembly (1).glb');
    this.loader.load(
      glbUrl,
      (gltf) => {
        try {
          const cfg = CAD_CONFIG.suspension;
          const model = gltf.scene;
          this.applyCadMaterial(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const nativeMax = Math.max(size.x, size.y, size.z) || 1;

          // Scale model to standard 2.4 scene units
          const scale = 2.4 / nativeMax;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const group = new THREE.Group();
          group.add(model);
          scene.remove(baseline.root);
          scene.add(group);
          group.updateMatrixWorld(true);

          const mmPerNativeUnit = cfg.nativeUnitMm || (nativeMax > 20 ? 1 : 1000);
          const unitsPerMm = scale / mmPerNativeUnit;

          // Rig true CAD assembly
          this.rigSuspensionCad(s, group, model, unitsPerMm);

          if (badge) badge.classList.add('loaded');
        } catch (e) {
          console.warn('Suspension model setup fallback:', e);
          if (badge) badge.classList.add('loaded');
        }
      },
      undefined,
      () => { if (badge) badge.classList.add('loaded'); }
    );
  }

  rigSuspensionProcedural(s, root, parts) {
    const carriageGroup = new THREE.Group();
    carriageGroup.name = 'carriageGroup';
    root.add(carriageGroup);

    parts.carriage.forEach((m) => carriageGroup.add(m));
    parts.gearbox.forEach((m) => carriageGroup.add(m));

    const wheelSpinGroup = new THREE.Group();
    wheelSpinGroup.name = 'wheelSpinGroup';
    if (parts.wheel.length) {
      wheelSpinGroup.position.copy(parts.wheel[0].position);
      parts.wheel[0].position.set(0, 0, 0);
      wheelSpinGroup.add(parts.wheel[0]);
    }
    carriageGroup.add(wheelSpinGroup);

    const fullBox = new THREE.Box3().setFromObject(root);
    const beautyBox = new THREE.Box3();
    parts.fixed.forEach((m) => beautyBox.union(new THREE.Box3().setFromObject(m)));
    parts.carriage.forEach((m) => beautyBox.union(new THREE.Box3().setFromObject(m)));

    s.root = root;
    s.carriageGroup = carriageGroup;
    s.wheelSpinGroup = wheelSpinGroup;
    s.hiddenInBeauty = [...parts.gearbox, wheelSpinGroup];
    s.unitsPerMm = 0.012;
    s.fullFrame = this.boxToFrame(fullBox);
    s.beautyFrame = this.boxToFrame(beautyBox);
    s.dirty = true;
  }

  rigSuspensionCad(s, root, model, unitsPerMm) {
    root.updateMatrixWorld(true);

    const carriageGroup = new THREE.Group();
    carriageGroup.name = 'carriageGroup';
    root.add(carriageGroup);

    // Identify Omni Wheel node (node 50) and Gearbox
    let omniWheelObj = null;
    let gearboxMesh = null;

    model.traverse((obj) => {
      const name = normName(obj.name);
      if (name.includes('omniwheel') && obj.children && obj.children.length > 5) {
        omniWheelObj = obj;
      }
      if (name.includes('gearbox') && obj.isMesh) {
        gearboxMesh = obj;
      }
    });

    // Create wheel spin group INSIDE omni wheel node
    // In node 50 local space, origin is hub center and local Z is the concentric gearbox shaft axis!
    let wheelSpinGroup = null;
    if (omniWheelObj) {
      wheelSpinGroup = new THREE.Group();
      wheelSpinGroup.name = 'wheelSpinGroup';
      omniWheelObj.add(wheelSpinGroup);

      // Re-parent all wheel children into wheelSpinGroup (EXCEPT the stationary gearbox)
      const kids = [...omniWheelObj.children];
      kids.forEach((child) => {
        if (child === wheelSpinGroup) return;
        const cName = normName(child.name);
        if (cName.includes('gearbox')) {
          // Gearbox stays stationary on carriage
          return;
        }
        wheelSpinGroup.attach(child);
      });
    }

    // Identify moving carriage plates and components:
    // Gearbox plate, rail carriages, carriage plate, bridge plates, standoff plate, screws 33-42
    const movingMeshes = [];
    const fixedMeshes = [];

    model.traverse((m) => {
      if (!m.isMesh) return;
      const n = normName(m.name);

      // Wheel components are handled by omniWheelObj
      if (n.includes('omniwheel') || (m.parent && normName(m.parent.name).includes('omniwheel'))) {
        return;
      }

      const isCarriagePart =
        n.includes('carriage') ||
        n.includes('gearboxplate') ||
        n.includes('bridgeplate') ||
        n.includes('standoffplate') ||
        n.includes('shockspacer2') ||
        (n.includes('socketheadscrew') && (n.includes('33') || n.includes('34') || n.includes('35') || n.includes('36') || n.includes('37') || n.includes('38') || n.includes('39') || n.includes('40') || n.includes('42'))) ||
        (n.includes('locknut') && n.includes('1'));

      if (isCarriagePart) {
        movingMeshes.push(m);
      } else {
        fixedMeshes.push(m);
      }
    });

    // Attach all moving plates to carriageGroup (preserves world position)
    movingMeshes.forEach((m) => carriageGroup.attach(m));
    if (omniWheelObj) {
      carriageGroup.attach(omniWheelObj);
    }

    // Compute bounding boxes for camera framing
    const fullBox = new THREE.Box3().setFromObject(root);
    const beautyBox = new THREE.Box3();
    fixedMeshes.forEach((m) => beautyBox.union(new THREE.Box3().setFromObject(m)));
    movingMeshes.forEach((m) => {
      if (m !== gearboxMesh) beautyBox.union(new THREE.Box3().setFromObject(m));
    });

    s.root = root;
    s.carriageGroup = carriageGroup;
    s.wheelSpinGroup = wheelSpinGroup;
    s.hiddenInBeauty = [omniWheelObj].filter(Boolean);
    s.unitsPerMm = unitsPerMm;
    s.fullFrame = this.boxToFrame(fullBox);
    s.beautyFrame = this.boxToFrame(beautyBox);
    s.dirty = true;
  }

  stepSuspension(s, dt) {
    const cfg = CAD_CONFIG.suspension;
    s.time += dt;

    // Wheel spin: ramp up while hovered, coast down when not
    const spinTarget = s.hovered ? cfg.wheelSpinRadPerSec : 0;
    const ramp = s.hovered ? 2.4 : 1.5;
    s.spin += (spinTarget - s.spin) * (1 - Math.exp(-ramp * dt));
    if (!s.hovered && Math.abs(s.spin) < 0.02) s.spin = 0;
    s.wheelAngle = (s.wheelAngle + s.spin * dt) % (Math.PI * 2);

    // Bumps: periodic upward displacement of carriage along linear rails
    if (s.hovered) {
      if (s.time >= s.nextBumpAt) {
        s.bumpTarget = this.rand(cfg.bump.minMm, cfg.bump.maxMm);
        s.bumpReleaseAt = s.time + cfg.bump.holdSec;
        s.nextBumpAt = s.time + this.rand(cfg.bump.minGapSec, cfg.bump.maxGapSec);
      }
    } else {
      s.bumpTarget = 0;
    }
    if (s.bumpTarget && s.time >= s.bumpReleaseAt) s.bumpTarget = 0;

    // Spring-damper displacement
    const w = 2 * Math.PI * cfg.bump.freqHz;
    const z = cfg.bump.damping;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acc = w * w * (s.bumpTarget - s.bumpY) - 2 * z * w * s.bumpV;
      s.bumpV += acc * h;
      s.bumpY += s.bumpV * h;
    }
    s.bumpY = THREE.MathUtils.clamp(s.bumpY, -4, cfg.bump.maxMm + 4);

    if (!s.hovered && !s.bumpTarget && Math.abs(s.bumpY) < 0.03 && Math.abs(s.bumpV) < 0.3) {
      s.bumpY = 0;
      s.bumpV = 0;
    }
  }

  renderSuspension() {
    const s = this.sheets.suspension;
    if (!s || !s.carriageGroup || !this.syncSize(s)) return;

    const now = performance.now();
    const dt = Math.min((now - s.last) / 1000, 0.05);
    s.last = now;

    this.stepSuspension(s, dt);

    const animating = s.hovered || s.spin !== 0 || s.bumpY !== 0 || s.bumpV !== 0 || s.bumpTarget !== 0;
    if (!animating && !s.dirty) return;
    s.dirty = animating;

    // Bump all carriage plates along the Y rail axis
    const axis = CAD_CONFIG.suspension.travelAxis;
    s.carriageGroup.position[axis] = s.bumpY * s.unitsPerMm;

    // Spin wheel concentrically around local Z axis of omni wheel hub
    if (s.wheelSpinGroup) {
      s.wheelSpinGroup.rotation.z = s.wheelAngle;
    }

    const r = s.renderer;
    this.clearCanvas(s);

    // LEFT HALF: Full animated assembly (fills left half of sheet)
    const rm = this.pxRect(VIEWS.main, s.w, s.h);
    this.useRect(r, rm);
    this.frameCamera(s.camMain, s.fullFrame.center, SUSP_MAIN_DIR, s.fullFrame.size, rm.w / rm.h, 1.05);
    r.render(s.scene, s.camMain);

    // TOP RIGHT: Static beauty shot without wheel / gearbox
    const rb = this.pxRect(VIEWS.right, s.w, s.h);
    this.useRect(r, rb);
    this.frameCamera(s.camBeauty, s.beautyFrame.center, SUSP_BEAUTY_DIR, s.beautyFrame.size, rb.w / rb.h, 1.05);

    const savedPos = s.carriageGroup.position.clone();
    s.carriageGroup.position.set(0, 0, 0);
    s.hiddenInBeauty.forEach((obj) => { obj.visible = false; });

    r.render(s.scene, s.camBeauty);

    s.hiddenInBeauty.forEach((obj) => { obj.visible = true; });
    s.carriageGroup.position.copy(savedPos);

    r.setScissorTest(false);
  }

  // ------------------------------------------------------------------------
  // SHEET 2: 2026 HERO MK1 & EI TENSIONER
  //   Left half : Exploding view of the EI Tensioner Assembly (on hover)
  //   Right side: Static beauty shot of full Hero Mk1 Assembly
  //   Both scaled to fill most of each page, with floating components removed
  // ------------------------------------------------------------------------
  initHeroSheet() {
    const canvas = document.getElementById('canvasHero3D');
    const badge = document.getElementById('badgeHero');
    const sheetEl = document.getElementById('sheetHero');
    if (!canvas || !sheetEl) return;

    const renderer = this.createRenderer(canvas);
    const scene = this.createLitScene();

    const s = {
      canvas, renderer, scene,
      camTens: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      camBeauty: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      w: 0, h: 0, dirty: true,
      hovered: false,
      explode: 0, target: 0,
      tensGroup: null, tensLayers: [],
      tensFrameRest: null, tensFrameExploded: null,
      heroGroup: null, heroFrame: null
    };
    this.sheets.hero = s;

    // Procedural baseline so canvases are NEVER blank
    const baselineTens = this.createProceduralTensionerLayers();
    scene.add(baselineTens.root);
    s.tensGroup = baselineTens.root;
    s.tensLayers = baselineTens.layers;
    this.measureTensionerFrames(s, baselineTens.root);

    const baselineHero = this.createProceduralHeroBeauty();
    baselineHero.position.set(HERO_BEAUTY_X, 0, 0);
    scene.add(baselineHero);
    s.heroGroup = baselineHero;
    s.heroFrame = this.boxToFrame(new THREE.Box3().setFromObject(baselineHero));

    sheetEl.addEventListener('mouseenter', () => {
      s.hovered = true;
      s.target = 1.0; // explode EI tensioner on hover
    });
    sheetEl.addEventListener('mouseleave', () => {
      s.hovered = false;
      s.target = 0.0; // collapse back together
    });

    // 1) Load EI Tensioner GLB (Left Half — Exploded View)
    const tensionerGlbUrl = encodeURI('Hero_Mk1_TurretBase_EITensioner (1).glb');
    this.loader.load(
      tensionerGlbUrl,
      (gltf) => {
        try {
          const model = gltf.scene;
          this.applyCadMaterial(model);

          // Filter out detached/floating components from the tensioner scene
          this.filterFloatingTensionerParts(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          // Scale and center tensioner
          const scale = 2.4 / maxDim;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const tensRoot = new THREE.Group();
          tensRoot.add(model);
          scene.remove(s.tensGroup);
          scene.add(tensRoot);
          tensRoot.updateMatrixWorld(true);

          s.tensGroup = tensRoot;
          s.tensLayers = this.groupTensionerLayers(model, tensRoot);
          this.measureTensionerFrames(s, tensRoot);

          s.dirty = true;
          if (badge) badge.classList.add('loaded');
        } catch (e) {
          console.warn('EI Tensioner setup fallback:', e);
          if (badge) badge.classList.add('loaded');
        }
      },
      undefined,
      () => { if (badge) badge.classList.add('loaded'); }
    );

    // 2) Load Hero Mk1 GLB (Right Side — Static Beauty Shot)
    const heroGlbUrl = encodeURI('Hero_Mk1 (1).glb');
    this.loader.load(
      heroGlbUrl,
      (gltf) => {
        try {
          const model = gltf.scene;
          this.applyCadMaterial(model);

          // Filter floating parts from Hero full assembly
          this.filterFloatingHeroParts(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          // Scale and center on HERO_BEAUTY_X
          const scale = 2.5 / maxDim;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const heroRoot = new THREE.Group();
          heroRoot.position.set(HERO_BEAUTY_X, 0, 0);
          heroRoot.add(model);

          scene.remove(s.heroGroup);
          scene.add(heroRoot);
          heroRoot.updateMatrixWorld(true);

          s.heroGroup = heroRoot;
          s.heroFrame = this.boxToFrame(new THREE.Box3().setFromObject(heroRoot));
          s.dirty = true;
        } catch (e) {
          console.warn('Hero static beauty model setup fallback:', e);
        }
      },
      undefined,
      () => {}
    );
  }

  // Removes detached/floating components from the EI Tensioner model
  filterFloatingTensionerParts(model) {
    const floatingKeywords = [
      'tube2', 'verticalsupport', '8mminsert', 'c620', 'oled',
      'supporttubeattachment', 'encodercover', 'covermount', 'topramp'
    ];

    model.traverse((child) => {
      if (!child.isMesh) return;
      const n = normName(child.name);
      for (const kw of floatingKeywords) {
        if (n.includes(kw)) {
          child.visible = false;
          break;
        }
      }
    });
  }

  // Removes detached/floating components from the Hero Mk1 model
  filterFloatingHeroParts(model) {
    const floatingKeywords = [
      'c6203', 'c6204', 'oledbuttonboard', 'supporttubeattachment', 'toprampcfr'
    ];

    model.traverse((child) => {
      if (!child.isMesh) return;
      const n = normName(child.name);
      for (const kw of floatingKeywords) {
        if (n.includes(kw)) {
          child.visible = false;
          break;
        }
      }
    });
  }

  // Groups the EI Tensioner components into vertically stacked layers for the exploded view
  groupTensionerLayers(model, tensRoot) {
    tensRoot.updateMatrixWorld(true);

    const layerDefs = [
      { name: 'Layer 1: Motor & Drive Hub', offset: -0.65, keywords: ['rm3508', 'drivingpulley', 'hub2'] },
      { name: 'Layer 2: Bottom Plate & Belt', offset: -0.32, keywords: ['bottomplate', 'nutplate', 'belt', 'flanged'] },
      { name: 'Layer 3: Main Bearing & Driven Pulley', offset: 0.0, keywords: ['bearing', 'drivenpulley', 'innerbearing'] },
      { name: 'Layer 4: Sandwich & Spacer Plates', offset: 0.32, keywords: ['sandwhich', 'sandwich', 'spacerplate'] },
      { name: 'Layer 5: Top Plate & Encoder', offset: 0.65, keywords: ['topplate', 'encoder', 'amlamprey'] }
    ];

    const layers = layerDefs.map((def) => {
      const grp = new THREE.Group();
      grp.name = def.name;
      tensRoot.add(grp);
      return { name: def.name, group: grp, offset: def.offset, keywords: def.keywords, meshes: [] };
    });

    model.traverse((child) => {
      if (!child.isMesh || !child.visible) return;
      const n = normName(child.name);

      let matchedLayer = layers[2]; // default to center layer
      for (const l of layers) {
        if (l.keywords.some((kw) => n.includes(kw))) {
          matchedLayer = l;
          break;
        }
      }
      matchedLayer.meshes.push(child);
    });

    layers.forEach((l) => {
      l.meshes.forEach((m) => l.group.attach(m));
    });

    return layers;
  }

  measureTensionerFrames(s, tensRoot) {
    tensRoot.updateMatrixWorld(true);
    s.tensLayers.forEach((l) => l.group.position.set(0, 0, 0));
    tensRoot.updateMatrixWorld(true);
    s.tensFrameRest = this.boxToFrame(new THREE.Box3().setFromObject(tensRoot));

    const H = s.tensFrameRest.size.y || 1.2;
    s.tensLayers.forEach((l) => {
      l.group.position.y = l.offset * H * CAD_CONFIG.tensioner.explodeGap;
    });
    tensRoot.updateMatrixWorld(true);
    s.tensFrameExploded = this.boxToFrame(new THREE.Box3().setFromObject(tensRoot));

    s.tensLayers.forEach((l) => {
      l.group.position.y = l.offset * H * CAD_CONFIG.tensioner.explodeGap * s.explode;
    });
  }

  renderHero() {
    const s = this.sheets.hero;
    if (!s || !s.tensFrameRest || !s.heroFrame || !this.syncSize(s)) return;

    const prev = s.explode;
    s.explode = THREE.MathUtils.lerp(s.explode, s.target, 0.08);
    if (Math.abs(s.explode - s.target) < 0.0005) s.explode = s.target;

    if (s.explode === prev && !s.dirty) return;
    s.dirty = false;

    // Apply vertical explosion offset to EI Tensioner layers
    const H = s.tensFrameRest.size.y || 1.2;
    s.tensLayers.forEach((l) => {
      l.group.position.y = l.offset * H * CAD_CONFIG.tensioner.explodeGap * s.explode;
    });

    const r = s.renderer;
    this.clearCanvas(s);

    // LEFT HALF: Exploding EI Tensioner Assembly (fills left half of sheet)
    const rm = this.pxRect(VIEWS.main, s.w, s.h);
    this.useRect(r, rm);
    const size = s.tensFrameRest.size.clone().lerp(s.tensFrameExploded.size, s.explode);
    const center = s.tensFrameRest.center.clone().lerp(s.tensFrameExploded.center, s.explode);
    this.frameCamera(s.camTens, center, HERO_TENSIONER_DIR, size, rm.w / rm.h, 1.05);
    r.render(s.scene, s.camTens);

    // RIGHT SIDE: Static beauty shot of full Hero Mk1 Assembly
    const rb = this.pxRect(VIEWS.right, s.w, s.h);
    this.useRect(r, rb);
    this.frameCamera(s.camBeauty, s.heroFrame.center, HERO_BEAUTY_DIR, s.heroFrame.size, rb.w / rb.h, 1.05);
    r.render(s.scene, s.camBeauty);

    r.setScissorTest(false);
  }

  // ------------------------------------------------------------------------
  // MAIN RENDER LOOP
  // ------------------------------------------------------------------------
  startLoop() {
    const loop = () => {
      try {
        this.renderSuspension();
        this.renderHero();
      } catch (e) {
        console.warn('Render loop note:', e);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
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
