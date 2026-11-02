'use client';
import { useEffect, useRef } from 'react';

type Vec3 = [number, number, number];
type Rgb = [number, number, number];

interface PlasticShape {
  height: number;
  /** Jari-jari pada ketinggian t (0 = dasar, 1 = puncak) */
  radius: (t: number) => number;
  /** Warna dan jenis material pada titik permukaan */
  surface: (u: number, t: number) => { color: Rgb; opaque: boolean };
  /** Geser titik permukaan, mis. untuk kantong yang kusut */
  warp?: (p: Vec3, u: number, t: number) => Vec3;
  tilt?: number;
  shardCount: number;
  thickness: number;
}

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const CLEAR_BLUE: Rgb = [0.72, 0.88, 1];
const CAP_BLUE: Rgb = [0.03, 0.34, 0.68];

const SHAPES: Record<string, PlasticShape> = {
  bottle: {
    height: 3.2,
    radius: t => {
      const base = smooth(0, 0.03, t) * 0.62;
      const shoulder = 0.62 - smooth(0.62, 0.84, t) * 0.38;
      const ribs = t > 0.08 && t < 0.3 ? 1 + 0.025 * Math.sin(t * 95) : 1;
      if (t > 0.91) return 0.28;
      return Math.min(base, shoulder) * ribs;
    },
    surface: (_, t) => {
      if (t > 0.91) return { color: CAP_BLUE, opaque: true };
      if (t > 0.36 && t < 0.54) {
        return { color: t > 0.41 && t < 0.49 ? [0.08, 0.42, 0.66] : [0.96, 0.97, 1], opaque: true };
      }
      return { color: CLEAR_BLUE, opaque: false };
    },
    shardCount: 78,
    thickness: 0.022,
  },
  cup: {
    height: 2.5,
    radius: t => smooth(0, 0.03, t) * (0.46 + t * 0.3) * (t > 0.95 ? 1.05 : 1),
    surface: (_, t) => ({ color: t > 0.95 ? [1, 0.82, 0.76] : [1, 0.88, 0.84], opaque: false }),
    shardCount: 58,
    thickness: 0.02,
  },
  bag: {
    height: 2.8,
    radius: t => smooth(0, 0.08, t) * (0.82 - 0.14 * t),
    surface: () => ({ color: [0.9, 0.78, 0.94], opaque: false }),
    warp: ([x, y, z], u, t) => {
      const fold = 1 + 0.13 * Math.sin(u * 37 + t * 9) + 0.08 * Math.sin(u * 13 - t * 21);
      return [x * fold, y + 0.06 * Math.sin(u * 29 + t * 17), z * fold * 0.55];
    },
    shardCount: 64,
    thickness: 0.006,
  },
  straw: {
    height: 3.3,
    radius: () => 0.11,
    surface: u => ({
      color: Math.sin(u * Math.PI * 8) > 0 ? [0.92, 0.2, 0.42] : [1, 0.86, 0.9],
      opaque: true,
    }),
    tilt: 0.3,
    shardCount: 34,
    thickness: 0.018,
  },
  jug: {
    height: 2.9,
    radius: t => {
      if (t > 0.88) return 0.3;
      return smooth(0, 0.04, t) * (0.76 - smooth(0.7, 0.88, t) * 0.44);
    },
    surface: (_, t) => (t > 0.88
      ? { color: [0.2, 0.55, 0.28], opaque: true }
      : { color: [0.9, 0.96, 0.9], opaque: true }),
    warp: ([x, y, z]) => [x, y, z * 0.82],
    shardCount: 70,
    thickness: 0.035,
  },
};

const COLS = 84;
const ROWS = 110;
// Sampai saat ini benda asli (SVG) yang tampil dan bergetar; setelahnya pecahan 3D mengambil alih
export const CRACK_END = 0.8;
// Kartu hasil muncul pada detik ini, sementara mikroplastik tetap melayang di belakangnya
const RESULT_AT = 4.6;

interface ShardData {
  positions: number[];
  normals: number[];
  colors: number[];
  center: Vec3;
  opaque: boolean;
}

/** Permukaan dibagi sel Voronoi bertepi acak, lalu tiap pecahan diberi ketebalan */
function buildShards(shape: PlasticShape): ShardData[] {
  const point = (u: number, t: number): Vec3 => {
    const angle = u * Math.PI * 2;
    const r = shape.radius(t);
    const p: Vec3 = [Math.cos(angle) * r, (t - 0.5) * shape.height, Math.sin(angle) * r];
    return shape.warp ? shape.warp(p, u, t) : p;
  };

  const grid: { p: Vec3; n: Vec3; u: number; t: number }[][] = [];
  for (let row = 0; row <= ROWS; row++) {
    const cells = [];
    for (let col = 0; col < COLS; col++) {
      const jitter = row === 0 || row === ROWS ? 0 : 0.35;
      const u = (col + (Math.random() - 0.5) * jitter) / COLS;
      const t = (row + (Math.random() - 0.5) * jitter) / ROWS;
      const p = point(u, t);
      const a = point(u + 0.004, t);
      const b = point(u, Math.min(1, t + 0.004));
      const c = point(u, Math.max(0, t - 0.004));
      const du: Vec3 = [a[0] - p[0], a[1] - p[1], a[2] - p[2]];
      const dt: Vec3 = [b[0] - c[0], b[1] - c[1], b[2] - c[2]];
      let n: Vec3 = [
        dt[1] * du[2] - dt[2] * du[1],
        dt[2] * du[0] - dt[0] * du[2],
        dt[0] * du[1] - dt[1] * du[0],
      ];
      const len = Math.hypot(...n) || 1;
      n = [n[0] / len, n[1] / len, n[2] / len];
      if (n[0] * p[0] + n[2] * p[2] < 0) n = [-n[0], -n[1], -n[2]];
      cells.push({ p, n, u, t });
    }
    grid.push(cells);
  }

  const seeds = Array.from({ length: shape.shardCount }, () => ({
    u: Math.random(),
    // Pecahan terkumpul agak rapat di dekat titik benturan pada tengah benda
    t: 0.5 + (Math.random() - 0.5) * (0.4 + 0.6 * Math.random()),
  }));
  const circumference = (Math.PI * 2 * 0.6) / shape.height;
  const nearestSeed = (u: number, t: number, skew: number) => {
    let best = 0;
    let bestDist = Infinity;
    seeds.forEach((s, i) => {
      const du = Math.min(Math.abs(u - s.u), 1 - Math.abs(u - s.u)) * circumference;
      const dist = du * du + (t - s.t) * (t - s.t) + skew;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  };

  type Vertex = { id: number; p: Vec3; n: Vec3; color: Rgb };
  const triangles = new Map<string, { tris: Vertex[][]; opaque: boolean }>();
  const vertexAt = (row: number, col: number, u: number, t: number): Vertex => {
    const cell = grid[row][col % COLS];
    return { id: row * COLS + (col % COLS), p: cell.p, n: cell.n, color: shape.surface(u, t).color };
  };
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const a = vertexAt(row, col, col / COLS, row / ROWS);
      const b = vertexAt(row, col + 1, col / COLS, row / ROWS);
      const c = vertexAt(row + 1, col + 1, col / COLS, row / ROWS);
      const d = vertexAt(row + 1, col, col / COLS, row / ROWS);
      for (const [tri, offset] of [[[a, b, c], 0.33], [[a, c, d], 0.66]] as [Vertex[], number][]) {
        const u = (col + offset) / COLS;
        const t = (row + offset) / ROWS;
        const opaque = shape.surface(u, t).opaque;
        // Tepi pecahan dibuat bergerigi dengan gangguan acak per segitiga
        const seed = nearestSeed(u, t, Math.random() * 0.00035);
        const key = `${seed}-${opaque ? 'o' : 'c'}`;
        if (!triangles.has(key)) triangles.set(key, { tris: [], opaque });
        triangles.get(key)!.tris.push(tri);
      }
    }
  }

  const fractureWhite: Rgb = [0.95, 0.97, 1];
  const shards: ShardData[] = [];
  triangles.forEach(({ tris, opaque }) => {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const push = (p: Vec3, n: Vec3, c: Rgb) => {
      positions.push(...p);
      normals.push(...n);
      colors.push(...c);
    };
    const inset = (v: Vertex): Vec3 => [
      v.p[0] - v.n[0] * shape.thickness,
      v.p[1] - v.n[1] * shape.thickness,
      v.p[2] - v.n[2] * shape.thickness,
    ];
    const edges = new Map<string, { a: Vertex; b: Vertex; count: number }>();
    for (const tri of tris) {
      for (const v of tri) push(v.p, v.n, v.color);
      for (const v of [tri[0], tri[2], tri[1]]) {
        push(inset(v), [-v.n[0], -v.n[1], -v.n[2]], v.color);
      }
      for (let i = 0; i < 3; i++) {
        const a = tri[i];
        const b = tri[(i + 1) % 3];
        const key = a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`;
        const edge = edges.get(key);
        if (edge) edge.count++;
        else edges.set(key, { a, b, count: 1 });
      }
    }
    // Sisi patahan memutih seperti plastik yang tertekuk sampai patah
    edges.forEach(({ a, b, count }) => {
      if (count !== 1) return;
      const ai = inset(a);
      const bi = inset(b);
      const e1: Vec3 = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]];
      const e2: Vec3 = [ai[0] - a.p[0], ai[1] - a.p[1], ai[2] - a.p[2]];
      const raw: Vec3 = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
      const len = Math.hypot(...raw) || 1;
      const n: Vec3 = [raw[0] / len, raw[1] / len, raw[2] / len];
      for (const [p] of [[a.p], [ai], [b.p], [b.p], [ai], [bi]] as [Vec3][]) push(p, n, fractureWhite);
    });

    let cx = 0;
    let cy = 0;
    let cz = 0;
    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
      cz += positions[i * 3 + 2];
    }
    cx /= count;
    cy /= count;
    cz /= count;
    for (let i = 0; i < count; i++) {
      positions[i * 3] -= cx;
      positions[i * 3 + 1] -= cy;
      positions[i * 3 + 2] -= cz;
    }
    shards.push({ positions, normals, colors, center: [cx, cy, cz], opaque });
  });
  return shards;
}

interface PlasticShatter3DProps {
  objectId: string;
  uvExposure: number;
  /** Frame pertama: suara dijadwalkan dari sini agar tetap pas walau HP lambat menyiapkan adegan */
  onStart: () => void;
  /** Saat pecahan menyembur: benda asli disembunyikan */
  onBurst: () => void;
  onDone: () => void;
  onUnavailable: () => void;
}

/** Pecahan menyembur dari benda asli, lalu terurai menjadi mikroplastik 3D yang melayang di air */
export default function PlasticShatter3D({ objectId, uvExposure, onStart, onBurst, onDone, onUnavailable }: PlasticShatter3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onStart, onBurst, onDone, onUnavailable });
  useEffect(() => {
    callbacks.current = { onStart, onBurst, onDone, onUnavailable };
  }, [onStart, onBurst, onDone, onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    let burst = false;
    let cleanup = () => {};
    const announceBurst = () => {
      if (burst || cancelled) return;
      burst = true;
      callbacks.current.onBurst();
    };
    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      announceBurst();
      callbacks.current.onDone();
    };
    // Pengaman bila tab tidak aktif atau HP terlalu lambat untuk menyelesaikan animasi
    const safety = window.setTimeout(finish, (RESULT_AT + 4) * 1000);

    (async () => {
      try {
        const [THREE, { RoomEnvironment }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
        ]);
        const host = hostRef.current;
        if (cancelled || !host) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.45;
        renderer.setClearColor(0x000000, 0);
        host.appendChild(renderer.domElement);
        renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = environment;

        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
        const resize = () => {
          const w = host.clientWidth || 1;
          const h = host.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(host);

        scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x3a86a8, 1.7));
        const sun = new THREE.DirectionalLight(0xfff4d6, 2.4);
        sun.position.set(-2, 5, 4);
        scene.add(sun);
        const rim = new THREE.DirectionalLight(0x7fd4ff, 1.4);
        rim.position.set(3, -1, -3);
        scene.add(rim);
        const flash = new THREE.PointLight(0xffffff, 0, 8);
        flash.position.set(0, 0, 1.6);
        scene.add(flash);

        const shape = SHAPES[objectId] ?? SHAPES.bottle;
        const group = new THREE.Group();
        group.rotation.z = shape.tilt ?? 0;
        scene.add(group);

        // Plastik yang lama terjemur menguning dan permukaannya kusam
        const aged = Math.min(1, uvExposure / 100);
        const tint = new THREE.Color(0xffffff).lerp(new THREE.Color(0xefd78f), aged * 0.85);
        const clear = new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          color: tint,
          transparent: true,
          opacity: 0.46,
          depthWrite: false,
          roughness: 0.08 + aged * 0.16,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.05 + aged * 0.15,
          envMapIntensity: 2.2,
          side: THREE.DoubleSide,
        });
        const solid = new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          color: tint,
          roughness: 0.42,
          clearcoat: 0.5,
          clearcoatRoughness: 0.3,
          envMapIntensity: 1.1,
          side: THREE.DoubleSide,
        });

        const pieces = buildShards(shape).map(data => {
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
          const mesh = new THREE.Mesh(geometry, data.opaque ? solid : clear);
          mesh.position.set(...data.center);
          group.add(mesh);
          mesh.visible = false;
          const home = new THREE.Vector3(...data.center);
          const dir = home.clone().add(new THREE.Vector3(0, 0, 0.01)).normalize();
          const power = 1.5 + Math.random() * 2.3;
          return {
            mesh,
            home,
            dir,
            velocity: dir.clone().multiplyScalar(power).add(new THREE.Vector3((Math.random() - 0.35) * 0.9, (Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 1.3)),
            spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
            spin: 2.5 + Math.random() * 7,
            shrinkAt: 1.5 + Math.random() * 1.1,
            sway: Math.random() * Math.PI * 2,
          };
        });

        // Mikroplastik dibuat dalam bentuk yang umum ditemukan di laut: serpihan, lembaran, serat, butiran
        const randomizedShape = (detail: number) => {
          const geometry = new THREE.IcosahedronGeometry(1, detail);
          const position = geometry.attributes.position;
          for (let i = 0; i < position.count; i++) {
            position.setXYZ(
              i,
              position.getX(i) * (0.65 + Math.random() * 0.7),
              position.getY(i) * (0.65 + Math.random() * 0.7),
              position.getZ(i) * (0.65 + Math.random() * 0.7),
            );
          }
          geometry.computeVertexNormals();
          return geometry;
        };
        const microKinds = [
          { name: 'serpihan', geometry: randomizedShape(0), count: 300, size: [0.018, 0.05], stretch: [1, 0.75, 0.32] },
          { name: 'lembaran', geometry: randomizedShape(0), count: 170, size: [0.024, 0.06], stretch: [1.15, 0.9, 0.06] },
          { name: 'serat', geometry: new THREE.CylinderGeometry(0.5, 0.42, 1, 5), count: 110, size: [0.05, 0.12], stretch: [0.09, 1, 0.09] },
          { name: 'butiran', geometry: new THREE.IcosahedronGeometry(1, 1), count: 60, size: [0.012, 0.028], stretch: [1, 1, 1] },
        ];
        const microMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xc4d6e4,
          roughness: 0.32,
          clearcoat: 1,
          clearcoatRoughness: 0.2,
          envMapIntensity: 1.7,
          side: THREE.DoubleSide,
        });
        const baseColor = new THREE.Color(...shape.surface(0.5, 0.2).color);
        const microPalette = [
          baseColor,
          baseColor.clone().lerp(new THREE.Color(0xfff0b8), 0.25 + aged * 0.55),
          new THREE.Color(0xf6fbff),
          new THREE.Color(...shape.surface(0.5, 0.97).color),
        ];
        const microGroups = microKinds.map(kind => {
          const mesh = new THREE.InstancedMesh(kind.geometry, microMaterial, kind.count);
          mesh.frustumCulled = false;
          group.add(mesh);
          const items = Array.from({ length: kind.count }, (_, i) => {
            mesh.setColorAt(i, microPalette[Math.floor(Math.random() * microPalette.length)]);
            // Sebagian besar lepas saat benturan, sisanya menyusul saat pecahan besar hancur
            const early = Math.random() < 0.55;
            return {
              source: Math.floor(Math.random() * pieces.length),
              emitAt: CRACK_END + (early ? Math.random() * 0.45 : 0.7 + Math.random() * 2),
              pos: new THREE.Vector3(),
              vel: new THREE.Vector3(),
              size: kind.size[0] + Math.pow(Math.random(), 1.8) * (kind.size[1] - kind.size[0]),
              axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
              spin: 0.5 + Math.random() * 3,
              sway: Math.random() * Math.PI * 2,
              alive: false,
            };
          });
          return { mesh, items, stretch: kind.stretch };
        });

        // Gelembung saat benturan
        const bubbleCount = 70;
        const bubbleGeometry = new THREE.SphereGeometry(1, 12, 10);
        const bubbleMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
          roughness: 0.03,
          clearcoat: 1,
          envMapIntensity: 2.4,
          depthWrite: false,
        });
        const bubbles = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, bubbleCount);
        bubbles.frustumCulled = false;
        scene.add(bubbles);
        const bubbleState = Array.from({ length: bubbleCount }, () => ({
          pos: new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.2),
          size: 0.012 + Math.pow(Math.random(), 2) * 0.06,
          rise: 0.5 + Math.random() * 1,
          delay: CRACK_END + Math.random() * 1.4,
          sway: Math.random() * Math.PI * 2,
        }));

        const dummy = new THREE.Object3D();
        const quat = new THREE.Quaternion();
        let time = 0;
        let last = performance.now();
        let raf = 0;

        // Ukuran benda 3D disamakan dengan benda asli di layar, agar pergantiannya tidak terasa
        const startDistance = shape.height / (2 * Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 0.92);
        const closeDistance = Math.max(2.4, startDistance * 0.6);

        const frame = (now: number) => {
          if (cancelled) return;
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          time += dt;
          if (time >= CRACK_END) announceBurst();

          // Setelah pecah, kamera perlahan mendekat agar mikroplastiknya terlihat jelas
          const kick = time > CRACK_END ? Math.exp(-(time - CRACK_END) * 7) * 0.05 : 0;
          camera.position.set(
            Math.sin(time * 37) * kick,
            Math.cos(time * 41) * kick,
            startDistance + (closeDistance - startDistance) * smooth(CRACK_END + 0.6, RESULT_AT + 1.5, time),
          );
          camera.lookAt(0, 0, 0);
          group.rotation.y = 0.25 + Math.max(0, time - CRACK_END) * 0.1;
          sun.position.x = -2 + Math.sin(time * 1.3) * 1.2;
          flash.intensity = time > CRACK_END ? Math.max(0, 40 * Math.exp(-(time - CRACK_END) * 9)) : 0;

          for (const piece of pieces) {
            if (time < CRACK_END) continue;
            // Di dalam air: gerak cepat segera teredam, lalu pecahan melayang pelan
            piece.velocity.multiplyScalar(Math.exp(-1.7 * dt));
            piece.velocity.y += 0.1 * dt;
            piece.mesh.position.addScaledVector(piece.velocity, dt);
            piece.mesh.position.x += Math.sin(time * 1.4 + piece.sway) * 0.0016;
            piece.spin *= Math.exp(-0.6 * dt);
            quat.setFromAxisAngle(piece.spinAxis, piece.spin * dt);
            piece.mesh.quaternion.premultiply(quat);
            const scale = 1 - smooth(piece.shrinkAt, piece.shrinkAt + 1.1, time);
            piece.mesh.scale.setScalar(Math.max(0.0001, scale));
            piece.mesh.visible = scale > 0.001;
          }

          for (const { mesh, items, stretch } of microGroups) {
            items.forEach((m, i) => {
              if (time >= m.emitAt && !m.alive) {
                m.alive = true;
                m.pos.copy(pieces[m.source].mesh.position);
                m.vel
                  .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
                  .multiplyScalar(0.4 + Math.random() * 1.2)
                  .addScaledVector(pieces[m.source].velocity, 0.6);
              }
              if (!m.alive) {
                dummy.scale.setScalar(0);
              } else {
                m.vel.multiplyScalar(Math.exp(-1.3 * dt));
                m.pos.addScaledVector(m.vel, dt);
                // Terombang-ambing pelan, tidak pernah benar-benar hilang
                dummy.position.set(
                  m.pos.x + Math.sin(time * 0.7 + m.sway) * 0.05,
                  m.pos.y + Math.cos(time * 0.55 + m.sway) * 0.05,
                  m.pos.z,
                );
                dummy.setRotationFromAxisAngle(m.axis, time * m.spin);
                const grow = m.size * smooth(m.emitAt, m.emitAt + 0.12, time);
                dummy.scale.set(grow * stretch[0], grow * stretch[1], grow * stretch[2]);
              }
              dummy.updateMatrix();
              mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
          }

          bubbleState.forEach((b, i) => {
            const age = time - b.delay;
            if (age <= 0) {
              dummy.scale.setScalar(0);
            } else {
              dummy.position.set(
                b.pos.x + Math.sin(age * 4 + b.sway) * 0.05,
                b.pos.y + age * b.rise,
                b.pos.z,
              );
              dummy.rotation.set(0, 0, 0);
              dummy.scale.setScalar(b.pos.y + age * b.rise > 3.4 ? 0 : b.size);
            }
            dummy.updateMatrix();
            bubbles.setMatrixAt(i, dummy.matrix);
          });
          bubbles.instanceMatrix.needsUpdate = true;

          renderer.render(scene, camera);

          if (time >= RESULT_AT) finish();
          raf = requestAnimationFrame(frame);
        };
        callbacks.current.onStart();
        raf = requestAnimationFrame(frame);

        cleanup = () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
          pieces.forEach(p => p.mesh.geometry.dispose());
          [clear, solid, microMaterial, bubbleMaterial].forEach(m => m.dispose());
          microGroups.forEach(g => g.mesh.dispose());
          microKinds.forEach(k => k.geometry.dispose());
          bubbleGeometry.dispose();
          bubbles.dispose();
          environment.dispose();
          pmrem.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (err) {
        console.warn('Animasi 3D tidak tersedia, memakai animasi 2D:', err);
        window.clearTimeout(safety);
        if (!cancelled) callbacks.current.onUnavailable();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      cleanup();
    };
  }, [objectId, uvExposure]);

  return <div ref={hostRef} className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true" />;
}
