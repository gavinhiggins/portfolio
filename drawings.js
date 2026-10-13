/* ==========================================================================
   GAVIN HIGGINS — CAD DRAWINGS & THREE.JS ENGINE
   - Hero sheet:        LEFT HALF  = vertical exploded view (hover), by subsystem
                        TOP RIGHT  = static isometric of the EI tensioner
   - Suspension sheet:  LEFT HALF  = full assembly (hover: wheel spins up,
                                     carriage bumps 10-20 mm on the rails)
                        TOP RIGHT  = static beauty shot, no wheel / gearbox
   - Flat white shading with crisp black feature edges (SolidWorks style)
   - Procedural CAD baseline so canvases are NEVER blank while GLBs load
   - Safe Draco decompression & isolated PDF.js resume rendering
   ========================================================================== */

// ==========================================================================
// 0. CONFIG — tweak things here
// ==========================================================================
const CAD_CONFIG = {
  hero: {
    // --- Subsystem grouping for the exploded view -------------------------
    // Leave empty for automatic grouping (see groupHeroSubsystems). To pin the
    // grouping exactly, list subsystems with keywords. Keywords are matched
    // against part / assembly names in the GLB (case-insensitive, spaces and
    // underscores ignored, nearest name in the hierarchy wins). Open the
    // browser console after load: the engine prints every node name it found.
    //
    // EXAMPLE ONLY (names are guesses, replace with your real part names):
    // subsystems: [
    //   { name: 'Launcher',   keywords: ['launcher', 'flywheel', 'feeder', 'barrel'] },
    //   { name: 'Pitch arm',  keywords: ['pitch', 'linkage', 'arm'] },
    //   { name: 'Main frame', keywords: ['frame', 'tube', 'standoff', 'lattice'] },
    //   { name: 'Yaw drive',  keywords: ['yaw', 'tensioner', 'belt', 'bearing'] },
    //   { name: 'Chassis',    keywords: ['chassis', 'omni', 'wheel', 'battery', 'ring'] }
    // ],
    subsystems: [],

    minAutoGroups: 3,     // auto mode needs 3-14 top-level subassemblies,
    maxAutoGroups: 14,    // otherwise it falls back to vertical bands
    fallbackBands: 5,     // number of vertical bands in the fallback
    explodeGap: 0.30      // spacing between subsystems, as a fraction of model height
  },

  suspension: {
    // Names are matched the same way as above. Checked in this order, nearest
    // name in the hierarchy wins. Anything that matches nothing stays FIXED.
    parts: {
      fixed:    ['rail', 'mgnr', 'mgn9r'],
      wheel:    ['wheel', 'tire', 'tyre', 'omni', 'mecanum'],
      gearbox:  ['gearbox', 'reducer', 'planetary', 'motor'],
      carriage: ['carriage', 'mgn9h', 'slider', 'truck']
    },
    travelAxis: 'y',            // axis the rails run along ('x' | 'y' | 'z')
    nativeUnitMm: null,         // GLB units in mm (1 = mm, 1000 = meters). null = auto-detect
    wheelSpinRadPerSec: 16,     // top wheel speed while hovered
    bump: {
      minMm: 10, maxMm: 20,     // bump height range
      minGapSec: 0.8, maxGapSec: 2.2,  // random gap between bumps
      holdSec: 0.12,            // how long the "bump" pushes the carriage up
      freqHz: 4.0, damping: 0.65       // spring-back feel
    }
  }
};

// Viewport layout inside each canvas (fractions of canvas, origin bottom-left)
const VIEWS = {
  main:     { x: 0.02, y: 0.03, w: 0.48, h: 0.94 },  // left half, full height
  topRight: { x: 0.52, y: 0.30, w: 0.46, h: 0.67 }   // above the title block
};

// Camera directions (from the target toward the camera)
const HERO_MAIN_DIR       = new THREE.Vector3(0.62, 0.34, 1.0);
const HERO_TENSIONER_DIR  = new THREE.Vector3(1.0, 0.75, 1.0);
const SUSP_MAIN_DIR       = new THREE.Vector3(0.9, 0.5, 1.0);
const SUSP_BEAUTY_DIR     = new THREE.Vector3(-0.85, 0.45, 1.0);

const TENSIONER_X = 100;   // tensioner lives off to the side in the hero scene

const normName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
  // SHARED HELPERS
  // ------------------------------------------------------------------------
  createRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    return r;
  }

  createLitScene() {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d0cc, 1.3));

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight1.position.set(6, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-6, -6, -6);
    scene.add(dirLight2);

    return scene;
  }

  // Keeps the WebGL buffer matched to the CSS size. Returns false if hidden.
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
  // the viewport aspect, looking from direction `dir`.
  frameCamera(cam, center, dir, size, aspect, margin = 1.1) {
    const d = dir.clone().normalize();
    const elev = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    const rXZ = 0.5 * Math.hypot(size.x, size.z);
    const halfW = rXZ * margin;
    const halfH = (0.5 * size.y * Math.cos(elev) + rXZ * Math.abs(Math.sin(elev))) * margin;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5);
    const dist = Math.max(halfH / tanV, halfW / (tanV * aspect)) + rXZ * 0.6;

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

  // Unique node names under a model (printed so you can tune keywords)
  uniqueNames(model) {
    const names = new Set();
    model.traverse((c) => { if (c.name) names.add(c.name); });
    return [...names];
  }

  // Walks from a mesh up through its parents and returns the label of the
  // first category whose keywords match a node name (nearest name wins).
  classifyByName(mesh, root, categories) {
    let n = mesh;
    while (n) {
      const name = normName(n.name);
      if (name) {
        for (const [label, keywords] of categories) {
          if (keywords.some((k) => name.includes(normName(k)))) return label;
        }
      }
      if (n === root) break;
      n = n.parent;
    }
    return null;
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
  // PROCEDURAL CAD BASELINES (guarantee the drawings are never blank)
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

    // Fixed: base plate, dual MGN9H rails, spring
    add('fixed', new THREE.BoxGeometry(1.8, 0.22, 1.2), V(0, -0.95, 0));
    add('fixed', new THREE.BoxGeometry(0.18, 1.7, 0.22), V(-0.55, -0.05, 0));
    add('fixed', new THREE.BoxGeometry(0.18, 1.7, 0.22), V(0.55, -0.05, 0));
    add('fixed', new THREE.CylinderGeometry(0.14, 0.14, 1.0, 16), V(0, 0.1, -0.35));

    // Carriage assembly (moves along the rails)
    add('carriage', new THREE.BoxGeometry(1.6, 0.3, 0.5), V(0, 0.0, 0));
    add('gearbox', new THREE.BoxGeometry(0.5, 0.5, 0.4), V(0, -0.2, 0.5));
    add('wheel', new THREE.CylinderGeometry(0.55, 0.55, 0.22, 32), V(0, -0.2, 0.9), [0, 0, Math.PI / 2]);

    return { root, parts };
  }

  createHeroProceduralCad() {
    const root = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    const makeSub = (name, defs) => {
      const g = new THREE.Group();
      g.name = name;
      defs.forEach(([geom, pos]) => g.add(this.makeBaselineMesh(geom, pos)));
      root.add(g);
      return { name, group: g };
    };

    const subsystems = [
      makeSub('Chassis', [[new THREE.CylinderGeometry(1.4, 1.5, 0.3, 32), V(0, -0.9, 0)]]),
      makeSub('Yaw bearing', [[new THREE.CylinderGeometry(1.2, 1.2, 0.22, 28), V(0, -0.6, 0)]]),
      makeSub('Gimbal uprights', [
        [new THREE.BoxGeometry(0.3, 1.1, 0.8), V(-0.75, 0.05, 0)],
        [new THREE.BoxGeometry(0.3, 1.1, 0.8), V(0.75, 0.05, 0)]
      ]),
      makeSub('Launcher', [
        [new THREE.BoxGeometry(1.1, 0.55, 1.4), V(0, 0.7, 0)],
        [new THREE.CylinderGeometry(0.16, 0.16, 1.8, 16), V(0, 0.75, 0.8)]
      ])
    ];

    return { root, subsystems };
  }

  createTensionerProceduralCad() {
    const g = new THREE.Group();
    g.add(this.makeBaselineMesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 24), new THREE.Vector3(0, 0, 0)));
    g.add(this.makeBaselineMesh(new THREE.BoxGeometry(0.3, 0.2, 1.2), new THREE.Vector3(0, 0.25, 0.3)));
    return g;
  }

  // ------------------------------------------------------------------------
  // SHEET 1: 2027 LINEAR SUSPENSION V3 ASSEMBLY
  //   Left half : full assembly. Hover -> wheel ramps up, carriage bumps.
  //   Top right : static beauty shot without the wheel and gearbox.
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
      // rig (filled by rigSuspension)
      root: null, carriageGroup: null, wheelPivot: null, wheelAxis: 'z',
      gearboxMeshes: [], unitsPerMm: 0.012,
      fullFrame: null, beautyFrame: null,
      // motion state
      spin: 0, wheelAngle: 0,
      bumpY: 0, bumpV: 0, bumpTarget: 0, bumpReleaseAt: 0, nextBumpAt: 0
    };
    this.sheets.suspension = s;

    // Procedural baseline so the view is NEVER empty
    const baseline = this.createSuspensionProceduralCad();
    scene.add(baseline.root);
    this.rigSuspension(s, baseline.root, baseline.parts, 0.012);

    sheetEl.addEventListener('mouseenter', () => {
      s.hovered = true;
      s.nextBumpAt = s.time + 0.45;
    });
    sheetEl.addEventListener('mouseleave', () => {
      s.hovered = false;
    });

    // Load actual GLB in background
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

          const scale = 2.4 / nativeMax;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const group = new THREE.Group();
          group.add(model);
          scene.remove(baseline.root);
          scene.add(group);
          group.updateMatrixWorld(true);

          // Split the model into fixed / carriage / wheel / gearbox
          const parts = this.splitSuspensionParts(model);

          // Real-world mm -> scene units (GLB exports are usually meters)
          const mmPerNativeUnit = cfg.nativeUnitMm || (nativeMax > 20 ? 1 : 1000);
          const unitsPerMm = scale / mmPerNativeUnit;

          // Reset motion state, then build the rig
          s.spin = 0; s.wheelAngle = 0;
          s.bumpY = 0; s.bumpV = 0; s.bumpTarget = 0;
          this.rigSuspension(s, group, parts, unitsPerMm);

          if (badge) badge.classList.add('loaded');
        } catch (e) {
          console.warn('Suspension model setup failed:', e);
          if (badge) badge.classList.add('loaded');
        }
      },
      undefined,
      () => { if (badge) badge.classList.add('loaded'); }
    );
  }

  splitSuspensionParts(model) {
    const cfg = CAD_CONFIG.suspension.parts;
    const categories = [
      ['fixed', cfg.fixed],
      ['wheel', cfg.wheel],
      ['gearbox', cfg.gearbox],
      ['carriage', cfg.carriage]
    ];
    const parts = { fixed: [], carriage: [], wheel: [], gearbox: [] };

    model.traverse((m) => {
      if (!m.isMesh) return;
      const label = this.classifyByName(m, model, categories) || 'fixed';
      parts[label].push(m);
    });

    console.info('[Suspension] node names (use these to tune CAD_CONFIG.suspension.parts):', this.uniqueNames(model));
    console.info('[Suspension] parts per group:', {
      fixed: parts.fixed.length, carriage: parts.carriage.length,
      wheel: parts.wheel.length, gearbox: parts.gearbox.length
    });
    if (!parts.carriage.length && !parts.wheel.length && !parts.gearbox.length) {
      console.warn('[Suspension] Nothing matched the carriage / wheel / gearbox keywords, so nothing will move. Edit CAD_CONFIG.suspension.parts using the node names above.');
    }
    return parts;
  }

  // Builds the moving carriage group (carriage + gearbox + wheel), a spin pivot
  // for the wheel, and the camera frames for both views.
  rigSuspension(s, root, parts, unitsPerMm) {
    root.updateMatrixWorld(true);

    const carriageGroup = new THREE.Group();
    carriageGroup.name = 'carriage-assembly';
    root.add(carriageGroup);

    // Wheel spins about its thinnest bounding-box axis, around its center
    let wheelPivot = null;
    let wheelAxis = 'z';
    if (parts.wheel.length) {
      const wb = new THREE.Box3();
      parts.wheel.forEach((m) => wb.union(new THREE.Box3().setFromObject(m)));
      const c = wb.getCenter(new THREE.Vector3());
      const sz = wb.getSize(new THREE.Vector3());
      wheelAxis = (sz.x <= sz.y && sz.x <= sz.z) ? 'x' : (sz.y <= sz.z ? 'y' : 'z');

      wheelPivot = new THREE.Group();
      wheelPivot.name = 'wheel-pivot';
      wheelPivot.position.copy(c);
      carriageGroup.add(wheelPivot);
      parts.wheel.forEach((m) => wheelPivot.attach(m));
    }

    // attach() keeps each mesh's world transform while re-parenting
    parts.gearbox.forEach((m) => carriageGroup.attach(m));
    parts.carriage.forEach((m) => carriageGroup.attach(m));

    // Camera frames: full assembly, and one without the wheel + gearbox
    const hidden = new Set([...parts.wheel, ...parts.gearbox]);
    const all = [...parts.fixed, ...parts.carriage, ...parts.wheel, ...parts.gearbox];
    const fullBox = new THREE.Box3();
    const beautyBox = new THREE.Box3();
    all.forEach((m) => {
      const b = new THREE.Box3().setFromObject(m);
      fullBox.union(b);
      if (!hidden.has(m)) beautyBox.union(b);
    });

    s.root = root;
    s.carriageGroup = carriageGroup;
    s.wheelPivot = wheelPivot;
    s.wheelAxis = wheelAxis;
    s.gearboxMeshes = parts.gearbox;
    s.unitsPerMm = unitsPerMm;
    s.fullFrame = this.boxToFrame(fullBox);
    s.beautyFrame = this.boxToFrame(beautyBox);
    s.dirty = true;
  }

  stepSuspension(s, dt) {
    const cfg = CAD_CONFIG.suspension;
    s.time += dt;

    // Wheel: ramp up while hovered, coast back down when not
    const spinTarget = s.hovered ? cfg.wheelSpinRadPerSec : 0;
    const ramp = s.hovered ? 2.2 : 1.4;
    s.spin += (spinTarget - s.spin) * (1 - Math.exp(-ramp * dt));
    if (!s.hovered && Math.abs(s.spin) < 0.02) s.spin = 0;
    s.wheelAngle = (s.wheelAngle + s.spin * dt) % (Math.PI * 2);

    // Bumps: every so often, push the carriage up 10-20 mm, then let it spring back
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

    // Spring-damper chasing the target (mm), sub-stepped for stability
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
    s.dirty = animating; // one extra frame after settling to draw the final pose

    const axis = CAD_CONFIG.suspension.travelAxis;
    s.carriageGroup.position[axis] = s.bumpY * s.unitsPerMm;
    if (s.wheelPivot) s.wheelPivot.rotation[s.wheelAxis] = s.wheelAngle;

    const r = s.renderer;
    this.clearCanvas(s);

    // LEFT HALF: full assembly (animated)
    const rm = this.pxRect(VIEWS.main, s.w, s.h);
    this.useRect(r, rm);
    this.frameCamera(s.camMain, s.fullFrame.center, SUSP_MAIN_DIR, s.fullFrame.size, rm.w / rm.h);
    r.render(s.scene, s.camMain);

    // TOP RIGHT: static beauty shot (carriage at rest, no wheel, no gearbox)
    const rb = this.pxRect(VIEWS.topRight, s.w, s.h);
    this.useRect(r, rb);
    this.frameCamera(s.camBeauty, s.beautyFrame.center, SUSP_BEAUTY_DIR, s.beautyFrame.size, rb.w / rb.h);

    const savedPos = s.carriageGroup.position.clone();
    s.carriageGroup.position.set(0, 0, 0);
    if (s.wheelPivot) s.wheelPivot.visible = false;
    s.gearboxMeshes.forEach((m) => { m.visible = false; });

    r.render(s.scene, s.camBeauty);

    s.gearboxMeshes.forEach((m) => { m.visible = true; });
    if (s.wheelPivot) s.wheelPivot.visible = true;
    s.carriageGroup.position.copy(savedPos);

    r.setScissorTest(false);
  }

  // ------------------------------------------------------------------------
  // SHEET 2: 2026 HERO MK1 ASSEMBLY & EI TENSIONER
  //   Left half : full robot, explodes vertically BY SUBSYSTEM on hover.
  //   Top right : static isometric of the EI tensioner.
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
      camTens: new THREE.PerspectiveCamera(30, 1, 0.1, 1000),
      w: 0, h: 0, dirty: true,
      hovered: false,
      explode: 0, target: 0,
      subsystems: [], heroRoot: null,
      boundsRest: null, boundsExploded: null,
      tensionerGroup: null,
      tensFrame: {
        center: new THREE.Vector3(TENSIONER_X, 0, 0),
        size: new THREE.Vector3(1.8, 0.8, 1.8)
      }
    };
    this.sheets.hero = s;

    // Procedural baselines so the view is NEVER empty
    const baseline = this.createHeroProceduralCad();
    scene.add(baseline.root);
    s.heroRoot = baseline.root;
    this.setupHeroExplode(s, baseline.root, baseline.subsystems);

    const baselineTens = this.createTensionerProceduralCad();
    baselineTens.position.set(TENSIONER_X, 0, 0);
    scene.add(baselineTens);
    s.tensionerGroup = baselineTens;

    sheetEl.addEventListener('mouseenter', () => {
      s.hovered = true;
      s.target = 1.0; // vertical exploded view
    });
    sheetEl.addEventListener('mouseleave', () => {
      s.hovered = false;
      s.target = 0.0;
    });

    // Load actual Hero GLB in background
    const heroGlbUrl = encodeURI('Hero_Mk1 (1).glb');
    this.loader.load(
      heroGlbUrl,
      (gltf) => {
        try {
          const model = gltf.scene;
          this.applyCadMaterial(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          const scale = 2.5 / maxDim;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const heroGroup = new THREE.Group();
          heroGroup.add(model);
          scene.remove(baseline.root);
          scene.add(heroGroup);
          heroGroup.updateMatrixWorld(true);

          // Group the meshes by subsystem, then move each group as one unit
          const { mode, groups } = this.groupHeroSubsystems(model);
          console.info('[Hero] subsystem grouping mode:', mode,
            groups.map((g) => `${g.name}: ${g.meshes.length} meshes`));

          const subs = groups.map((g) => {
            const grp = new THREE.Group();
            grp.name = g.name;
            heroGroup.add(grp);
            g.meshes.forEach((m) => grp.attach(m)); // keeps world transform
            return { name: g.name, group: grp };
          });

          s.heroRoot = heroGroup;
          this.setupHeroExplode(s, heroGroup, subs);

          if (badge) badge.classList.add('loaded');
        } catch (e) {
          console.warn('Hero model setup failed:', e);
          if (badge) badge.classList.add('loaded');
        }
      },
      undefined,
      () => { if (badge) badge.classList.add('loaded'); }
    );

    // Load EI Tensioner GLB in background (static isometric, top right)
    const tensionerGlbUrl = encodeURI('Hero_Mk1_TurretBase_EITensioner (1).glb');
    this.loader.load(
      tensionerGlbUrl,
      (gltf) => {
        try {
          const model = gltf.scene;
          this.applyCadMaterial(model);

          const bbox = new THREE.Box3().setFromObject(model);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          const scale = 2.0 / maxDim;
          model.scale.setScalar(scale);
          model.position.copy(center).multiplyScalar(-scale);

          const tensGroup = new THREE.Group();
          tensGroup.position.set(TENSIONER_X, 0, 0);
          tensGroup.add(model);

          scene.remove(s.tensionerGroup);
          scene.add(tensGroup);
          s.tensionerGroup = tensGroup;
          s.tensFrame = {
            center: new THREE.Vector3(TENSIONER_X, 0, 0),
            size: size.clone().multiplyScalar(scale)
          };
          s.dirty = true;
        } catch (e) {
          console.warn('Tensioner model setup failed:', e);
        }
      },
      undefined,
      () => {}
    );
  }

  // Decides which meshes belong to which subsystem.
  //  1) CAD_CONFIG.hero.subsystems keywords, if you filled them in
  //  2) otherwise the top-level subassemblies of the GLB (3-14 of them)
  //  3) otherwise N vertical bands (fallback only, not true subsystems)
  groupHeroSubsystems(model) {
    const cfg = CAD_CONFIG.hero;
    const meshes = [];
    model.traverse((c) => { if (c.isMesh) meshes.push(c); });

    console.info('[Hero] node names (use these to fill CAD_CONFIG.hero.subsystems):', this.uniqueNames(model));

    // 1) Keyword groups
    if (cfg.subsystems.length) {
      const cats = cfg.subsystems.map((g) => [g.name, g.keywords]);
      const buckets = new Map();
      meshes.forEach((m) => {
        const label = this.classifyByName(m, model, cats) || 'Other';
        if (!buckets.has(label)) buckets.set(label, []);
        buckets.get(label).push(m);
      });
      return { mode: 'keywords', groups: [...buckets].map(([name, ms]) => ({ name, meshes: ms })) };
    }

    // 2) Top-level subassemblies
    let node = model;
    while (node.children.length === 1 && !node.children[0].isMesh) node = node.children[0];

    const collect = (n) => {
      const out = [];
      n.traverse((c) => { if (c.isMesh) out.push(c); });
      return out;
    };
    const kids = node.children
      .map((c) => ({ name: c.name || 'Subsystem', meshes: collect(c) }))
      .filter((g) => g.meshes.length);

    if (kids.length >= cfg.minAutoGroups && kids.length <= cfg.maxAutoGroups) {
      return { mode: 'subassemblies', groups: kids };
    }

    // 3) Vertical bands (fallback)
    const centers = meshes.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).y);
    let lo = Infinity, hi = -Infinity;
    centers.forEach((c) => { if (c < lo) lo = c; if (c > hi) hi = c; });
    const n = cfg.fallbackBands;
    const bands = Array.from({ length: n }, (_, i) => ({ name: `Band ${i + 1}`, meshes: [] }));
    meshes.forEach((m, i) => {
      const t = (centers[i] - lo) / ((hi - lo) || 1);
      bands[Math.min(n - 1, Math.floor(t * n))].meshes.push(m);
    });
    return { mode: 'vertical-bands', groups: bands.filter((b) => b.meshes.length) };
  }

  // Computes each subsystem's vertical offset and the camera bounds for the
  // collapsed and exploded states. Subsystems are stacked in order of their
  // height in the CAD and spread evenly about the middle along Y.
  setupHeroExplode(s, root, subs) {
    s.subsystems = subs;
    subs.forEach((sub) => sub.group.position.set(0, 0, 0));
    root.updateMatrixWorld(true);

    const H = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).y || 1;

    subs.forEach((sub) => {
      const b = new THREE.Box3().setFromObject(sub.group);
      sub.centerY = b.isEmpty() ? 0 : b.getCenter(new THREE.Vector3()).y;
    });

    const ordered = [...subs].sort((a, b) => a.centerY - b.centerY);
    const gap = H * CAD_CONFIG.hero.explodeGap;
    ordered.forEach((sub, i) => {
      sub.offset = (i - (ordered.length - 1) / 2) * gap;
    });

    const measure = (k) => {
      subs.forEach((sub) => { sub.group.position.y = sub.offset * k; });
      root.updateMatrixWorld(true);
      return this.boxToFrame(new THREE.Box3().setFromObject(root));
    };
    s.boundsRest = measure(0);
    s.boundsExploded = measure(1);

    subs.forEach((sub) => { sub.group.position.y = sub.offset * s.explode; });
    s.dirty = true;
  }

  renderHero() {
    const s = this.sheets.hero;
    if (!s || !s.boundsRest || !this.syncSize(s)) return;

    const prev = s.explode;
    s.explode = THREE.MathUtils.lerp(s.explode, s.target, 0.08);
    if (Math.abs(s.explode - s.target) < 0.0005) s.explode = s.target;

    if (s.explode === prev && !s.dirty) return;
    s.dirty = false;

    s.subsystems.forEach((sub) => { sub.group.position.y = sub.offset * s.explode; });

    const r = s.renderer;
    this.clearCanvas(s);

    // LEFT HALF: full robot, exploded by subsystem along the vertical axis.
    // The camera zooms out smoothly as it explodes so everything stays in frame.
    const rm = this.pxRect(VIEWS.main, s.w, s.h);
    this.useRect(r, rm);
    const size = s.boundsRest.size.clone().lerp(s.boundsExploded.size, s.explode);
    const center = s.boundsRest.center.clone().lerp(s.boundsExploded.center, s.explode);
    this.frameCamera(s.camMain, center, HERO_MAIN_DIR, size, rm.w / rm.h);
    r.render(s.scene, s.camMain);

    // TOP RIGHT: static isometric of the EI tensioner
    const rt = this.pxRect(VIEWS.topRight, s.w, s.h);
    this.useRect(r, rt);
    this.frameCamera(s.camTens, s.tensFrame.center, HERO_TENSIONER_DIR, s.tensFrame.size, rt.w / rt.h);
    r.render(s.scene, s.camTens);

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
        console.warn('Render loop error:', e);
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
