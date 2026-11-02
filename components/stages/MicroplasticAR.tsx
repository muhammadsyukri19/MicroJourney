'use client';
import { useEffect, useRef, useState } from 'react';

/** Tombol dan sesi WebXR: mikroplastik ditempatkan di permukaan nyata. Tampil hanya di HP yang mendukung. */
export default function MicroplasticAR() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigator.xr
      ?.isSessionSupported('immersive-ar')
      .then(setSupported)
      .catch(() => setSupported(false));
    return () => {
      sessionRef.current?.end().catch(() => {});
    };
  }, []);

  async function start() {
    setError('');
    let session: XRSession | null = null;
    try {
      // Sesi harus diminta langsung dari sentuhan, sebelum menunggu apa pun
      session = await navigator.xr!.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: overlayRef.current! },
      });
      sessionRef.current = session;
      setPlaced(false);
      setActive(true);

      const THREE = await import('three');
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(session);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.2));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(1, 3, 1);
      scene.add(sun);

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.07, 0.09, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x6bff8f }),
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Ukuran dibesarkan agar terlihat; mikroplastik asli jauh lebih kecil
      const count = 350;
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
      const cloud = new THREE.InstancedMesh(geometry, material, count);
      cloud.visible = false;
      cloud.frustumCulled = false;
      scene.add(cloud);
      const palette = [0xdff3ff, 0xfff0b8, 0xffffff, 0x8fd0ff].map(c => new THREE.Color(c));
      const items = Array.from({ length: count }, (_, i) => {
        cloud.setColorAt(i, palette[i % palette.length]);
        return {
          pos: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.03 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6),
          stretch: new THREE.Vector3(0.4 + Math.random() * 1.6, 0.15 + Math.random() * 0.5, 0.4 + Math.random()),
          size: 0.004 + Math.pow(Math.random(), 2) * 0.012,
          axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
          phase: Math.random() * Math.PI * 2,
        };
      });

      session.addEventListener('select', () => {
        if (!reticle.visible) return;
        cloud.position.setFromMatrixPosition(reticle.matrix);
        cloud.visible = true;
        setPlaced(true);
      });

      const viewer = await session.requestReferenceSpace('viewer');
      const hitSource = await session.requestHitTestSource!({ space: viewer });
      const dummy = new THREE.Object3D();

      renderer.setAnimationLoop((now, frame) => {
        const space = renderer.xr.getReferenceSpace();
        const hit = frame && space ? frame.getHitTestResults(hitSource!)[0]?.getPose(space) : undefined;
        reticle.visible = Boolean(hit);
        if (hit) reticle.matrix.fromArray(hit.transform.matrix);
        if (cloud.visible) {
          const t = now / 1000;
          items.forEach((m, i) => {
            dummy.position.set(
              m.pos.x + Math.sin(t * 0.5 + m.phase) * 0.015,
              m.pos.y + Math.sin(t * 0.7 + m.phase) * 0.02,
              m.pos.z,
            );
            dummy.setRotationFromAxisAngle(m.axis, t * 0.6 + m.phase);
            dummy.scale.copy(m.stretch).multiplyScalar(m.size);
            dummy.updateMatrix();
            cloud.setMatrixAt(i, dummy.matrix);
          });
          cloud.instanceMatrix.needsUpdate = true;
        }
        renderer.render(scene, camera);
      });

      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
        hitSource?.cancel();
        cloud.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        sessionRef.current = null;
        setActive(false);
      });
    } catch (err) {
      console.warn('Mode AR gagal dibuka:', err);
      session?.end().catch(() => {});
      sessionRef.current = null;
      setActive(false);
      setError('Mode AR belum bisa dibuka di HP ini.');
    }
  }

  return (
    <>
      {supported && (
        <button
          type="button"
          onClick={start}
          className="mt-2 w-full min-h-11 shrink-0 rounded-xl border-2 border-[#006e2f]/40 bg-[#e8f5e9] text-[#006e2f] text-sm font-bold flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-lg">view_in_ar</span>
          Lihat mikroplastik di ruanganmu
        </button>
      )}
      {error && <p className="mt-1 text-xs text-[#ba1a1a]">{error}</p>}

      {/* Lapisan petunjuk di atas kamera selama sesi AR */}
      <div ref={overlayRef} className={active ? 'fixed inset-0 z-[100] pointer-events-none' : 'hidden'}>
        <div className="absolute inset-x-4 top-6 rounded-xl bg-[#083b54]/90 px-3 py-2 text-center text-sm font-semibold text-white">
          {placed
            ? 'Inilah mikroplastik! Ukuran aslinya jauh lebih kecil. Coba lihat dari dekat.'
            : 'Arahkan HP ke lantai atau meja, lalu ketuk saat lingkaran hijau muncul.'}
        </div>
        <button
          type="button"
          onClick={() => sessionRef.current?.end()}
          onPointerDown={e => e.stopPropagation()}
          className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 min-h-12 rounded-xl bg-white px-6 font-bold text-[#083b54]"
        >
          Selesai
        </button>
      </div>
    </>
  );
}
