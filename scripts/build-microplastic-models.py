"""
Membangun model 3D mikroplastik per morfologi untuk layar AR: fragmen, serat, film, pelet, dan gabungannya.
Geometri dibuat secara prosedural mengikuti bentuk pada foto mikroskop di docs/Referensi_Model_Mikroplastik_3D.md,
jadi ini visualisasi berdasarkan referensi, bukan hasil pindai. Semua partikel berbeda; tidak ada yang diulang.
Ukuran dalam meter (tampilan AR), dasar model di y = 0. Butuh numpy dan scipy.

Jalankan dari root repo, lalu buat USDZ untuk iPhone:
  python scripts/build-microplastic-models.py public/models/microplastic
  node scripts/export-microplastic-usdz.mjs public/models/microplastic
"""

import itertools
import json
import os
import site
import struct
import sys

sys.path.append(site.getusersitepackages())

import numpy as np
from scipy.spatial import Delaunay, cKDTree

OUT_DIR = sys.argv[1]
TWO_PI = 2 * np.pi


def to_linear(hex_color):
    srgb = np.array([int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def unit(vector):
    return vector / np.linalg.norm(vector)


# ─── Kontur dan permukaan tertutup ──────────────────────────────────────────


def edge_samples(rng, corners, samples, chip):
    """Titik-titik di sepanjang tepi. Tiap sisi berbeda: ada yang patah lurus, ada yang gompal."""
    corners = np.array(corners)
    lengths = np.linalg.norm(np.roll(corners, -1, axis=0) - corners, axis=1)
    counts = np.maximum(1, np.round(lengths / lengths.sum() * samples).astype(int))
    points = []
    for i, count in enumerate(counts):
        a, b = corners[i], corners[(i + 1) % len(corners)]
        edge_chip = chip * rng.choice([0.2, 1.0, 2.4], p=[0.3, 0.4, 0.3])
        for t in np.arange(count) / count:
            nick = abs(rng.normal(0, edge_chip)) if t > 0 else 0.0
            points.append((a + (b - a) * t) * (1 - nick))
    return np.array(points)


def jagged_outline(rng, corners, samples, radius_range, chip, notches=0, stretch=1.0):
    """Kontur bersudut tidak beraturan seperti tepi patah, bisa dengan takik robekan."""
    gaps = rng.dirichlet(np.full(corners, 3.0)) * TWO_PI
    angles = np.cumsum(gaps) + rng.uniform(0, TWO_PI)
    radii = rng.uniform(*radius_range, corners)
    points = [np.array([np.cos(a), np.sin(a)]) * r for a, r in zip(angles, radii)]
    for _ in range(notches):
        lengths = [np.linalg.norm(points[(i + 1) % len(points)] - points[i]) for i in range(len(points))]
        i = int(np.argmax(lengths))
        a, b = points[i], points[(i + 1) % len(points)]
        t, width = rng.uniform(0.35, 0.65), rng.uniform(0.04, 0.09)
        deep = (a + (b - a) * (t + rng.uniform(-0.03, 0.03))) * rng.uniform(0.3, 0.68)
        points[i + 1 : i + 1] = [a + (b - a) * (t - width), deep, a + (b - a) * (t + width)]
    outline = edge_samples(rng, points, samples, chip)
    outline[:, 0] *= stretch
    return outline / np.abs(outline).max()


def crescent_outline(rng, samples, sweep, width, chip):
    """Bentuk sabit: busur luar dan busur dalam yang bertemu di dua ujung runcing."""
    theta = np.linspace(-sweep / 2, sweep / 2, samples // 2)
    inner_radius = 1 - width * np.cos(theta / sweep * np.pi) * (1 + 0.28 * np.sin(theta * 2.3 + rng.uniform(0, TWO_PI)))
    bulge = 1 + 0.07 * np.sin(theta * 1.7 + rng.uniform(0, TWO_PI))
    outer = np.column_stack([np.cos(theta), np.sin(theta)]) * bulge[:, None]
    inner = (np.column_stack([np.cos(theta), np.sin(theta)]) * (inner_radius * bulge)[:, None])[::-1][1:-1]
    outline = np.concatenate([outer, inner])
    outline *= 1 - np.abs(rng.normal(0, chip, (len(outline), 1)))
    outline -= (outline.min(axis=0) + outline.max(axis=0)) / 2
    return outline / np.abs(outline).max()


def inside_polygon(points, polygon):
    x, y = points[:, 0], points[:, 1]
    x0, y0 = polygon[:, 0, None], polygon[:, 1, None]
    x1, y1 = np.roll(polygon[:, 0], -1)[:, None], np.roll(polygon[:, 1], -1)[:, None]
    crossing = ((y0 > y) != (y1 > y)) & (x < (x1 - x0) * (y - y0) / (y1 - y0 + 1e-12) + x0)
    return crossing.sum(axis=0) % 2 == 1


def scatter(rng, outline, spacing):
    """Titik di dalam kontur dengan jarak hampir rata tetapi tidak sejajar, supaya tidak ada pola yang berulang."""
    low, high = outline.min(axis=0), outline.max(axis=0)
    xs, ys = np.arange(low[0], high[0], spacing), np.arange(low[1], high[1], spacing * 0.87)
    grid = np.array(np.meshgrid(xs, ys)).reshape(2, -1).T
    grid[:, 0] += (np.round((grid[:, 1] - low[1]) / (spacing * 0.87)).astype(int) % 2) * spacing / 2
    grid += rng.uniform(-0.38, 0.38, grid.shape) * spacing
    grid = grid[inside_polygon(grid, outline)]
    return grid[cKDTree(outline).query(grid)[0] > spacing * 0.45]


def triangulate(outline, inner):
    points = np.concatenate([outline, inner])
    simplices = Delaunay(points).simplices
    faces = simplices[inside_polygon(points[simplices].mean(axis=1), outline)]
    a, b, c = points[faces[:, 0]], points[faces[:, 1]], points[faces[:, 2]]
    clockwise = (b - a)[:, 0] * (c - a)[:, 1] - (b - a)[:, 1] * (c - a)[:, 0] < 0
    faces[clockwise] = faces[clockwise][:, ::-1]
    return points, faces


def closed_shell(xy, faces, top, bottom):
    """Permukaan atas dan bawah yang disambung dinding tepi, jadi bendanya tertutup dan tidak perlu bahan dua sisi."""
    count = len(xy)
    directed = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    edges = directed[~np.isin(directed[:, 0] * count + directed[:, 1], directed[:, 1] * count + directed[:, 0])]
    side = np.concatenate([np.column_stack([edges[:, 0], edges[:, 0] + count, edges[:, 1] + count]), np.column_stack([edges[:, 0], edges[:, 1] + count, edges[:, 1]])])
    verts = np.concatenate([np.column_stack([xy, top]), np.column_stack([xy, bottom])])
    return verts, np.concatenate([faces, faces[:, ::-1] + count, side])


# ─── Fragmen ────────────────────────────────────────────────────────────────


def facet_height(xy, rng, height, planes, slope=0.55):
    """Minimum beberapa bidang miring: permukaan patah terdiri dari bidang-bidang datar, bukan lengkung halus."""
    normals = rng.normal(0, slope, (planes, 2))
    offsets = rng.uniform(0.8, 1.25, planes)
    return height * np.clip((xy @ normals.T + offsets).min(axis=1), 0.3, 1.35)


def fragment(seed, size, corners=7, stretch=1.25, thickness=0.12, notches=0, curl=0.0, twist=0.0, planes=7, radius_range=(0.6, 1.0), rim=0.0, ripple=0.0, spacing=0.15, crescent=None, chip=0.012):
    """Serpihan pipih dan asimetris. Ketebalan berbeda di tiap titik, dan tiap sisi punya tepi yang berbeda."""
    rng = np.random.default_rng(seed)
    if crescent:
        outline = crescent_outline(rng, 76, *crescent, chip)
    else:
        outline = jagged_outline(rng, corners, 60, radius_range, chip, notches, stretch)
    xy, faces = triangulate(outline, scatter(rng, outline, spacing))
    distance, nearest = cKDTree(outline).query(xy)
    # Sebagian tepi menipis seperti serpih, sebagian lagi tebal seperti patahan tegak
    knots = rng.uniform(0.15, 0.9, 7)
    floor = np.interp(nearest / len(outline) * 7, np.arange(8), np.append(knots, knots[0]))
    taper = floor + (1 - floor) * smoothstep(0, 0.28, distance)
    top = facet_height(xy, rng, thickness, planes) * taper
    bottom = -facet_height(xy, rng, thickness * 0.5, max(3, planes // 2), slope=0.2) * taper
    if ripple:
        # Riak pada bidang patah, berpusat di satu titik di tepi
        impact = outline[rng.integers(len(outline))]
        reach = np.linalg.norm(xy - impact, axis=1)
        top += ripple * thickness * np.cos(reach * 15) * np.exp(-reach * 1.1)
    if rim:
        top += rim * thickness * smoothstep(0.2, 0.0, distance)
    verts, faces = closed_shell(xy, faces, top, bottom)
    if curl:
        verts[:, 2] += curl * (verts[:, 0] ** 2 + 0.4 * verts[:, 1] ** 2)
    if twist:
        angle = twist * verts[:, 0]
        y, z = verts[:, 1].copy(), verts[:, 2].copy()
        verts[:, 1] = y * np.cos(angle) - z * np.sin(angle)
        verts[:, 2] = y * np.sin(angle) + z * np.cos(angle)
    return verts * size / 2, faces


def splinter(seed, length, width, thickness, rows=9, samples=26, bend=0.06):
    """Batang memanjang dengan alur sejajar. Satu ujung patah tumpul, ujung lainnya berserabut."""
    rng = np.random.default_rng(seed)
    across = np.linspace(-1, 1, rows)
    along = np.linspace(0, 1, samples)
    start = -0.5 + rng.uniform(0, 0.035, rows)
    teeth = rng.uniform(0, 0.05, rows)
    teeth[::2] += 0.035
    end = 0.5 - teeth
    x = (start[:, None] + (end - start)[:, None] * along[None, :]) * length
    profile = 1 + 0.16 * np.sin(along * rng.uniform(5, 9) + rng.uniform(0, TWO_PI)) + 0.08 * np.sin(along * rng.uniform(13, 21) + rng.uniform(0, TWO_PI))
    y = across[:, None] * (width / 2 * profile)[None, :] + rng.normal(0, width * 0.012, (rows, samples))
    # Serabut merenggang di ujung
    y += across[:, None] * width * 0.14 * smoothstep(0.88, 1.0, along)[None, :]
    y += bend * length * ((x / length) ** 2 - 0.1)
    ridge = rng.uniform(0.55, 1.0, rows)
    ridge[1::2] *= 0.72
    dome = 1 - 0.55 * across**2
    surface = thickness * (ridge * dome)[:, None] * (1 + 0.14 * np.sin(along * rng.uniform(4, 8) + rng.uniform(0, TWO_PI)))[None, :]
    surface = surface * (0.45 + 0.55 * smoothstep(1.0, 0.8, along))[None, :]
    index = np.arange(rows * samples).reshape(rows, samples)
    faces = []
    for i in range(rows - 1):
        for j in range(samples - 1):
            a, b, c, d = index[i, j], index[i, j + 1], index[i + 1, j + 1], index[i + 1, j]
            faces += [(a, b, c), (a, c, d)]
    return closed_shell(np.column_stack([x.ravel(), y.ravel()]), np.array(faces), surface.ravel(), -(surface * 0.4).ravel())


# ─── Film ───────────────────────────────────────────────────────────────────


def film(seed, size, corners=12, stretch=1.4, tears=2, creases=5, crease_depth=0.09, crumple=0.004, thickness=0.012, spacing=0.16, parallel=False, chip=0.012, line_height=0.016, line_width=0.03, radius_range=(0.66, 1.0)):
    """Lembaran tipis dengan tepi robek. Tiap lipatan menekuk lembaran dan meninggalkan garis sempit yang memudar di ujungnya."""
    rng = np.random.default_rng(seed)
    outline = jagged_outline(rng, corners, 76, radius_range, chip, tears, stretch)
    base_angle = rng.uniform(0, np.pi)
    folds, extra = [], []
    for _ in range(creases):
        angle = base_angle + rng.normal(0, 0.1) if parallel else rng.uniform(0, np.pi)
        normal, direction = np.array([np.cos(angle), np.sin(angle)]), np.array([-np.sin(angle), np.cos(angle)])
        offset, middle, half = rng.uniform(-0.55, 0.55), rng.uniform(-0.3, 0.3), rng.uniform(0.45, 1.3)
        amount = rng.choice([-1, 1]) * rng.uniform(0.45, 1.0) * crease_depth
        folds.append((normal, direction, offset, middle, half, amount))
        reach = np.arange(middle - half, middle + half, spacing * 0.8)
        line = normal * offset + np.outer(reach, direction)
        for shift in (-line_width, 0, line_width):
            extra.append(line + normal * shift + rng.normal(0, 0.002, line.shape))
    inner = np.concatenate([scatter(rng, outline, spacing), *extra])
    inner = inner[inside_polygon(inner, outline)]
    inner = inner[cKDTree(outline).query(inner)[0] > spacing * 0.25]
    xy, faces = triangulate(outline, inner)
    height = np.zeros(len(xy))
    for normal, direction, offset, middle, half, amount in folds:
        crossing = xy @ normal - offset
        fade = smoothstep(half + 0.15, half - 0.15, np.abs(xy @ direction - middle))
        height += amount * np.minimum(np.abs(crossing), 0.6) * fade
        height += np.sign(amount) * line_height * np.exp(-((crossing / line_width) ** 2)) * fade
    for _ in range(3):
        wave = rng.normal(0, 1, 2)
        height += crumple * 2 * np.sin(xy @ wave * rng.uniform(3, 6) + rng.uniform(0, TWO_PI))
    height += rng.normal(0, crumple, len(height))
    height -= height.mean()
    verts, faces = closed_shell(xy, faces, height + thickness / 2, height - thickness / 2)
    return verts * size / 2, faces


# ─── Serat ──────────────────────────────────────────────────────────────────


def turning_path(rng, length, segments, samples, smooth, wobble, lift):
    """Jalur dari urutan belokan [(porsi panjang, sudut belok dalam derajat)], seperti serat yang terbaring."""
    fractions = np.array([s[0] for s in segments], dtype=float)
    fractions /= fractions.sum()
    turns = np.radians([s[1] for s in segments])
    edges = np.cumsum(fractions)
    s = (np.arange(samples) + 0.5) / samples
    index = np.minimum(np.searchsorted(edges, s), len(fractions) - 1)
    curvature = turns[index] / fractions[index]
    noise = rng.normal(0, 1, samples)
    width = max(3, int(samples * 0.04))
    noise = np.convolve(noise, np.ones(width) / width, mode="same")
    curvature = curvature + noise * wobble
    if smooth > 1:
        kernel = np.hanning(smooth + 2)[1:-1]
        curvature = np.convolve(curvature, kernel / kernel.sum(), mode="same")
    heading = np.cumsum(curvature) / samples + rng.uniform(0, TWO_PI)
    step = length / samples
    x = np.cumsum(np.cos(heading)) * step
    y = np.cumsum(np.sin(heading)) * step
    # Sedikit naik turun supaya bagian yang bersilangan tidak saling menembus
    z = lift * (np.sin(s * TWO_PI * 3 + rng.uniform(0, TWO_PI)) + 0.6 * np.sin(s * TWO_PI * 7.3 + rng.uniform(0, TWO_PI)))
    path = np.column_stack([x, y, z])
    return path - path.mean(axis=0)


def tube(path, radius, rng, radial=6, flatten=0.85, roughness=0.0):
    """Selubung tabung tipis mengikuti jalur, dengan penampang agak pipih dan tebal yang sedikit berubah."""
    n = len(path)
    tangent = np.gradient(path, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1, keepdims=True)
    normal = unit(np.cross(tangent[0], [0.0, 0.0, 1.0]))
    bumps = np.convolve(rng.normal(0, 1, n), np.ones(5) / 5, mode="same") * roughness
    theta = np.arange(radial) / radial * TWO_PI
    rings = np.zeros((n, radial, 3))
    taper = np.minimum(1, 0.45 + 0.55 * np.minimum(np.arange(n), np.arange(n)[::-1]) / max(1, n * 0.03))
    for i in range(n):
        normal = unit(normal - tangent[i] * (normal @ tangent[i]))
        binormal = np.cross(tangent[i], normal)
        r = radius * taper[i] * (1 + bumps[i])
        rings[i] = path[i] + r * (np.outer(np.cos(theta), normal) + flatten * np.outer(np.sin(theta), binormal))
    verts = np.concatenate([rings.reshape(-1, 3), path[0][None], path[-1][None]])
    faces = []
    for i in range(n - 1):
        for j in range(radial):
            k = (j + 1) % radial
            a, b = i * radial + j, i * radial + k
            c, d = (i + 1) * radial + k, (i + 1) * radial + j
            faces += [(a, b, c), (a, c, d)]
    start, end = n * radial, n * radial + 1
    for j in range(radial):
        k = (j + 1) % radial
        faces.append((start, k, j))
        faces.append((end, (n - 1) * radial + j, (n - 1) * radial + k))
    return verts, np.array(faces)


def fiber(seed, length, radius, segments, samples=150, smooth=9, wobble=2.0, radial=6, roughness=0.04, lift=1.8):
    rng = np.random.default_rng(seed)
    return tube(turning_path(rng, length, segments, samples, smooth, wobble, radius * lift), radius, rng, radial, roughness=roughness)


def tangle(seed, reach, radius, samples=300):
    """Serat kusut: lingkar-lingkar rapat di tengah, lalu kedua ujungnya keluar membentuk lengkung."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, 1, samples)
    spread = 0.27 + 0.73 * (smoothstep(0.26, 0.0, t) + smoothstep(0.74, 1.0, t))
    phase = rng.uniform(0, TWO_PI, 5)
    main, second, third = rng.uniform(3.2, 3.8), rng.uniform(6.2, 7.0), rng.uniform(8.3, 9.4)
    x = spread * (np.sin(TWO_PI * main * t + phase[0]) + 0.5 * np.sin(TWO_PI * second * t + phase[1]))
    y = spread * (np.cos(TWO_PI * main * t + phase[2]) + 0.5 * np.sin(TWO_PI * third * t + phase[3]))
    z = radius * 2.4 * np.sin(TWO_PI * 11.3 * t + phase[4])
    return tube(np.column_stack([x * reach, y * reach, z]), radius, rng, 5, roughness=0.05)


# ─── Pelet ──────────────────────────────────────────────────────────────────


def compact(verts, faces):
    used, inverse = np.unique(faces, return_inverse=True)
    return verts[used], inverse.reshape(faces.shape)


def merge(*meshes):
    verts, faces, offset = [], [], 0
    for v, f in meshes:
        verts.append(v)
        faces.append(f + offset)
        offset += len(v)
    return np.concatenate(verts), np.concatenate(faces)


def icosphere(subdivisions):
    t = (1 + 5**0.5) / 2
    verts = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    faces = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    verts = [np.array(v, dtype=float) / np.linalg.norm(v) for v in verts]
    for _ in range(subdivisions):
        cache, next_faces = {}, []

        def midpoint(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache:
                m = verts[a] + verts[b]
                verts.append(m / np.linalg.norm(m))
                cache[key] = len(verts) - 1
            return cache[key]

        for a, b, c in faces:
            ab, bc, ca = midpoint(a, b), midpoint(b, c), midpoint(c, a)
            next_faces += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        faces = next_faces
    return np.array(verts), np.array(faces)


def bead(seed, size, lumps=0.05, squash=0.88, chipped=0.0, dents=0, grain=0.0, subdivisions=3):
    """Butiran membulat yang tidak bulat sempurna: permukaan bergelombang, ada lekukan, dan bisa ada sisi yang rata."""
    rng = np.random.default_rng(seed)
    verts, faces = icosphere(subdivisions)
    radius = np.ones(len(verts))
    for _ in range(6):
        direction = unit(rng.normal(0, 1, 3))
        radius += lumps * rng.uniform(0.3, 1.0) * np.sin(verts @ direction * rng.uniform(2.2, 5) + rng.uniform(0, TWO_PI))
    for _ in range(dents):
        direction = unit(rng.normal(0, 1, 3))
        radius -= rng.uniform(0.02, 0.05) * smoothstep(np.cos(rng.uniform(0.25, 0.55)), 1.0, verts @ direction)
    if grain:
        radius += rng.normal(0, grain, len(verts))
    shaped = verts * radius[:, None]
    shaped[:, 2] *= squash
    if chipped:
        direction = unit(rng.normal(0, 1, 3))
        shaped -= np.maximum(shaped @ direction - (1 - chipped), 0)[:, None] * direction
    return shaped * size / 2, faces


def revolve(profile, segments, rim_noise=None):
    """Bentuk putar di sekitar sumbu z; profile adalah [(jari-jari, tinggi)] dari bawah ke atas."""
    rows = len(profile)
    theta = np.arange(segments) / segments * TWO_PI
    factor = np.ones(segments) if rim_noise is None else rim_noise(theta)
    verts = np.concatenate([np.column_stack([r * factor * np.cos(theta), r * factor * np.sin(theta), np.full(segments, z)]) for r, z in profile])
    index = np.arange(rows * segments).reshape(rows, segments)
    for j, (r, _) in enumerate(profile):
        if r < 1e-6:
            index[j] = index[j, 0]
    faces = []
    for j in range(rows - 1):
        for i in range(segments):
            k = (i + 1) % segments
            a, b, c, d = index[j, i], index[j, k], index[j + 1, k], index[j + 1, i]
            if a != b:
                faces.append((a, b, c))
            if c != d:
                faces.append((a, c, d))
    return compact(verts, np.array(faces))


def lens_pellet(seed, size):
    """Cakram membulat dengan bibir tepi dan tonjolan kecil."""
    rng = np.random.default_rng(seed)
    nubs = rng.uniform(0, TWO_PI, 3)

    def rim(theta):
        factor = 1 + 0.014 * np.sin(theta * 3 + rng.uniform(0, 6)) + 0.008 * np.sin(theta * 5 + rng.uniform(0, 6))
        for nub in nubs:
            factor += 0.035 * np.exp(-(((theta - nub + np.pi) % TWO_PI - np.pi) ** 2) / 0.009)
        return factor

    profile = [(0, -0.34), (0.35, -0.35), (0.65, -0.31), (0.85, -0.22), (0.96, -0.11), (1.0, 0.0), (0.98, 0.08), (0.92, 0.15), (0.86, 0.15), (0.8, 0.13), (0.72, 0.2), (0.52, 0.36), (0.26, 0.45), (0, 0.47)]
    verts, faces = revolve(profile, 64, rim)
    return verts * size / 2, faces


def cylinder_pellet(seed, length, diameter, cut=0.07):
    """Silinder pendek dengan ujung terpotong yang sedikit miring. Bentuk ini ilustratif, bukan dari foto mikroskop."""
    rng = np.random.default_rng(seed)
    phase = rng.uniform(0, TWO_PI)

    def wobble(theta):
        return 1 + 0.03 * np.sin(theta * 2 + phase) + 0.012 * np.sin(theta * 5 + phase * 2)

    body = [(0.94, -0.5), (0.985, -0.485), (1.0, -0.45)] + [(1.0 + 0.012 * np.sin(z * 9 + phase), z) for z in np.linspace(-0.36, 0.36, 7)] + [(1.0, 0.45), (0.985, 0.485), (0.94, 0.5)]
    bottom = [(0, -0.485), (0.55, -0.49), (0.94, -0.5)]
    top = [(0.94, 0.5), (0.55, 0.49), (0, 0.485)]
    verts, faces = merge(revolve(bottom, 36, wobble), revolve(body, 36, wobble), revolve(top, 36, wobble))
    verts[:, 2] += cut * verts[:, 0]
    verts = verts * np.array([diameter / 2, diameter / 2, length])
    # Berbaring menyamping dan sedikit melengkung
    x, z = verts[:, 0].copy(), verts[:, 2].copy()
    verts[:, 0], verts[:, 2] = z, -x
    verts[:, 2] += 0.12 * diameter * (verts[:, 0] / length) ** 2
    return verts, faces


# ─── Bahan, penempatan, dan penulisan GLB ───────────────────────────────────


def flat_buffers(verts, faces):
    triangles = verts[faces]
    normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    keep = lengths[:, 0] > 1e-14
    triangles, normals = triangles[keep], normals[keep] / lengths[keep]
    return triangles.reshape(-1, 3), np.repeat(normals, 3, axis=0), np.arange(len(triangles) * 3)


def smooth_buffers(verts, faces):
    triangles = verts[faces]
    face_normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    keep = np.linalg.norm(face_normals, axis=1) > 1e-16
    faces, face_normals = faces[keep], face_normals[keep]
    normals = np.zeros_like(verts)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    return verts, normals, faces.ravel()


def rotation(yaw, tilt_x, tilt_z):
    cy, sy = np.cos(yaw), np.sin(yaw)
    cx, sx = np.cos(tilt_x), np.sin(tilt_x)
    cz, sz = np.cos(tilt_z), np.sin(tilt_z)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return ry @ rx @ rz


def place(mesh, x, z, yaw=0.0, tilt_x=0.0, tilt_z=0.0, lift=0.0):
    """Sumbu tebal benda (z lokal) menjadi sumbu atas; benda diletakkan menyentuh lantai."""
    verts, faces = mesh
    world = np.column_stack([verts[:, 0], verts[:, 2], -verts[:, 1]])
    world = world @ rotation(np.radians(yaw), np.radians(tilt_x), np.radians(tilt_z)).T
    world = world - np.array([world[:, 0].mean(), world[:, 1].min() - lift, world[:, 2].mean()]) + np.array([x, 0, z])
    return world, faces


class Scene:
    def __init__(self, name, margin=0.012):
        self.name = name
        self.margin = margin
        self.parts = []

    def add(self, label, mesh, color, roughness=0.5, shading="flat", opacity=1.0):
        verts, faces = mesh
        positions, normals, indices = (flat_buffers if shading == "flat" else smooth_buffers)(verts, faces)
        self.parts.append({"name": f"{label}_{len(self.parts) + 1}", "positions": positions.copy(), "normals": normals, "indices": indices, "color": to_linear(color), "roughness": roughness, "opacity": opacity})

    def spread_apart(self):
        """Partikel didorong menjauh sampai jejaknya di lantai tidak bersentuhan, supaya tiap bentuk terbaca jelas."""
        for _ in range(240):
            moved = False
            for a, b in itertools.combinations(self.parts, 2):
                pa, pb = a["positions"][:, [0, 2]], b["positions"][:, [0, 2]]
                gap = cKDTree(pa).query(pb)[0].min()
                if gap < self.margin:
                    direction = unit(pb.mean(axis=0) - pa.mean(axis=0) + 1e-9)
                    step = (self.margin - gap) / 2 + 0.002
                    a["positions"][:, [0, 2]] -= direction * step
                    b["positions"][:, [0, 2]] += direction * step
                    moved = True
            if not moved:
                return
        print(f"  peringatan: {self.name} masih ada partikel yang bersentuhan")

    def write(self, directory):
        self.spread_apart()
        points = np.concatenate([p["positions"] for p in self.parts])
        low, high = points.min(axis=0), points.max(axis=0)
        shift = np.array([(low[0] + high[0]) / 2, low[1], (low[2] + high[2]) / 2])
        blob, views, accessors = bytearray(), [], []

        def add(values, component, kind, target, bounds=False):
            while len(blob) % 4:
                blob.append(0)
            raw = values.tobytes()
            views.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(raw), "target": target})
            blob.extend(raw)
            accessor = {"bufferView": len(views) - 1, "componentType": component, "count": len(values), "type": kind}
            if bounds:
                accessor["min"] = [float(v) for v in values.min(axis=0)]
                accessor["max"] = [float(v) for v in values.max(axis=0)]
            accessors.append(accessor)
            return len(accessors) - 1

        materials, meshes, nodes, triangles = [], [], [], 0
        for part in self.parts:
            material = {
                "name": part["name"],
                "pbrMetallicRoughness": {"baseColorFactor": [*[round(float(c), 4) for c in part["color"]], part["opacity"]], "metallicFactor": 0.0, "roughnessFactor": part["roughness"]},
            }
            if part["opacity"] < 1:
                material["alphaMode"] = "BLEND"
            materials.append(material)
            positions = (part["positions"] - shift).astype(np.float32)
            indices = part["indices"]
            assert indices.max() < 65535, part["name"]
            triangles += len(indices) // 3
            primitive = {
                "attributes": {"POSITION": add(positions, 5126, "VEC3", 34962, bounds=True), "NORMAL": add(part["normals"].astype(np.float32), 5126, "VEC3", 34962)},
                "indices": add(indices.astype(np.uint16), 5123, "SCALAR", 34963),
                "material": len(materials) - 1,
            }
            meshes.append({"name": part["name"], "primitives": [primitive]})
            nodes.append({"name": part["name"], "mesh": len(meshes) - 1})
        nodes.append({"name": self.name, "children": list(range(len(self.parts)))})
        while len(blob) % 4:
            blob.append(0)
        document = {
            "asset": {"version": "2.0", "generator": "MicroJourney scripts/build-microplastic-models.py"},
            "scene": 0,
            "scenes": [{"name": self.name, "nodes": [len(nodes) - 1]}],
            "nodes": nodes,
            "meshes": meshes,
            "materials": materials,
            "accessors": accessors,
            "bufferViews": views,
            "buffers": [{"byteLength": len(blob)}],
        }
        text = json.dumps(document, separators=(",", ":")).encode("utf-8")
        text += b" " * (-len(text) % 4)
        total = 12 + 8 + len(text) + 8 + len(blob)
        path = os.path.join(directory, f"{self.name}.glb")
        with open(path, "wb") as f:
            f.write(struct.pack("<4sII", b"glTF", 2, total))
            f.write(struct.pack("<I4s", len(text), b"JSON") + text)
            f.write(struct.pack("<I4s", len(blob), b"BIN\0") + bytes(blob))
        size = high - low
        print(f"{self.name}: {len(self.parts)} partikel, {triangles:,} segitiga, {size[0] * 100:.0f} x {size[1] * 100:.0f} x {size[2] * 100:.0f} cm, {total / 1024:.0f} KB")


# ─── Komposisi per kategori ─────────────────────────────────────────────────
# Warna mengikuti identitas biru muda dan cyan MicroJourney, tetapi tetap beragam seperti di foto referensi.
# Warna tidak menunjukkan jenis polimer.

LONG_TURNS = [(0.2, 55), (0.09, -130), (0.1, 40), (0.24, 385), (0.12, -60), (0.12, 110), (0.13, -70)]
KINKS = [(0.2, 18), (0.04, -72), (0.22, 26), (0.04, 64), (0.2, -20), (0.05, -58), (0.25, 22)]


def build_fragments():
    s = Scene("fragmen")
    # Serpihan pipih bersudut dengan takik (Chinglenthoiba dkk. C1)
    s.add("fragmen", place(fragment(11, 0.16, corners=7, stretch=1.35, thickness=0.1, notches=1), -0.085, 0.05, yaw=25, tilt_x=6, tilt_z=-4), "#3f9fd6", 0.5)
    # Bongkah dengan bidang patah dan riak (Wu dkk. D, Gao dkk. F)
    s.add("fragmen", place(fragment(23, 0.1, corners=6, stretch=1.2, thickness=0.4, planes=11, radius_range=(0.7, 1.0), ripple=0.08, spacing=0.11), 0.1, 0.07, yaw=-30, tilt_x=8, tilt_z=5), "#3ec6d9", 0.36)
    # Batang dengan alur dan ujung berserabut (Li dkk. a)
    s.add("fragmen", place(splinter(37, 0.27, 0.042, 0.007), -0.01, -0.075, yaw=10, tilt_x=3), "#2fb5a8", 0.58)
    # Sabit tipis melengkung dengan tepi lebih tebal (Li dkk. b, Gao dkk. I)
    s.add("fragmen", place(fragment(53, 0.12, thickness=0.05, curl=0.28, twist=0.5, rim=1.2, crescent=(3.6, 0.58), spacing=0.1), 0.01, 0.1, yaw=70, tilt_x=10), "#86d8ee", 0.28, opacity=0.86)
    return s


def build_fibers():
    s = Scene("serat")
    # Serat panjang melingkar dan bersilangan (Gao dkk. B, Chinglenthoiba dkk. B)
    s.add("serat", place(fiber(3, 0.52, 0.0026, LONG_TURNS, samples=210, smooth=9, wobble=2.5), -0.04, -0.085, yaw=12, lift=0.002), "#1f8fdb", 0.42, "smooth")
    # Gumpalan kusut dengan lengkung yang keluar dari gumpalan (Gao dkk. C)
    s.add("serat", place(tangle(9, 0.05, 0.0019), 0.115, 0.06, yaw=30, lift=0.001), "#2a6fbd", 0.5, "smooth")
    # Serat pendek berkelok patah-patah (Gao dkk. A)
    s.add("serat", place(fiber(14, 0.13, 0.0021, KINKS, samples=110, smooth=3, wobble=1.0), 0.155, -0.07, yaw=-20, lift=0.001), "#35c6dc", 0.45, "smooth")
    # Lengkung lebar (Huang dkk. h)
    s.add("serat", place(fiber(19, 0.25, 0.0023, [(1.0, 165)], samples=120, smooth=15, wobble=1.2), -0.13, 0.045, yaw=40, lift=0.001), "#4a84d8", 0.42, "smooth")
    # Serat lurus lebih tebal dengan permukaan kasar (Wu dkk. C)
    s.add("serat", place(fiber(26, 0.17, 0.004, [(0.93, 6), (0.07, 75)], samples=80, smooth=5, wobble=0.15, radial=7, roughness=0.16, lift=0.15), -0.01, 0.105, yaw=-8, lift=0.001), "#2db7a3", 0.62, "smooth")
    return s


def build_films():
    s = Scene("film")
    # Lembaran hampir datar dengan takik dan garis lipat (Li dkk. c)
    s.add("film", place(film(5, 0.2, corners=6, stretch=1.3, tears=1, creases=6, crease_depth=0.05, crumple=0.0015, thickness=0.012, radius_range=(0.86, 1.0), line_height=0.02), -0.08, 0.04, yaw=-12, tilt_x=5, lift=0.003), "#8fe6fb", 0.2, opacity=0.74)
    # Pita robek dan berkerut (Wu dkk. B, Chinglenthoiba dkk. C2)
    s.add("film", place(film(17, 0.26, corners=14, stretch=2.8, tears=3, creases=9, crease_depth=0.26, crumple=0.01, thickness=0.009), 0.03, -0.1, yaw=8, lift=0.002), "#7fdcf5", 0.24, opacity=0.72)
    # Lembaran biru dengan lipatan sejajar dan tepi terkikis (Gao dkk. E, Li dkk. d)
    s.add("film", place(film(29, 0.15, corners=7, stretch=1.25, tears=0, creases=4, crease_depth=0.13, crumple=0.003, thickness=0.016, parallel=True, chip=0.03, line_height=0.024), 0.115, 0.055, yaw=35, tilt_x=4, lift=0.002), "#3fa7e6", 0.45, opacity=0.86)
    return s


def build_pellets():
    s = Scene("pelet", margin=0.008)
    # Butiran tidak bulat sempurna dengan satu sisi rata (Chinglenthoiba dkk. A)
    s.add("pelet", place(bead(7, 0.085, lumps=0.045, squash=0.84, chipped=0.1, dents=4, grain=0.0035, subdivisions=4), -0.075, 0.015), "#eaf5f4", 0.62, "smooth")
    # Cakram membulat dengan bibir tepi (Wu dkk. E)
    s.add("pelet", place(lens_pellet(21, 0.085), 0.055, 0.04, yaw=20, tilt_x=9, tilt_z=-5), "#b5e8f4", 0.24, "smooth", opacity=0.88)
    # Silinder pendek (ilustratif, hanya dari deskripsi teks pelet industri)
    s.add("pelet", place(cylinder_pellet(33, 0.075, 0.05), -0.005, -0.075, yaw=35), "#8bdcf0", 0.42, "smooth")
    # Butiran kecil (Gao dkk. D, Huang dkk. c)
    s.add("pelet", place(bead(41, 0.034, lumps=0.03, squash=0.95, dents=2, grain=0.002), 0.09, -0.05), "#39c2c9", 0.38, "smooth")
    return s


def build_all():
    s = Scene("semua", margin=0.014)
    s.add("fragmen", place(fragment(63, 0.125, corners=8, stretch=1.2, thickness=0.11), -0.11, 0.07, yaw=-20, tilt_x=6, tilt_z=4), "#3f9fd6", 0.5)
    s.add("fragmen", place(splinter(67, 0.19, 0.03, 0.006), 0.06, 0.125, yaw=170, tilt_x=3), "#2fb5a8", 0.58)
    s.add("serat", place(fiber(71, 0.44, 0.0024, [(0.25, 70), (0.15, -140), (0.22, 380), (0.18, -80), (0.2, 90)], samples=190, smooth=9, wobble=2.5), 0.09, -0.085, yaw=20, lift=0.002), "#1f8fdb", 0.42, "smooth")
    s.add("serat", place(fiber(73, 0.2, 0.0022, [(1.0, 150)], samples=100, smooth=13, wobble=1.2), -0.14, -0.13, yaw=-60, lift=0.001), "#4a84d8", 0.42, "smooth")
    s.add("film", place(film(82, 0.15, corners=10, stretch=1.35, tears=1, creases=5, crease_depth=0.16, crumple=0.006, thickness=0.012), -0.065, -0.04, yaw=30, tilt_x=4, lift=0.003), "#8fe2f8", 0.22, opacity=0.72)
    s.add("pelet", place(bead(83, 0.058, lumps=0.045, squash=0.86, chipped=0.08, dents=3, grain=0.003, subdivisions=4), 0.02, 0.03), "#eaf5f4", 0.62, "smooth")
    s.add("pelet", place(lens_pellet(87, 0.066), 0.15, 0.035, yaw=-30, tilt_x=8, tilt_z=5), "#b5e8f4", 0.24, "smooth", opacity=0.88)
    return s


os.makedirs(OUT_DIR, exist_ok=True)
for build in (build_all, build_fragments, build_fibers, build_films, build_pellets):
    build().write(OUT_DIR)
