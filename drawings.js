/* ==========================================================================
   GAVIN HIGGINS — CAD DRAWINGS & THREE.JS ENGINE
   - Hero sheet:        LEFT HALF  = Full Hero Mk1 Subsystem Assembly
                                      (Assembled at rest [Pic 3] -> Exploded on hover [Pic 2])
                        RIGHT SIDE = Static beauty shot of TurretBase (TurretBaseRender.glb)
   - Suspension sheet:  LEFT HALF  = Full assembly (wheel + hub bolts spin concentric with gearbox,
                                      carriage & rail plates bump 10-20mm, slowly rotates 1 rad/s on Y)
                        TOP RIGHT  = Static beauty shot showing the full assembly at rest
   - Floating components completely removed
   - Scaled & tightly framed to fill each half of the sheets
   - Flat white shading with crisp black feature edges (SolidWorks style)
   - Fast loading with optimized render GLBs
   ========================================================================== */

// ==========================================================================
// 0. CONFIG
// ==========================================================================
const CAD_CONFIG = {
  hero: {
    // Vertical explosion offsets for the 5 subsystems (matching Picture 2)
    offsets: {
      firing:   0.10,
      neck:     0.05,
      turret:   0.00,
      feeding: -0.07,
      chassis: -0.14
    }
  },

  suspension: {
    travelAxis: 'y',            // rails run along Y axis
    nativeUnitMm: null,         // null = auto-detect
    wheelSpinRadPerSec: 16,     // wheel spin speed while hovered
    yawRateRadPerSec: 1.0,      // slow rotation about vertical axis while hovered (1 rad/s)
    bump: {
      minMm: 10, maxMm: 20,     // bump travel range
      minGapSec: 0.8, maxGapSec: 2.2,
      holdSec: 0.12,
      freqHz: 4.0, damping: 0.65 // spring-back damping
    }
  }
};

// Viewport layout inside each canvas (fractions of canvas, origin bottom-left)
const VIEWS = {
  main:     { x: 0.02, y: 0.03, w: 0.48, h: 0.94 }, // left half, full height
  topRight: { x: 0.52, y: 0.28, w: 0.46, h: 0.69 }  // upper right, cleanly above title block
};

// Camera directions
const HERO_MAIN_DIR   = new THREE.Vector3(0.72, 0.42, 0.90);
const TURRET_BASE_DIR = new THREE.Vector3(0.85, 0.58, 0.92);
const SUSP_MAIN_DIR   = new THREE.Vector3(0.92, 0.46, 1.0);
const SUSP_BEAUTY_DIR = new THREE.Vector3(-0.85, 0.45, 1.0);

const TURRET_SCENE_X = 200; // TurretBase lives off to the side in the hero scene

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
      console.warn('Draco setup note:', e);
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

  frameCamera(cam, center, dir, size, aspect, margin = 1.05) {
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
      if (child.isMesh && child.visible) {
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

    add('fixed', new THREE.BoxGeometry(1.8, 0.22, 1.2), V(0, -0.95, 0));
    add('fixed', new THREE.BoxGeometry(0.18, 1.7, 0.22), V(-0.55, -0.05, 0));
    add('fixed', new THREE.BoxGeometry(0.18, 1.7, 0.22), V(0.55, -0.05, 0));
    add('fixed', new THREE.CylinderGeometry(0.14, 0.14, 1.0, 16), V(0, 0.1, -0.35));

    add('carriage', new THREE.BoxGeometry(1.6, 0.3, 0.5), V(0, 0.0, 0));
    add('carriage', new THREE.BoxGeometry(1.2, 0.15, 0.6), V(0, -0.15, 0.2));
    add('gearbox', new THREE.BoxGeometry(0.5, 0.5, 0.4), V(0, -0.2, 0.5));
    add('wheel', new THREE.CylinderGeometry(0.55, 0.55, 0.22, 32), V(0, -0.2, 0.9), [0, 0, Math.PI / 2]);

    return { root, parts };
  }

  createProceduralHeroSubsystems() {
    const root = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const subsystems = [];

    const makeSub = (key, geomDefs, baseY, offsetMult) => {
      const g = new THREE.Group();
      g.position.y = baseY;
      geomDefs.forEach(([geom, pos, rot]) => g.add(this.makeBaselineMesh(geom, pos, rot)));
      root.add(g);
      subsystems.push({ key, group: g, baseY, offsetMult });
    };

    // 5 Subsystems matching Picture 2 & 3
    makeSub('chassis', [
      [new THREE.CylinderGeometry(1.4, 1.5, 0.3, 32), V(0, -0.85, 0)],
      [new THREE.BoxGeometry(0.35, 0.3, 1.4), V(1.2, -0.85, 0)],
      [new THREE.BoxGeometry(0.35, 0.3, 1.4), V(-1.2, -0.85, 0)]
    ], 0, -0.35);

    makeSub('feeding', [
      [new THREE.CylinderGeometry(0.65, 0.65, 0.6, 24), V(0, -0.35, 0)],
      [new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12), V(0.4, -0.3, 0.3)]
    ], 0, -0.10);

    makeSub('turret', [
      [new THREE.CylinderGeometry(1.15, 1.15, 0.2, 28), V(0, -0.15, 0)],
      [new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), V(0.65, -0.35, 0.45)],
      [new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), V(-0.65, -0.35, -0.45)]
    ], 0, 0.18);

    makeSub('neck', [
      [new THREE.BoxGeometry(0.28, 0.9, 0.75), V(-0.6, 0.25, 0)],
      [new THREE.BoxGeometry(0.28, 0.9, 0.75), V(0.6, 0.25, 0)]
    ], 0, 0.42);

    makeSub('firing', [
      [new THREE.BoxGeometry(1.05, 0.5, 1.3), V(0, 0.7, 0)],
      [new THREE.CylinderGeometry(0.16, 0.16, 1.9, 16), V(0, 0.75, 0.8), [Math.PI / 2, 0, 0]]
    ], 0, 0.72);

    return { root, subsystems };
  }

  createProceduralTurretBase() {
    const root = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const add = (geom, pos, rot) => root.add(this.makeBaselineMesh(geom, pos, rot));

    add(new THREE.CylinderGeometry(1.15, 1.15, 0.22, 28), V(0, 0, 0));
    add(new THREE.BoxGeometry(1.4, 0.12, 0.9), V(0, 0.12, 0));
    add(new THREE.CylinderGeometry(0.38, 0.38, 0.55, 24), V(0.45, -0.28, 0));
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), V(0.65, -0.35, 0.45));
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), V(-0.65, -0.35, -0.45));
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), V(-0.65, -0.35, 0.45));
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 12), V(0.65, -0.35, -0.45));

    return root;
  }

  // ------------------------------------------------------------------------
  // SHEET 1: 2027 LINEAR SUSPENSION V3 ASSEMBLY
  //   Left half : Full animated assembly (wheel & hub bolts spin concentric with gearbox,
  //               carriage + plates bump 10-20mm, slowly rotates on Y axis at 1 rad/s)
  //   Top right : Static beauty shot showing the complete suspension assembly
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
      modelGroup: null, carriageGroup: null, wheelSpinGroup: null,
      unitsPerMm: 0.012,
      fullFrame: null,
      spin: 0, wheelAngle: 0, yaw: 0,
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
          group.name = 'suspensionModelGroup';
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

    s.modelGroup = root;
    s.carriageGroup = carriageGroup;
    s.wheelSpinGroup = wheelSpinGroup;
    s.unitsPerMm = 0.012;
    s.fullFrame = this.boxToFrame(new THREE.Box3().setFromObject(root));
    s.dirty = true;
  }

  rigSuspensionCad(s, root, model, unitsPerMm) {
    root.updateMatrixWorld(true);

    const node1 = model.children[0] || model;
    const carriageGroup = new THREE.Group();
    carriageGroup.name = 'carriageGroup';
    node1.add(carriageGroup);

    // Identify Omni Wheel node (node 50) and Gearbox
    let omniWheelObj = null;
    node1.children.forEach((child) => {
      const name = normName(child.name);
      if (name.includes('omniwheel') && child.children && child.children.length > 5) {
        omniWheelObj = child;
      }
    });
    if (!omniWheelObj) {
      model.traverse((obj) => {
        const name = normName(obj.name);
        if (name.includes('omniwheel') && obj.children && obj.children.length > 5) {
          omniWheelObj = obj;
        }
      });
    }

    // Inside omniWheelObj (Node 50), create wheelSpinGroup
    // In local space of omniWheelObj, Z is the concentric wheel axle
    let wheelSpinGroup = null;
    if (omniWheelObj) {
      wheelSpinGroup = new THREE.Group();
      wheelSpinGroup.name = 'wheelSpinGroup';
      omniWheelObj.add(wheelSpinGroup);

      // Move wheel components (rollers, spacers, plates, dowels) into wheelSpinGroup (EXCEPT stationary gearbox)
      const wheelKids = [...omniWheelObj.children].filter(
        (c) => c !== wheelSpinGroup && !normName(c.name).includes('gearbox')
      );
      wheelKids.forEach((child) => wheelSpinGroup.add(child));
    }

    // Moving carriage plates and hardware inside node1:
    // Gearbox plate, rail carriages, carriage plate, bridge plates, standoff plate, screws 33-40 & 42, shockspacer2, locknut3
    // Hub bolts that spin with wheel: Screws 1, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16
    const hubBoltIndices = new Set([1, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16]);
    const carriageBoltIndices = new Set([33, 34, 35, 36, 37, 38, 39, 40, 42]);

    const movingParts = [];
    const hubBolts = [];

    const candidates = [...node1.children];
    candidates.forEach((child) => {
      if (child === carriageGroup || child === omniWheelObj) return;
      const n = normName(child.name);

      const screwMatch = n.match(/socketheadscrewconfigured(\d+)/);
      if (screwMatch) {
        const idx = parseInt(screwMatch[1], 10);
        if (hubBoltIndices.has(idx)) {
          hubBolts.push(child);
          return;
        }
        if (carriageBoltIndices.has(idx)) {
          movingParts.push(child);
          return;
        }
      }

      if (n.includes('locknut') && n.includes('3')) {
        movingParts.push(child);
        return;
      }

      const isCarriagePart =
        n.includes('carriage') ||
        n.includes('gearboxplate') ||
        n.includes('bridgeplate') ||
        n.includes('standoffplate') ||
        n.includes('shockspacer2');

      if (isCarriagePart) {
        movingParts.push(child);
      }
    });

    // Add moving parts and omni wheel to carriageGroup
    movingParts.forEach((p) => carriageGroup.add(p));
    if (omniWheelObj) carriageGroup.add(omniWheelObj);

    // Update world matrices so hub bolts can be attached cleanly to wheelSpinGroup
    root.updateMatrixWorld(true);
    if (wheelSpinGroup) {
      hubBolts.forEach((b) => wheelSpinGroup.attach(b));
    }

    root.updateMatrixWorld(true);
    const fullBox = new THREE.Box3().setFromObject(root);

    s.modelGroup = root;
    s.carriageGroup = carriageGroup;
    s.wheelSpinGroup = wheelSpinGroup;
    s.unitsPerMm = 0.001; // 1mm = 0.001m in native CAD coordinates
    s.fullFrame = this.boxToFrame(fullBox);
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

    // Slowly rotate about vertical axis (Y-axis) while hovered (1 rad/s)
    if (s.hovered) {
      s.yaw += cfg.yawRateRadPerSec * dt;
    } else {
      // Smoothly return to 0 resting angle
      s.yaw = THREE.MathUtils.lerp(s.yaw, 0, 0.08);
      if (Math.abs(s.yaw) < 0.005) s.yaw = 0;
    }

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

    const animating = s.hovered || s.spin !== 0 || s.yaw !== 0 || s.bumpY !== 0 || s.bumpV !== 0 || s.bumpTarget !== 0;
    if (!animating && !s.dirty) return;
    s.dirty = animating;

    const r = s.renderer;
    this.clearCanvas(s);

    // LEFT HALF: Full animated assembly (wheel spins, carriage bumps)
    // Left view stays at resting Y angle (0)
    if (s.modelGroup) s.modelGroup.rotation.y = 0;
    if (s.carriageGroup) s.carriageGroup.position.y = s.bumpY * s.unitsPerMm;
    if (s.wheelSpinGroup) s.wheelSpinGroup.rotation.z = s.wheelAngle;

    const rm = this.pxRect(VIEWS.main, s.w, s.h);
    this.useRect(r, rm);
    this.frameCamera(s.camMain, s.fullFrame.center, SUSP_MAIN_DIR, s.fullFrame.size, rm.w / rm.h, 1.02);
    r.render(s.scene, s.camMain);

    // TOP RIGHT: Static carriage at rest, but rotates about vertical (Y) axis at 1 rad/s while hovered
    if (s.carriageGroup) s.carriageGroup.position.y = 0;
    if (s.wheelSpinGroup) s.wheelSpinGroup.rotation.z = 0;
    if (s.modelGroup) s.modelGroup.rotation.y = s.yaw;

    const rb = this.pxRect(VIEWS.topRight, s.w, s.h);
    this.useRect(r, rb);
    this.frameCamera(s.camBeauty, s.fullFrame.center, SUSP_BEAUTY_DIR, s.fullFrame.size, rb.w / rb.h, 1.02);
    r.render(s.scene, s.camBeauty);

    // Reset modelGroup rotation to 0 for next frame
    if (s.modelGroup) s.modelGroup.rotation.y = 0;

    r.setScissorTest(false);
  }

  // ------------------------------------------------------------------------
  // SHEET 2: 2026 HERO MK1 & TURRET BASE
  //   Left half : Full Hero Mk1 assembly (Assembled at rest [Pic 3] -> Exploded on hover [Pic 2])
  //   Right side: Static beauty shot of TurretBase (TurretBaseRender.glb)
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
      camMain: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      camTurret: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      w: 0, h: 0, dirty: true,
      hovered: false,
      explode: 0, target: 0,
      heroGroup: null, subsystems: [],
      heroFrameRest: null, heroFrameExploded: null,
      turretGroup: null, turretFrame: null,
      turretYaw: 0, last: performance.now()
    };
    this.sheets.hero = s;

    // Procedural baseline so canvases are NEVER blank
    const baselineHero = this.createProceduralHeroSubsystems();
    scene.add(baselineHero.root);
    s.heroGroup = baselineHero.root;
    s.subsystems = baselineHero.subsystems;
    this.measureHeroExplodedFrames(s, baselineHero.root);

    const baselineTurret = this.createProceduralTurretBase();
    baselineTurret.position.set(TURRET_SCENE_X, 0, 0);
    scene.add(baselineTurret);
    s.turretGroup = baselineTurret;
    s.turretFrame = this.boxToFrame(new THREE.Box3().setFromObject(baselineTurret));

    sheetEl.addEventListener('mouseenter', () => {
      s.hovered = true;
      s.target = 1.0; // explode into 5 subsystems on hover (Picture 2)
    });
    sheetEl.addEventListener('mouseleave', () => {
      s.hovered = false;
      s.target = 0.0; // collapse together at rest (Picture 3)
    });

    // 1) Load Full Hero Assembly (HeroRender (1).glb — 23.7 MB optimized)
    const heroGlbUrl = encodeURI('HeroRender (1).glb');
    this.loader.load(
      heroGlbUrl,
      (gltf) => {
        try {
          const model = gltf.scene;

          // Remove flyaway motors (e.g. 4x 3508 in firing system, GM6020, unconstrained parts)
          this.filterFloatingHeroParts(model);
          this.applyCadMaterial(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          // Scale and center model (bigger to fill left half of page)
          const scale = 3.3 / maxDim;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const heroRoot = new THREE.Group();
          heroRoot.name = 'heroRoot';
          heroRoot.add(model);
          scene.remove(s.heroGroup);
          scene.add(heroRoot);
          heroRoot.updateMatrixWorld(true);

          s.heroGroup = heroRoot;
          s.subsystems = this.identifyHeroSubsystems(model, scale);
          this.measureHeroExplodedFrames(s, heroRoot);

          s.dirty = true;
          if (badge) badge.classList.add('loaded');
        } catch (e) {
          console.warn('HeroRender GLB setup fallback:', e);
          if (badge) badge.classList.add('loaded');
        }
      },
      undefined,
      () => { if (badge) badge.classList.add('loaded'); }
    );

    // 2) Load Turret Base (TurretBaseRender.glb — 4.4 MB) for static shot on right
    const turretGlbUrl = encodeURI('TurretBaseRender.glb');
    this.loader.load(
      turretGlbUrl,
      (gltf) => {
        try {
          const model = gltf.scene;

          // Remove flyaway 3508 motor and detached components from TurretBase
          this.filterFloatingTurretParts(model);
          this.applyCadMaterial(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          // Scale and center TurretBase model (bigger to fill top right)
          const scale = 2.9 / maxDim;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const turretRoot = new THREE.Group();
          turretRoot.name = 'turretRoot';
          turretRoot.position.set(TURRET_SCENE_X, 0, 0);
          turretRoot.add(model);

          scene.remove(s.turretGroup);
          scene.add(turretRoot);
          turretRoot.updateMatrixWorld(true);

          s.turretGroup = turretRoot;
          s.turretFrame = this.boxToFrame(new THREE.Box3().setFromObject(turretRoot));
          s.dirty = true;
        } catch (e) {
          console.warn('TurretBaseRender setup fallback:', e);
        }
      },
      undefined,
      () => {}
    );
  }

  // Removes floating/flyaway motors (4x 3508 in firing system, GM6020, etc.) and unconstrained parts
  filterFloatingHeroParts(model) {
    const floatingKeywords = [
      '3508', 'robomaster', 'gm6020', '6020', 'unreverser', 'feedtube', 'slipringcover', 'configurablehtdbelt'
    ];

    model.traverse((child) => {
      const n = normName(child.name);
      for (const kw of floatingKeywords) {
        if (n.includes(kw)) {
          child.visible = false;
          child.traverse((c) => { c.visible = false; });
          break;
        }
      }
    });
  }

  // Removes floating/flyaway motors and detached components from TurretBase model
  filterFloatingTurretParts(model) {
    const floatingKeywords = [
      '3508', 'robomaster', 'configurablehtdbelt'
    ];

    model.traverse((child) => {
      const n = normName(child.name);
      for (const kw of floatingKeywords) {
        if (n.includes(kw)) {
          child.visible = false;
          child.traverse((c) => { c.visible = false; });
          break;
        }
      }
    });
  }

  // Identifies the 5 distinct subsystem nodes inside HeroRender (1).glb
  identifyHeroSubsystems(model, scale) {
    const subs = [];
    const cfg = CAD_CONFIG.hero.offsets;

    model.traverse((obj) => {
      const n = normName(obj.name);

      if (n === 'firingsystemrender') {
        subs.push({ name: 'firing', node: obj, baseY: obj.position.y, offset: cfg.firing * scale * 1.5 });
      } else if (n === 'neckrender') {
        subs.push({ name: 'neck', node: obj, baseY: obj.position.y, offset: cfg.neck * scale * 1.5 });
      } else if (n === 'turretbaserender') {
        subs.push({ name: 'turret', node: obj, baseY: obj.position.y, offset: cfg.turret * scale * 1.5 });
      } else if (n === 'feedingsystemrender') {
        subs.push({ name: 'feeding', node: obj, baseY: obj.position.y, offset: cfg.feeding * scale * 1.5 });
      } else if (n === 'chassisrender') {
        subs.push({ name: 'chassis', node: obj, baseY: obj.position.y, offset: cfg.chassis * scale * 1.5 });
      }
    });

    return subs;
  }

  measureHeroExplodedFrames(s, heroRoot) {
    heroRoot.updateMatrixWorld(true);

    // Rest frame (Picture 3)
    s.subsystems.forEach((sub) => {
      const obj = sub.node || sub.group;
      obj.position.y = sub.baseY;
    });
    heroRoot.updateMatrixWorld(true);
    s.heroFrameRest = this.boxToFrame(new THREE.Box3().setFromObject(heroRoot));

    // Exploded frame (Picture 2)
    s.subsystems.forEach((sub) => {
      const obj = sub.node || sub.group;
      const offset = (sub.offset !== undefined) ? sub.offset : (sub.offsetMult * 1.2);
      obj.position.y = sub.baseY + offset;
    });
    heroRoot.updateMatrixWorld(true);
    s.heroFrameExploded = this.boxToFrame(new THREE.Box3().setFromObject(heroRoot));

    // Restore to current explode value
    s.subsystems.forEach((sub) => {
      const obj = sub.node || sub.group;
      const offset = (sub.offset !== undefined) ? sub.offset : (sub.offsetMult * 1.2);
      obj.position.y = sub.baseY + offset * s.explode;
    });
  }

  renderHero() {
    const s = this.sheets.hero;
    if (!s || !s.heroFrameRest || !s.turretFrame || !this.syncSize(s)) return;

    const now = performance.now();
    const dt = Math.min((now - (s.last || now)) / 1000, 0.05);
    s.last = now;

    const prev = s.explode;
    s.explode = THREE.MathUtils.lerp(s.explode, s.target, 0.08);
    if (Math.abs(s.explode - s.target) < 0.0005) s.explode = s.target;

    // TurretBase rotates about vertical axis at 1 rad/s while hovered
    if (s.hovered) {
      s.turretYaw = (s.turretYaw + 1.0 * dt) % (Math.PI * 2);
    } else {
      s.turretYaw = THREE.MathUtils.lerp(s.turretYaw, 0, 0.08);
      if (Math.abs(s.turretYaw) < 0.005) s.turretYaw = 0;
    }
    if (s.turretGroup) {
      s.turretGroup.rotation.y = s.turretYaw;
    }

    const animating = s.hovered || s.explode !== s.target || s.turretYaw !== 0;
    if (!animating && s.explode === prev && !s.dirty) return;
    s.dirty = false;

    // Apply vertical explosion offset to the 5 subsystems (Picture 3 -> Picture 2)
    s.subsystems.forEach((sub) => {
      const obj = sub.node || sub.group;
      const offset = (sub.offset !== undefined) ? sub.offset : (sub.offsetMult * 1.2);
      obj.position.y = sub.baseY + offset * s.explode;
    });

    const r = s.renderer;
    this.clearCanvas(s);

    // LEFT HALF: Full Hero Assembly (assembled at rest -> exploded on hover, enlarged to fill)
    const rm = this.pxRect(VIEWS.main, s.w, s.h);
    this.useRect(r, rm);
    const size = s.heroFrameRest.size.clone().lerp(s.heroFrameExploded.size, s.explode);
    const center = s.heroFrameRest.center.clone().lerp(s.heroFrameExploded.center, s.explode);
    this.frameCamera(s.camMain, center, HERO_MAIN_DIR, size, rm.w / rm.h, 0.92);
    r.render(s.scene, s.camMain);

    // TOP RIGHT: TurretBase beauty shot (spins at 1 rad/s while hovered, enlarged above title block)
    const rb = this.pxRect(VIEWS.topRight, s.w, s.h);
    this.useRect(r, rb);
    this.frameCamera(s.camTurret, s.turretFrame.center, TURRET_BASE_DIR, s.turretFrame.size, rb.w / rb.h, 0.90);
    r.render(s.scene, s.camTurret);

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
