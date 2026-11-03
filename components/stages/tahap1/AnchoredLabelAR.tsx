'use client';
import { useEffect, useRef, type RefObject } from 'react';

type Box = [number, number, number, number];

interface AnchoredLabelARProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Kotak objek dalam koordinat video, diperbarui oleh loop deteksi. null bila objek hilang dari kamera */
  boxRef: RefObject<Box | null>;
  title: string;
  details: string[];
  instruction: string;
  /** Papan disembunyikan dan konfeti 3D meledak dari posisi benda */
  celebrate?: boolean;
  /** Dipanggil bila tampilan 3D tidak bisa dibuat, misalnya WebGL tidak didukung */
  onUnavailable?: () => void;
}

// Area layar yang tertutup header dan kartu bawah
const SAFE_TOP = 166;
const SAFE_BOTTOM = 250;
const SIDE_MARGIN = 12;
const FOLLOW_SPEED = 9;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Label dan balon instruksi 3D yang menempel pada benda di kamera: sampah plastik atau tempat sampah */
export default function AnchoredLabelAR({ videoRef, boxRef, title, details, instruction, celebrate = false, onUnavailable }: AnchoredLabelARProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const celebrateRef = useRef(celebrate);
  useEffect(() => {
    celebrateRef.current = celebrate;
  }, [celebrate]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      try {
        const THREE = await import('three');
        const host = hostRef.current;
        if (cancelled || !host) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(pixelRatio);
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x274b5e, 2.2));
        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(-200, 400, 500);
        scene.add(sun);

        // 1 satuan dunia = 1 px layar pada z = 0, dengan titik tengah layar sebagai pusat
        let viewW = 1;
        let viewH = 1;
        const resize = () => {
          viewW = host.clientWidth || 1;
          viewH = host.clientHeight || 1;
          renderer.setSize(viewW, viewH, false);
          camera.aspect = viewW / viewH;
          camera.position.z = viewH / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(host);

        const disposables: { dispose: () => void }[] = [];
        const track = <T extends { dispose: () => void }>(item: T) => {
          disposables.push(item);
          return item;
        };

        /** Papan 3D bertepi tebal dengan teks pada sisi depan */
        const makeBoard = (lines: { text: string; size: number; weight: number; color: string }[], width: number, sideColor: number) => {
          const pad = 14;
          const measure = document.createElement('canvas').getContext('2d')!;
          const wrapped = lines.flatMap(line => {
            measure.font = `${line.weight} ${line.size}px system-ui, sans-serif`;
            return wrapText(measure, line.text, width - pad * 2).map(text => ({ ...line, text }));
          });
          const height = pad * 2 + wrapped.reduce((sum, line) => sum + line.size * 1.3, 0);
          const radius = 14;

          const outline = new THREE.Shape();
          const hw = width / 2;
          const hh = height / 2;
          outline.moveTo(-hw + radius, -hh);
          outline.lineTo(hw - radius, -hh);
          outline.quadraticCurveTo(hw, -hh, hw, -hh + radius);
          outline.lineTo(hw, hh - radius);
          outline.quadraticCurveTo(hw, hh, hw - radius, hh);
          outline.lineTo(-hw + radius, hh);
          outline.quadraticCurveTo(-hw, hh, -hw, hh - radius);
          outline.lineTo(-hw, -hh + radius);
          outline.quadraticCurveTo(-hw, -hh, -hw + radius, -hh);

          const group = new THREE.Group();
          const body = new THREE.Mesh(
            track(new THREE.ExtrudeGeometry(outline, { depth: 10, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 2 })),
            track(new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.45 })),
          );
          body.position.z = -12;
          group.add(body);

          const scale = Math.min(window.devicePixelRatio || 1, 2) * 2;
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(width * scale);
          canvas.height = Math.ceil(height * scale);
          const ctx = canvas.getContext('2d')!;
          ctx.scale(scale, scale);
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.arcTo(width, 0, width, height, radius);
          ctx.arcTo(width, height, 0, height, radius);
          ctx.arcTo(0, height, 0, 0, radius);
          ctx.arcTo(0, 0, width, 0, radius);
          ctx.closePath();
          ctx.fillStyle = 'rgba(8, 59, 84, 0.96)';
          ctx.fill();
          ctx.textBaseline = 'top';
          let y = pad;
          for (const line of wrapped) {
            ctx.font = `${line.weight} ${line.size}px system-ui, sans-serif`;
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, pad, y);
            y += line.size * 1.3;
          }
          const texture = track(new THREE.CanvasTexture(canvas));
          texture.colorSpace = THREE.SRGBColorSpace;
          const face = new THREE.Mesh(
            track(new THREE.PlaneGeometry(width, height)),
            track(new THREE.MeshBasicMaterial({ map: texture, transparent: true })),
          );
          face.position.z = 1;
          group.add(face);
          return { group, height };
        };

        const boardWidth = Math.min(280, viewW - SIDE_MARGIN * 2);
        const label = makeBoard(
          [
            { text: title, size: 17, weight: 800, color: '#ffffff' },
            ...details.map(text => ({ text, size: 13, weight: 600, color: '#6bff8f' })),
          ],
          boardWidth,
          0x006591,
        );
        const balloon = makeBoard(
          [{ text: instruction, size: 15, weight: 800, color: '#ffe2b8' }],
          boardWidth,
          0xd27b22,
        );
        scene.add(label.group, balloon.group);

        const ringMaterial = track(new THREE.MeshBasicMaterial({ color: 0x6bff8f, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
        const ring = new THREE.Mesh(track(new THREE.TorusGeometry(1, 0.035, 10, 56)), ringMaterial);
        ring.rotation.x = THREE.MathUtils.degToRad(72);
        // Digambar lebih dulu supaya tulisan pada papan tidak pernah tertutup cincin
        ring.renderOrder = -1;
        scene.add(ring);

        const connectorMaterial = track(new THREE.MeshBasicMaterial({ color: 0x6bff8f }));
        const connector = new THREE.Mesh(track(new THREE.CylinderGeometry(1.5, 1.5, 1, 8)), connectorMaterial);
        scene.add(connector);

        // Konfeti perayaan: bentuk kecil berputar yang menyembur lalu jatuh
        const confettiCount = 180;
        const confettiGeometry = track(new THREE.TetrahedronGeometry(1, 0));
        const confettiMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }));
        const confetti = new THREE.InstancedMesh(confettiGeometry, confettiMaterial, confettiCount);
        track(confetti);
        confetti.frustumCulled = false;
        confetti.visible = false;
        scene.add(confetti);
        const palette = [0x6bff8f, 0xf0a345, 0x4fc3f7, 0xffffff, 0xffe082].map(color => new THREE.Color(color));
        const pieces = Array.from({ length: confettiCount }, (_, i) => {
          confetti.setColorAt(i, palette[i % palette.length]);
          const angle = Math.random() * Math.PI * 2;
          const speed = 160 + Math.random() * 520;
          return {
            velocity: new THREE.Vector3(Math.cos(angle) * speed * 0.75, 180 + Math.random() * 620, Math.sin(angle) * speed * 0.4),
            axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
            spin: 3 + Math.random() * 9,
            size: 5 + Math.random() * 8,
            position: new THREE.Vector3(),
          };
        });
        const dummy = new THREE.Object3D();
        let celebrationStart = 0;

        const clampX = (x: number, halfWidth: number) => Math.max(SIDE_MARGIN + halfWidth, Math.min(viewW - SIDE_MARGIN - halfWidth, x));
        const toWorldX = (x: number) => x - viewW / 2;
        const toWorldY = (y: number) => viewH / 2 - y;

        const smooth = { cx: 0, cy: 0, w: 0, h: 0, ready: false };
        let presence = 0;
        let last = performance.now();
        let raf = 0;

        const frame = (now: number) => {
          if (cancelled) return;
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          const time = now / 1000;
          const video = videoRef.current;
          const box = boxRef.current;

          let vx = 0;
          let vy = 0;
          if (video && box) {
            // Koordinat video ke layar, mengikuti cara object-cover memotong video
            const videoW = video.videoWidth || 640;
            const videoH = video.videoHeight || 480;
            const scale = Math.max(viewW / videoW, viewH / videoH);
            const offsetX = (viewW - videoW * scale) / 2;
            const offsetY = (viewH - videoH * scale) / 2;
            const targetW = box[2] * scale;
            const targetH = box[3] * scale;
            const targetX = box[0] * scale + offsetX + targetW / 2;
            const targetY = box[1] * scale + offsetY + targetH / 2;
            if (!smooth.ready) {
              Object.assign(smooth, { cx: targetX, cy: targetY, w: targetW, h: targetH, ready: true });
            }
            // Penghalusan agar label tidak bergetar mengikuti hasil deteksi
            const follow = 1 - Math.exp(-dt * FOLLOW_SPEED);
            vx = (targetX - smooth.cx) * follow;
            vy = (targetY - smooth.cy) * follow;
            smooth.cx += vx;
            smooth.cy += vy;
            smooth.w += (targetW - smooth.w) * follow;
            smooth.h += (targetH - smooth.h) * follow;
          }

          const celebrating = celebrateRef.current;
          presence += ((box && !celebrating ? 1 : 0) - presence) * (1 - Math.exp(-dt * 8));
          const visible = presence > 0.02 && smooth.ready;

          if (celebrating) {
            if (!celebrationStart) {
              celebrationStart = now;
              const originX = smooth.ready ? smooth.cx : viewW / 2;
              const originY = smooth.ready ? smooth.cy : viewH / 2;
              pieces.forEach(piece => piece.position.set(toWorldX(originX), toWorldY(originY), 40));
              confetti.visible = true;
            }
            pieces.forEach((piece, i) => {
              piece.velocity.y -= 900 * dt;
              piece.velocity.multiplyScalar(Math.exp(-0.5 * dt));
              piece.position.addScaledVector(piece.velocity, dt);
              dummy.position.copy(piece.position);
              dummy.setRotationFromAxisAngle(piece.axis, (now - celebrationStart) * 0.001 * piece.spin);
              dummy.scale.setScalar(piece.size);
              dummy.updateMatrix();
              confetti.setMatrixAt(i, dummy.matrix);
            });
            confetti.instanceMatrix.needsUpdate = true;
          }
          label.group.visible = balloon.group.visible = ring.visible = connector.visible = visible;

          if (visible) {
            const topOfObject = smooth.cy - smooth.h / 2;
            const bottomOfObject = smooth.cy + smooth.h / 2;
            const labelY = Math.max(SAFE_TOP + label.height / 2, topOfObject - label.height / 2 - 26);
            const labelX = clampX(smooth.cx, boardWidth / 2);
            const balloonY = Math.min(
              viewH - SAFE_BOTTOM - balloon.height / 2,
              Math.max(labelY + label.height / 2 + balloon.height / 2 + 10, bottomOfObject + balloon.height / 2 + 14),
            );
            const bob = Math.sin(time * 2.2) * 3;

            // Papan sedikit miring mengikuti arah gerak, supaya terasa melayang di ruang 3D
            const tiltY = THREE.MathUtils.clamp(vx * 0.045, -0.45, 0.45) + Math.sin(time * 0.9) * 0.06;
            const tiltX = THREE.MathUtils.clamp(vy * 0.045, -0.35, 0.35) + 0.04;
            const pop = presence * (1 + (1 - presence) * 0.15);

            label.group.position.set(toWorldX(labelX), toWorldY(labelY) + bob, 34);
            label.group.rotation.set(tiltX, tiltY, 0);
            label.group.scale.setScalar(pop);

            balloon.group.position.set(toWorldX(clampX(smooth.cx, boardWidth / 2)), toWorldY(balloonY) - bob, 24);
            balloon.group.rotation.set(tiltX, -tiltY, 0);
            balloon.group.scale.setScalar(pop);

            // Cincin mengelilingi dasar benda
            const pulse = 1 + Math.sin(time * 4) * 0.06;
            ring.position.set(toWorldX(smooth.cx), toWorldY(bottomOfObject - smooth.h * 0.04), 0);
            ring.scale.setScalar(Math.max(26, smooth.w * 0.56) * pulse * presence);
            ringMaterial.opacity = 0.9 * presence;

            // Garis penghubung dari papan ke benda
            const fromY = toWorldY(labelY + label.height / 2);
            const toY = toWorldY(Math.max(topOfObject, labelY + label.height / 2));
            const length = Math.max(1, fromY - toY);
            connector.position.set(toWorldX(smooth.cx), (fromY + toY) / 2, 10);
            connector.scale.set(presence, length, presence);
          }

          renderer.render(scene, camera);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        cleanup = () => {
          cancelAnimationFrame(raf);
          observer.disconnect();
          disposables.forEach(item => item.dispose());
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      } catch (err) {
        // Info tetap terbaca di kartu bawah bila WebGL tidak tersedia
        console.warn('Label AR tidak tersedia:', err);
        if (!cancelled) onUnavailable?.();
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [videoRef, boxRef, title, details, instruction, onUnavailable]);

  return <div ref={hostRef} className="absolute inset-0 z-[15] pointer-events-none" aria-hidden="true" />;
}
