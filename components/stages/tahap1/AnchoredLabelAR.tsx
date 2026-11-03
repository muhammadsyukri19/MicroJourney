'use client';
import { useEffect, useRef, type RefObject } from 'react';

type Box = [number, number, number, number];

interface AnchoredLabelARProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Kotak objek dalam koordinat video, diperbarui oleh loop deteksi. null bila objek hilang dari kamera */
  boxRef: RefObject<Box | null>;
  title: string;
  details: string[];
  /** Instruksi yang terbaring di permukaan, di depan benda */
  instruction: string;
  /** Isi lencana kode daur ulang; tanda tanya bila kodenya belum diketahui */
  recycleCode?: string;
  /** Papan disembunyikan dan konfeti 3D meledak dari posisi benda */
  celebrate?: boolean;
  /** Dipanggil bila tampilan 3D tidak bisa dibuat, misalnya WebGL tidak didukung */
  onUnavailable?: () => void;
}

// Area layar yang tertutup header dan tombol bawah
const SAFE_TOP = 166;
const SAFE_BOTTOM = 104;
const SIDE_MARGIN = 12;
// Kemiringan lantai atau meja terhadap layar saat kamera sedikit menunduk
const GROUND_TILT = (55 * Math.PI) / 180;
const GREEN = '#6bff8f';
const AMBER = '#f0a345';

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

/** Konten 3D yang menempel pada sampah di kamera: papan info, lencana kode, dan instruksi di permukaan */
export default function AnchoredLabelAR({
  videoRef,
  boxRef,
  title,
  details,
  instruction,
  recycleCode,
  celebrate = false,
  onUnavailable,
}: AnchoredLabelARProps) {
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
        const camera = new THREE.PerspectiveCamera(50, 1, 1, 6000);
        const hemisphere = new THREE.HemisphereLight(0xffffff, 0x274b5e, 2.2);
        const sun = new THREE.DirectionalLight(0xffffff, 1.8);
        sun.position.set(-200, 400, 500);
        scene.add(hemisphere, sun);

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

        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 64;
        const glowCtx = glowCanvas.getContext('2d')!;
        const glowGradient = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        glowGradient.addColorStop(0, 'rgba(255,255,255,1)');
        glowGradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
        glowCtx.fillStyle = glowGradient;
        glowCtx.fillRect(0, 0, 64, 64);
        const glowTexture = track(new THREE.CanvasTexture(glowCanvas));

        /** Papan kaca tembus pandang dengan tepi menyala, supaya kamera tetap terlihat di baliknya */
        const makeBoard = (lines: { text: string; size: number; weight: number; color: string }[], maxWidth: number, accent: string) => {
          const pad = 13;
          const measure = document.createElement('canvas').getContext('2d')!;
          const wrapped = lines.flatMap(line => {
            measure.font = `${line.weight} ${line.size}px system-ui, sans-serif`;
            return wrapText(measure, line.text, maxWidth - pad * 2).map(text => ({ ...line, text, width: measure.measureText(text).width }));
          });
          const width = Math.min(maxWidth, Math.ceil(Math.max(...wrapped.map(line => line.width))) + pad * 2);
          const height = pad * 2 + wrapped.reduce((sum, line) => sum + line.size * 1.3, 0);
          const radius = 12;

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
          const body = new THREE.Mesh(track(new THREE.ExtrudeGeometry(outline, { depth: 7, bevelEnabled: false })), [
            track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })),
            track(new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.55, roughness: 0.4 })),
          ]);
          body.position.z = -8;
          group.add(body);

          const scale = pixelRatio * 2;
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(width * scale);
          canvas.height = Math.ceil(height * scale);
          const ctx = canvas.getContext('2d')!;
          ctx.scale(scale, scale);
          const tracePanel = () => {
            const inset = 1.5;
            ctx.beginPath();
            ctx.moveTo(radius, inset);
            ctx.arcTo(width - inset, inset, width - inset, height - inset, radius);
            ctx.arcTo(width - inset, height - inset, inset, height - inset, radius);
            ctx.arcTo(inset, height - inset, inset, inset, radius);
            ctx.arcTo(inset, inset, width - inset, inset, radius);
            ctx.closePath();
          };
          const glass = ctx.createLinearGradient(0, 0, 0, height);
          glass.addColorStop(0, 'rgba(4, 38, 54, 0.84)');
          glass.addColorStop(1, 'rgba(4, 54, 66, 0.66)');
          tracePanel();
          ctx.fillStyle = glass;
          ctx.fill();
          ctx.save();
          tracePanel();
          ctx.clip();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
          for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
          ctx.restore();
          tracePanel();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = accent;
          ctx.shadowBlur = 5;
          ctx.stroke();
          ctx.shadowBlur = 0;
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
            track(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })),
          );
          face.position.z = 0.5;
          group.add(face);
          return { group, width, height };
        };

        const boardWidth = Math.min(280, viewW - SIDE_MARGIN * 2);
        const label = makeBoard(
          [
            { text: title, size: 17, weight: 800, color: '#ffffff' },
            ...details.map((text, i) => ({ text, size: 13, weight: 600, color: i === 0 ? GREEN : '#ffd08a' })),
          ],
          boardWidth,
          GREEN,
        );
        const decal = makeBoard([{ text: instruction, size: 19, weight: 800, color: '#fff1dc' }], boardWidth, AMBER);
        scene.add(label.group, decal.group);

        // Tali penghubung dari benda ke papan
        const lineMaterial = track(new THREE.MeshBasicMaterial({ color: GREEN }));
        const connector = new THREE.Mesh(track(new THREE.CylinderGeometry(1.1, 1.1, 1, 8)), lineMaterial);
        const anchorDot = new THREE.Mesh(track(new THREE.SphereGeometry(4.5, 12, 8)), lineMaterial);
        const anchorGlow = new THREE.Sprite(
          track(new THREE.SpriteMaterial({ map: glowTexture, color: GREEN, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })),
        );
        scene.add(connector, anchorDot, anchorGlow);

        // Lencana kode daur ulang: tiga panah melingkar dengan angka di tengah
        const arrow = new THREE.Shape();
        arrow.moveTo(-0.62, -0.66);
        arrow.lineTo(0.22, -0.66);
        arrow.lineTo(0.22, -0.86);
        arrow.lineTo(0.74, -0.5);
        arrow.lineTo(0.22, -0.14);
        arrow.lineTo(0.22, -0.34);
        arrow.lineTo(-0.4, -0.34);
        arrow.closePath();
        const arrowGeometry = track(
          new THREE.ExtrudeGeometry(arrow, { depth: 0.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }),
        );
        arrowGeometry.translate(0, 0, -0.1);
        const arrowMaterial = track(new THREE.MeshStandardMaterial({ color: GREEN, emissive: '#1f9d55', emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.15 }));
        const badge = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const part = new THREE.Mesh(arrowGeometry, arrowMaterial);
          part.rotation.z = (i * Math.PI * 2) / 3;
          badge.add(part);
        }
        const digitCanvas = document.createElement('canvas');
        digitCanvas.width = digitCanvas.height = 128;
        const digitCtx = digitCanvas.getContext('2d')!;
        digitCtx.font = '900 92px system-ui, sans-serif';
        digitCtx.textAlign = 'center';
        digitCtx.textBaseline = 'middle';
        digitCtx.lineWidth = 12;
        digitCtx.strokeStyle = 'rgba(4, 38, 54, 0.9)';
        digitCtx.strokeText(recycleCode ?? '?', 64, 68);
        digitCtx.fillStyle = '#ffffff';
        digitCtx.fillText(recycleCode ?? '?', 64, 68);
        const digitTexture = track(new THREE.CanvasTexture(digitCanvas));
        digitTexture.colorSpace = THREE.SRGBColorSpace;
        const digit = new THREE.Mesh(
          track(new THREE.PlaneGeometry(0.86, 0.86)),
          track(new THREE.MeshBasicMaterial({ map: digitTexture, transparent: true, depthWrite: false })),
        );
        digit.position.z = 0.16;
        badge.add(digit);
        scene.add(badge);

        // Konfeti perayaan: bentuk kecil berputar yang menyembur lalu jatuh
        const confettiCount = 180;
        const confetti = new THREE.InstancedMesh(
          track(new THREE.TetrahedronGeometry(1, 0)),
          track(new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 })),
          confettiCount,
        );
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

        // Cahaya benda 3D mengikuti warna dan terang kamera, supaya tampak berada di ruangan yang sama
        const probe = document.createElement('canvas');
        probe.width = probe.height = 8;
        const probeCtx = probe.getContext('2d', { willReadFrequently: true });
        const roomColor = new THREE.Color();
        let lastProbe = 0;
        const measureRoomLight = (video: HTMLVideoElement) => {
          if (!probeCtx) return;
          probeCtx.drawImage(video, 0, 0, 8, 8);
          const pixels = probeCtx.getImageData(0, 0, 8, 8).data;
          let r = 0;
          let g = 0;
          let b = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
          }
          const scale = 1 / (64 * 255);
          roomColor.setRGB(r * scale, g * scale, b * scale, THREE.SRGBColorSpace);
          hemisphere.color.setRGB(1, 1, 1).lerp(roomColor, 0.6);
          const brightness = (r + g + b) * scale / 3;
          hemisphere.intensity = 1.2 + 1.6 * brightness;
          sun.intensity = 0.6 + 1.8 * brightness;
        };

        const clampX = (x: number, halfWidth: number) => Math.max(SIDE_MARGIN + halfWidth, Math.min(viewW - SIDE_MARGIN - halfWidth, x));
        const toWorldX = (x: number) => x - viewW / 2;
        const toWorldY = (y: number) => viewH / 2 - y;
        const lineFrom = new THREE.Vector3();
        const lineTo = new THREE.Vector3();
        const lineDirection = new THREE.Vector3();
        const upAxis = new THREE.Vector3(0, 1, 0);

        const smooth = { cx: 0, cy: 0, w: 0, h: 0, depth: 1, ready: false };
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

          if (video && video.readyState >= 2 && now - lastProbe > 700) {
            lastProbe = now;
            measureRoomLight(video);
          }

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
            // Getaran kecil dari deteksi diredam, tetapi gerakan besar kamera diikuti dengan cepat
            const distance = Math.hypot(targetX - smooth.cx, targetY - smooth.cy);
            const follow = 1 - Math.exp(-dt * (5 + Math.min(18, distance * 0.25)));
            vx = (targetX - smooth.cx) * follow;
            vy = (targetY - smooth.cy) * follow;
            smooth.cx += vx;
            smooth.cy += vy;
            const resizeFollow = 1 - Math.exp(-dt * 5);
            smooth.w += (targetW - smooth.w) * resizeFollow;
            smooth.h += (targetH - smooth.h) * resizeFollow;
            // Benda yang lebih dekat membuat kontennya ikut membesar
            const nearness = THREE.MathUtils.clamp(0.62 + Math.sqrt(smooth.w * smooth.h) / 400, 0.8, 1.12);
            smooth.depth += (nearness - smooth.depth) * resizeFollow;
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

          label.group.visible = decal.group.visible = connector.visible = anchorDot.visible = anchorGlow.visible = badge.visible = visible;

          if (visible) {
            const enter = THREE.MathUtils.smoothstep(presence, 0, 1);
            const pop = enter * (1 + (1 - enter) * 0.25);
            const topOfObject = smooth.cy - smooth.h / 2;
            const bottomOfObject = smooth.cy + smooth.h / 2;
            const anchorY = topOfObject + Math.min(26, smooth.h * 0.12);
            const bob = Math.sin(time * 2.2) * 3;

            // Papan muncul dari benda lalu melayang di atasnya, sedikit berputar menghadap tengah layar
            const labelW = label.width * smooth.depth;
            const labelH = label.height * smooth.depth;
            const labelX = clampX(smooth.cx, labelW / 2);
            const labelY = Math.max(SAFE_TOP + labelH / 2, topOfObject - labelH / 2 - 30);
            const labelBottom = labelY + labelH / 2;
            const facing = ((viewW / 2 - labelX) / viewW) * 0.7;
            label.group.position.set(
              toWorldX(THREE.MathUtils.lerp(smooth.cx, labelX, enter)),
              toWorldY(THREE.MathUtils.lerp(anchorY, labelY, enter)) + bob,
              36,
            );
            label.group.rotation.set(
              -0.1 + THREE.MathUtils.clamp(vy * 0.045, -0.35, 0.35),
              facing + Math.sin(time * 0.8) * 0.14 + THREE.MathUtils.clamp(vx * 0.045, -0.45, 0.45),
              0,
            );
            label.group.scale.setScalar(pop * smooth.depth);

            lineFrom.set(toWorldX(labelX), toWorldY(labelBottom) + bob, 30);
            lineTo.set(toWorldX(smooth.cx), toWorldY(anchorY), 0);
            lineDirection.subVectors(lineTo, lineFrom);
            connector.position.addVectors(lineFrom, lineTo).multiplyScalar(0.5);
            connector.scale.set(enter, Math.max(1, lineDirection.length()), enter);
            connector.quaternion.setFromUnitVectors(upAxis, lineDirection.normalize());
            anchorDot.position.copy(lineTo);
            anchorDot.scale.setScalar(enter);
            anchorGlow.position.copy(lineTo);
            anchorGlow.scale.setScalar((26 + Math.sin(time * 4) * 6) * enter);

            // Instruksi terbaring di permukaan, di depan benda
            const decalH = decal.height * smooth.depth;
            const groundY = Math.min(viewH - SAFE_BOTTOM - decalH * 0.4, bottomOfObject + decalH * 0.3);
            decal.group.position.set(toWorldX(clampX(smooth.cx, (decal.width * smooth.depth) / 2)), toWorldY(groundY), 24);
            decal.group.rotation.set(-GROUND_TILT, 0, 0);
            decal.group.scale.setScalar(pop * smooth.depth);

            const radius = 30 * smooth.depth;
            const badgeX = Math.max(SIDE_MARGIN + radius, Math.min(viewW - SIDE_MARGIN - radius, smooth.cx + smooth.w / 2 + radius * 0.4));
            const badgeY = Math.max(labelBottom + radius + 10, topOfObject + smooth.h * 0.25);
            badge.position.set(toWorldX(badgeX), toWorldY(badgeY) - bob, 48);
            badge.rotation.set(Math.sin(time * 0.7) * 0.12, Math.sin(time * 1.1) * 0.7 + (1 - enter) * 3, 0);
            badge.scale.setScalar(radius * enter);
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
  }, [videoRef, boxRef, title, details, instruction, recycleCode, onUnavailable]);

  return <div ref={hostRef} className="absolute inset-0 z-[15] pointer-events-none" aria-hidden="true" />;
}
