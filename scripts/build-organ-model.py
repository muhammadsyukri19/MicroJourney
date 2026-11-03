"""
Model saluran pencernaan untuk Tahap 4: kerongkongan, lambung, usus halus, dan usus besar dari BodyParts3D, ditambah
partikel mikroplastik ilustratif yang bergerak sepanjang jalur. GLB dan USDZ berisi satu komposisi yang sama, jadi
partikel ikut tampil di AR. Jalur partikel hanya ilustrasi, bukan hasil pengamatan di dalam tubuh.

Jalur dihitung dari bentuk model: tiap bagian organ divoxelkan, jarak ke dinding dihitung, lalu jalur terpendek yang
menjauhi dinding menjadi garis tengah rongga. Mesh jejunum dan ileum bukan satu tabung bersih karena lengkungnya menempel,
jadi jalurnya berkeliling melalui titik-titik rongga. Hasilnya tetap di dalam mesh, tetapi urutannya bukan urutan anatomi
yang pasti. Ukuran partikel menyesuaikan lebar rongga supaya tidak menembus dinding.

BodyParts3D, Copyright(C) 2008 Life Science Integrated Database Center, CC Attribution-Share Alike 2.1 Japan.
Modifikasi: mesh digabung per organ, disederhanakan, diputar, dan diberi warna. Hasilnya berlisensi sama.

Butuh numpy, scipy, fast-simplification, dan usd-core. Jalankan dari root repo:
  python scripts/build-organ-model.py public/models/organs <folder berisi FMA*.stl>
"""

import json
import os
import pathlib
import struct
import sys
import tempfile

import fast_simplification
import numpy as np
from pxr import Gf, Kind, Sdf, Usd, UsdGeom, UsdShade, UsdUtils, Vt
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components, dijkstra
from scipy.spatial import cKDTree

OUT_DIR = pathlib.Path(sys.argv[1])
SOURCE_DIR = pathlib.Path(sys.argv[2])
TWO_PI = 2 * np.pi
SCALE = 0.001
CREDIT = "BodyParts3D, Copyright(C) 2008 Life Science Integrated Database Center, CC BY-SA 2.1 JP. Modified: merged, simplified, recoloured, illustrative particles added."

# Urutan bagian mengikuti jalur makanan
PARTS = [
    ("kerongkongan", "FMA7131", 1500),
    ("lambung", "FMA7148", 5000),
    ("usus_halus", "FMA7206", 2800),
    ("usus_halus", "FMA7207", 7000),
    ("usus_halus", "FMA7208", 7000),
    ("usus_besar", "FMA14542", 300),
    ("usus_besar", "FMA14543nsn", 9000),
    ("usus_besar", "FMA14544", 1800),
]

ORGAN_LOOK = {
    "kerongkongan": {"color": "#d98f8c", "alpha": 0.5, "roughness": 0.42},
    "lambung": {"color": "#d9786e", "alpha": 0.5, "roughness": 0.4},
    "usus_halus": {"color": "#e7a08f", "alpha": 0.38, "roughness": 0.38},
    "usus_besar": {"color": "#c98f70", "alpha": 0.45, "roughness": 0.44},
}

VOXEL = 0.0025
ROUTE_STEP = 0.004
SAMPLE_STEP = 0.05
USD_FPS = 24
PARTICLE_COUNT = 48
PARTICLE_KINDS = ["fragmen", "serat", "pelet", "film"]
SECTIONS = ["kerongkongan", "lambung", "usus_halus", "usus_besar"]
# Bagian waktu tiap organ pada jalur lengkap, supaya lambung tidak terlewat sekejap dibanding usus halus yang panjang
FULL_TIME_SHARE = [0.08, 0.22, 0.42, 0.28]
# Klip animasi: bagian jalur, jumlah partikel, durasi detik, putaran menyamping, ayunan maju mundur, kelipatan ayunan
CLIPS = {
    "jalur_lengkap": {"sections": SECTIONS, "count": PARTICLE_COUNT, "duration": 72.0, "turns": 18, "sway": 0.006, "waves": 5},
    "kerongkongan": {"sections": ["kerongkongan"], "count": 10, "duration": 9.0, "turns": 2, "sway": 0.02, "waves": 2},
    "lambung": {"sections": ["lambung"], "count": 22, "duration": 24.0, "turns": 3, "sway": 0.05, "waves": 3, "wander": True, "shrink": 0.75},
    "usus_halus": {"sections": ["usus_halus"], "count": 30, "duration": 48.0, "turns": 10, "sway": 0.008, "waves": 4},
    "usus_besar": {"sections": ["usus_besar"], "count": 24, "duration": 30.0, "turns": 6, "sway": 0.015, "waves": 3},
}
FULL_DURATION = CLIPS["jalur_lengkap"]["duration"]

# Cahaya sendiri yang kecil supaya warna partikel tidak tenggelam oleh warna jaringan di depannya
PARTICLE_EMISSIVE = 0.4

PARTICLE_LOOK = {
    "fragmen": "#06c8ea",
    "serat": "#1aa7ff",
    "film": "#2ce6ff",
    "pelet": "#2fd8ff",
}


def srgb_to_linear(rgb):
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def hex_linear(value):
    return srgb_to_linear(np.array([int(value[i : i + 2], 16) / 255 for i in (1, 3, 5)]))


def normalized(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def read_stl(path):
    data = path.read_bytes()
    count = struct.unpack_from("<I", data, 80)[0]
    if 84 + count * 50 == len(data):
        raw = np.frombuffer(data, dtype=np.dtype([("n", "<3f4"), ("v", "<9f4"), ("a", "<u2")]), count=count, offset=84)
        triangles = raw["v"].reshape(-1, 3).astype(np.float64)
    else:
        numbers = [line.split()[1:] for line in data.decode("ascii", "ignore").splitlines() if line.strip().startswith("vertex")]
        triangles = np.array(numbers, dtype=np.float64)
    rounded = np.round(triangles, 3)
    points, inverse = np.unique(rounded, axis=0, return_inverse=True)
    faces = inverse.reshape(-1, 3)
    faces = faces[(faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])]
    tri = points[faces] - points.mean(axis=0)
    if (np.cross(tri[:, 0], tri[:, 1]) * tri[:, 2]).sum() < 0:
        faces = faces[:, ::-1]
    return points, faces


def vertex_normals(verts, faces):
    tri = verts[faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    normals = np.zeros_like(verts)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    return normalized(normals)


def tissue_shade(verts, faces, normals, seed):
    """Lekukan sedikit lebih gelap dan warna sedikit tidak rata, supaya tidak tampak seperti plastik atau batu."""
    total = np.zeros_like(verts)
    count = np.zeros(len(verts))
    for a, b in ((0, 1), (1, 2), (2, 0)):
        np.add.at(total, faces[:, a], verts[faces[:, b]])
        np.add.at(count, faces[:, a], 1)
    neighbour = total / np.maximum(count, 1)[:, None]
    cavity = ((neighbour - verts) * normals).sum(-1)
    scale = max(np.percentile(np.abs(cavity), 95), 1e-6)
    cavity = np.clip(cavity / scale, -1, 1)
    rng = np.random.default_rng(seed)
    mottling = 0
    for _ in range(5):
        direction = normalized(rng.normal(0, 1, 3))
        mottling = mottling + np.sin(verts @ direction * rng.uniform(18, 60) + rng.uniform(0, TWO_PI))
    return np.clip(0.93 - cavity * 0.2 + mottling * 0.012, 0.55, 1.0)


# ─── Jalur ilustratif ───────────────────────────────────────────────────────


class Grid:
    """Kisi voxel seukuran seluruh model, dengan koordinat dunia dalam meter."""

    def __init__(self, low, high):
        self.origin = low - VOXEL * 3
        self.shape = tuple(np.ceil((high - low) / VOXEL).astype(int) + 6)

    def center(self, index):
        return self.origin + (index + 0.5) * VOXEL

    def sample(self, field, points):
        coordinates = (points - self.origin) / VOXEL - 0.5
        return ndimage.map_coordinates(field, coordinates.T, order=1, mode="nearest")


def voxelize(grid, verts, faces):
    """Isi mesh tertutup: tiap kolom voxel dipotongkan dengan segitiga, lalu bagian antar pasangan potongan diisi."""
    tri = (verts[faces] - grid.origin) / VOXEL - 0.5
    columns, heights = [], []
    # Pergeseran kecil supaya kolom tidak tepat mengenai tepi segitiga
    nudge = 0.0137
    for a, b, c in tri:
        d = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if abs(d) < 1e-12:
            continue
        x0, x1 = int(np.ceil(min(a[0], b[0], c[0]) - nudge)), int(np.floor(max(a[0], b[0], c[0]) - nudge))
        y0, y1 = int(np.ceil(min(a[1], b[1], c[1]) - nudge)), int(np.floor(max(a[1], b[1], c[1]) - nudge))
        if x1 < x0 or y1 < y0:
            continue
        i, j = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1), indexing="ij")
        px, py = i + nudge, j + nudge
        v = ((px - a[0]) * (c[1] - a[1]) - (py - a[1]) * (c[0] - a[0])) / d
        w = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) / d
        hit = (v >= 0) & (w >= 0) & (v + w <= 1)
        if hit.any():
            columns.append(np.column_stack([i[hit], j[hit]]))
            heights.append(a[2] + v[hit] * (b[2] - a[2]) + w[hit] * (c[2] - a[2]))
    columns, heights = np.vstack(columns), np.concatenate(heights)
    order = np.lexsort((heights, columns[:, 1], columns[:, 0]))
    columns, heights = columns[order], heights[order]
    breaks = np.flatnonzero(np.any(np.diff(columns, axis=0) != 0, axis=1)) + 1
    mask = np.zeros(grid.shape, dtype=bool)
    odd = []
    for start, end in zip(np.r_[0, breaks], np.r_[breaks, len(columns)]):
        i, j = columns[start]
        if (end - start) % 2:
            odd.append((i, j))
            continue
        for low, high in zip(heights[start:end:2], heights[start + 1 : end : 2]):
            mask[i, j, int(np.ceil(low)) : int(np.floor(high)) + 1] = True
    # Kolom yang potongannya ganjil mengikuti kolom tetangganya
    for i, j in odd:
        mask[i, j, :] = (mask[i - 1, j, :].astype(int) + mask[i + 1, j, :] + mask[i, j - 1, :] + mask[i, j + 1, :]) >= 2
    return mask


class Lumen:
    """Rongga satu bagian organ sebagai graf voxel. Bobot sisi membesar di dekat dinding."""

    def __init__(self, grid, verts, faces):
        self.grid = grid
        self.mask = voxelize(grid, verts, faces)
        self.clearance = ndimage.distance_transform_edt(self.mask) * VOXEL
        cells = np.argwhere(self.mask)
        number = -np.ones(grid.shape, dtype=np.int32)
        number[tuple(cells.T)] = np.arange(len(cells))
        rows, targets, weights = [], [], []
        steps = [(1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 0), (1, -1, 0), (1, 0, 1), (1, 0, -1), (0, 1, 1), (0, 1, -1), (1, 1, 1), (1, 1, -1), (1, -1, 1), (1, -1, -1)]
        limit = np.array(grid.shape)
        wall = self.clearance[tuple(cells.T)]
        for step in steps:
            other = cells + step
            valid = np.all((other >= 0) & (other < limit), axis=1)
            target = np.full(len(cells), -1, dtype=np.int32)
            target[valid] = number[tuple(other[valid].T)]
            keep = target >= 0
            middle = (wall[keep] + wall[target[keep]]) / 2
            rows.append(np.flatnonzero(keep))
            targets.append(target[keep])
            weights.append(VOXEL * np.linalg.norm(step) * (1 + (0.015 / middle) ** 2))
        graph = coo_matrix((np.concatenate(weights), (np.concatenate(rows), np.concatenate(targets))), shape=(len(cells), len(cells))).tocsr()
        _, labels = connected_components(graph, directed=False)
        self.main = np.flatnonzero(labels == np.bincount(labels).argmax())
        self.cells, self.graph = cells, graph
        self.points = grid.center(cells)
        self.tree = cKDTree(self.points[self.main])

    def nearest(self, point):
        return self.main[self.tree.query(point)[1]]

    def ends(self):
        """Dua ujung terjauh rongga, yaitu kedua mulut tabung."""
        first = self.farthest(self.main[0])
        return first, self.farthest(first)

    def farthest(self, start):
        distance = dijkstra(self.graph, directed=False, indices=start)
        distance[~np.isfinite(distance)] = -1
        return int(np.argmax(distance))

    def route(self, start, end):
        _, previous = dijkstra(self.graph, directed=False, indices=start, return_predecessors=True)
        chain = [end]
        while chain[-1] != start:
            chain.append(previous[chain[-1]])
        return smooth_inside(self.points[chain[::-1]], self.grid, self.clearance, 8)

    def loop(self, rng, stops=5, wide=0.012):
        """Lintasan tertutup melalui beberapa titik acak di bagian rongga yang lebar."""
        wall = self.clearance[tuple(self.cells[self.main].T)]
        chosen = rng.choice(self.main[wall >= wide], stops, replace=False).tolist()
        chain = []
        for a, b in zip(chosen, chosen[1:] + chosen[:1]):
            _, previous = dijkstra(self.graph, directed=False, indices=a, return_predecessors=True)
            leg = [b]
            while leg[-1] != a:
                leg.append(previous[leg[-1]])
            chain += leg[::-1][:-1]
        smoothed = ndimage.gaussian_filter1d(self.points[chain], 8, axis=0, mode="wrap")
        return np.vstack([smoothed, smoothed[:1]])

    def waypoints(self, spacing=0.03, wide=0.004):
        """Titik di bagian rongga yang lebar, saling berjarak, mengutamakan yang paling jauh dari dinding."""
        wall = self.clearance[tuple(self.cells[self.main].T)]
        candidates = self.main[wall >= wide]
        tree = cKDTree(self.points[candidates])
        free = np.ones(len(candidates), dtype=bool)
        chosen = []
        for index in np.argsort(-wall[wall >= wide]):
            if free[index]:
                chosen.append(int(candidates[index]))
                free[tree.query_ball_point(self.points[candidates[index]], spacing)] = False
        return chosen

    def tour(self, start, end):
        """Jalur dari start ke end yang melewati semua titik rongga, dengan urutan yang total jaraknya pendek."""
        stops = [start, *[w for w in self.waypoints() if w not in (start, end)], end]
        distance, previous = dijkstra(self.graph, directed=False, indices=stops, return_predecessors=True)
        cost = distance[:, stops]
        order = [0]
        left = set(range(1, len(stops) - 1))
        while left:
            nearest = min(left, key=lambda k: cost[order[-1], k])
            order.append(nearest)
            left.remove(nearest)
        order.append(len(stops) - 1)
        improved = True
        while improved:
            improved = False
            for i in range(1, len(order) - 2):
                for j in range(i + 1, len(order) - 1):
                    before = cost[order[i - 1], order[i]] + cost[order[j], order[j + 1]]
                    after = cost[order[i - 1], order[j]] + cost[order[i], order[j + 1]]
                    if after < before - 1e-9:
                        order[i : j + 1] = order[i : j + 1][::-1]
                        improved = True
        chain = [stops[order[0]]]
        for a, b in zip(order[:-1], order[1:]):
            leg = [stops[b]]
            while leg[-1] != stops[a]:
                leg.append(previous[a, leg[-1]])
            chain += leg[::-1][1:]
        return smooth_inside(self.points[chain], self.grid, self.clearance, 5)


def smooth_inside(points, grid, clearance, sigma):
    """Menghaluskan jalur; bagian yang keluar dari rongga memakai penghalusan yang lebih ringan."""
    points = resample(points, max(int(np.linalg.norm(np.diff(points, axis=0), axis=1).sum() / VOXEL), 8))
    result = points
    for width in (sigma / 4, sigma / 2, sigma):
        smoothed = ndimage.gaussian_filter1d(points, width, axis=0, mode="nearest")
        smoothed[0], smoothed[-1] = points[0], points[-1]
        wider = ndimage.binary_dilation(grid.sample(clearance, smoothed) < VOXEL, iterations=4)
        result = np.where(wider[:, None], result, smoothed)
    return result


def build_route(points, grid, clearance):
    """Garis tengah dengan titik berjarak sama, arah, kerangka putar, dan lebar rongga."""
    points = resample(points, max(int(np.linalg.norm(np.diff(points, axis=0), axis=1).sum() / ROUTE_STEP), 8))
    tangent = normalized(ndimage.gaussian_filter1d(np.gradient(points, axis=0), 2, axis=0, mode="nearest"))
    normal = np.zeros_like(points)
    current = normalized(np.cross(tangent[0], [0.31, 0.2, 0.93]))
    for i, direction in enumerate(tangent):
        current = normalized(current - direction * (current @ direction))
        normal[i] = current
    return {"points": points, "tangent": tangent, "normal": normal, "binormal": np.cross(tangent, normal), "radius": np.maximum(grid.sample(clearance, points), VOXEL)}


def resample(path, count):
    steps = np.linalg.norm(np.diff(path, axis=0), axis=1)
    arc = np.concatenate([[0], np.cumsum(steps)])
    targets = np.linspace(0, arc[-1], count)
    return np.column_stack([np.interp(targets, arc, path[:, k]) for k in range(3)])


# ─── Bentuk partikel ────────────────────────────────────────────────────────


def fragment_mesh(rng):
    n = rng.integers(6, 9)
    angles = np.sort(rng.uniform(0, TWO_PI, n))
    radii = rng.uniform(0.55, 1.0, n)
    ring = np.column_stack([np.cos(angles) * radii * 1.3, np.sin(angles) * radii])
    top = np.column_stack([ring, rng.uniform(0.1, 0.24, n)])
    bottom = np.column_stack([ring, -rng.uniform(0.06, 0.16, n)])
    verts = np.vstack([top, bottom, [[0, 0, 0.26]], [[0, 0, -0.16]]])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [(i, j, 2 * n), (n + j, n + i, 2 * n + 1), (i, n + i, n + j), (i, n + j, j)]
    return verts, np.array(faces)


def film_mesh(rng):
    n = rng.integers(7, 10)
    angles = np.sort(rng.uniform(0, TWO_PI, n))
    radii = rng.uniform(0.55, 1.1, n)
    ring = np.column_stack([np.cos(angles) * radii * 1.2, np.sin(angles) * radii * 0.9])
    fold = rng.normal(0, 1, 2)
    height = 0.28 * np.abs(ring @ fold) / max(np.linalg.norm(fold), 1e-6) - 0.14
    verts = np.vstack([np.column_stack([ring, height + 0.03]), np.column_stack([ring, height - 0.03]), [[0, 0, -0.1]], [[0, 0, -0.16]]])
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [(i, j, 2 * n), (n + j, n + i, 2 * n + 1), (i, n + i, n + j), (i, n + j, j)]
    return verts, np.array(faces)


def pellet_mesh(rng):
    t = (1 + 5**0.5) / 2
    base = np.array([(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)], dtype=float)
    base = normalized(base)
    faces = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    verts = list(base)
    cache = {}

    def middle(a, b):
        key = (min(a, b), max(a, b))
        if key not in cache:
            m = verts[a] + verts[b]
            verts.append(m / np.linalg.norm(m))
            cache[key] = len(verts) - 1
        return cache[key]

    next_faces = []
    for a, b, c in faces:
        ab, bc, ca = middle(a, b), middle(b, c), middle(c, a)
        next_faces += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
    verts = np.array(verts)
    verts = verts * (1 + rng.uniform(-0.09, 0.09, (len(verts), 1)))
    verts[:, 2] *= rng.uniform(0.72, 0.95)
    return verts * 0.8, np.array(next_faces)


def fiber_mesh(rng):
    samples, radial = 16, 4
    heading = np.cumsum(rng.normal(0, 0.5, samples)) + rng.uniform(0, TWO_PI)
    path = np.column_stack([np.cumsum(np.cos(heading)), np.cumsum(np.sin(heading)), np.cumsum(rng.normal(0, 0.12, samples))]) * 0.27
    path -= path.mean(axis=0)
    tangent = normalized(np.gradient(path, axis=0))
    normal = normalized(np.cross(tangent[0], [0.0, 0.0, 1.0]))
    rings = []
    for i in range(samples):
        normal = normalized(normal - tangent[i] * (normal @ tangent[i]))
        binormal = np.cross(tangent[i], normal)
        theta = np.arange(radial) / radial * TWO_PI
        rings.append(path[i] + 0.09 * (np.outer(np.cos(theta), normal) + np.outer(np.sin(theta), binormal)))
    verts = np.vstack(rings)
    faces = []
    for i in range(samples - 1):
        for j in range(radial):
            k = (j + 1) % radial
            a, b, c, d = i * radial + j, i * radial + k, (i + 1) * radial + k, (i + 1) * radial + j
            faces += [(a, b, c), (a, c, d)]
    faces += [(0, 2, 1), (0, 3, 2), ((samples - 1) * radial, (samples - 1) * radial + 1, (samples - 1) * radial + 2), ((samples - 1) * radial, (samples - 1) * radial + 2, (samples - 1) * radial + 3)]
    return verts, np.array(faces)


def unit_shape(verts, faces, kind):
    verts = verts - verts.mean(axis=0)
    if kind == "serat":
        # Sumbu panjang serat menjadi sumbu x, supaya bisa searah jalur
        _, _, axes = np.linalg.svd(verts, full_matrices=False)
        verts = verts @ axes.T
    verts = verts / np.linalg.norm(verts, axis=1).max()
    return flat(verts, faces)


def flat(verts, faces):
    tri = verts[faces]
    normals = normalized(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]))
    return tri.reshape(-1, 3), np.repeat(normals, 3, axis=0), np.arange(len(tri) * 3)


def quaternion(axis, angle):
    angle = np.asarray(angle)[..., None]
    return np.concatenate([axis * np.sin(angle / 2), np.cos(angle / 2)], axis=-1)


def quaternion_multiply(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0)
    bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz], axis=-1)


def quaternion_from_frame(x, y, z):
    w = np.sqrt(np.maximum(0, 1 + x[:, 0] + y[:, 1] + z[:, 2])) / 2
    qx = np.copysign(np.sqrt(np.maximum(0, 1 + x[:, 0] - y[:, 1] - z[:, 2])) / 2, y[:, 2] - z[:, 1])
    qy = np.copysign(np.sqrt(np.maximum(0, 1 - x[:, 0] + y[:, 1] - z[:, 2])) / 2, z[:, 0] - x[:, 2])
    qz = np.copysign(np.sqrt(np.maximum(0, 1 - x[:, 0] - y[:, 1] + z[:, 2])) / 2, x[:, 1] - y[:, 0])
    return normalized(np.column_stack([qx, qy, qz, w]))


def fewer_keys(times, values, tolerance):
    """Membuang kunci yang bisa didekati garis lurus, tetapi tetap dalam batas toleransi."""
    keep = np.zeros(len(times), dtype=bool)
    keep[[0, -1]] = True
    stack = [(0, len(times) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        share = ((times[a + 1 : b] - times[a]) / (times[b] - times[a]))[:, None]
        error = np.linalg.norm(values[a + 1 : b] - (values[a] * (1 - share) + values[b] * share), axis=1)
        worst = int(np.argmax(error))
        if error[worst] > tolerance:
            middle = a + 1 + worst
            keep[middle] = True
            stack += [(a, middle), (middle, b)]
    return times[keep], values[keep]


# ─── Penulisan ──────────────────────────────────────────────────────────────


class Glb:
    def __init__(self):
        self.blob, self.views, self.accessors = bytearray(), [], []

    def add(self, values, component, kind, target=None, bounds=False):
        while len(self.blob) % 4:
            self.blob.append(0)
        raw = values.tobytes()
        view = {"buffer": 0, "byteOffset": len(self.blob), "byteLength": len(raw)}
        if target:
            view["target"] = target
        self.views.append(view)
        self.blob.extend(raw)
        accessor = {"bufferView": len(self.views) - 1, "componentType": component, "count": len(values), "type": kind}
        if bounds:
            reshaped = values.reshape(len(values), -1)
            accessor["min"] = [float(v) for v in reshaped.min(axis=0)]
            accessor["max"] = [float(v) for v in reshaped.max(axis=0)]
        self.accessors.append(accessor)
        return len(self.accessors) - 1


def write_usdz(target, organs, particles):
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp:
        temp = pathlib.Path(temp)
        stage = Usd.Stage.CreateNew(str(temp / "model.usdc"))
        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        UsdGeom.SetStageMetersPerUnit(stage, 1.0)
        root = UsdGeom.Xform.Define(stage, "/Root")
        stage.SetDefaultPrim(root.GetPrim())
        Usd.ModelAPI(root.GetPrim()).SetKind(Kind.Tokens.component)
        UsdGeom.Scope.Define(stage, "/Root/Materials")

        def material(name, color, roughness, opacity, emissive=None):
            mat = UsdShade.Material.Define(stage, f"/Root/Materials/{name}")
            shader = UsdShade.Shader.Define(stage, f"/Root/Materials/{name}/PreviewSurface")
            shader.CreateIdAttr("UsdPreviewSurface")
            shader.CreateInput("useSpecularWorkflow", Sdf.ValueTypeNames.Int).Set(0)
            shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
            shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(roughness)
            shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(tuple(float(c) for c in color))
            if opacity < 1:
                shader.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(opacity)
            if emissive is not None:
                shader.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(tuple(float(c) for c in emissive))
            output = shader.CreateOutput("surface", Sdf.ValueTypeNames.Token)
            mat.CreateSurfaceOutput().ConnectToSource(output)
            return mat

        def mesh(path, verts, normals, indices, mat):
            prim = UsdGeom.Mesh.Define(stage, path)
            prim.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(verts.astype(np.float32)))
            prim.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(normals.astype(np.float32)))
            prim.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
            prim.CreateFaceVertexCountsAttr(Vt.IntArray(np.full(len(indices) // 3, 3).tolist()))
            prim.CreateFaceVertexIndicesAttr(Vt.IntArray(indices.tolist()))
            prim.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
            prim.CreateDoubleSidedAttr(False)
            prim.CreateExtentAttr(Vt.Vec3fArray([tuple(float(v) for v in verts.min(axis=0)), tuple(float(v) for v in verts.max(axis=0))]))
            UsdShade.MaterialBindingAPI.Apply(prim.GetPrim()).Bind(mat)

        for name, data in organs.items():
            look = ORGAN_LOOK[name]
            mesh(f"/Root/{name}", data["verts"], data["normals"], data["faces"].ravel(), material(name, hex_linear(look["color"]), look["roughness"], look["alpha"]))
        materials = {kind: material(f"partikel_{kind}", hex_linear(color), 0.35, 1.0, hex_linear(color) * PARTICLE_EMISSIVE) for kind, color in PARTICLE_LOOK.items()}
        stage.SetStartTimeCode(0)
        stage.SetEndTimeCode(FULL_DURATION * USD_FPS)
        stage.SetTimeCodesPerSecond(USD_FPS)
        for i, particle in enumerate(particles):
            path = f"/Root/partikel_{i + 1}"
            mesh(path, particle["positions"], particle["normals"], particle["indices"], materials[particle["kind"]])
            xform = UsdGeom.Xformable(stage.GetPrimAtPath(path))
            translate, orient, scale = xform.AddTranslateOp(UsdGeom.XformOp.PrecisionFloat), xform.AddOrientOp(), xform.AddScaleOp()
            track = particle["full"]
            for moment, value in zip(*track["translation"]):
                translate.Set(Gf.Vec3f(*(float(v) for v in value)), float(moment) * USD_FPS)
            for moment, value in zip(*track["scale"]):
                # Skala nol membuat matriks tidak bisa dibalik di beberapa penampil USD
                size = max(float(value[0]), 0.0001)
                scale.Set(Gf.Vec3f(size, size, size), float(moment) * USD_FPS)
            for moment, value in zip(*track["rotation"]):
                x, y, z, w = (float(v) for v in value)
                orient.Set(Gf.Quatf(w, x, y, z), float(moment) * USD_FPS)
        stage.GetRootLayer().Save()
        target = target.resolve()
        cwd = os.getcwd()
        os.chdir(temp)
        try:
            assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath("model.usdc"), str(target)), "USDZ gagal"
        finally:
            os.chdir(cwd)
        del stage


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    grouped = {}
    raw_parts = {}
    for organ, fma, target in PARTS:
        points, faces = read_stl(SOURCE_DIR / f"{fma}.stl")
        reduction = max(0.0, 1 - target / len(faces))
        if reduction > 0:
            points, faces = fast_simplification.simplify(points.astype(np.float32), faces.astype(np.int32), target_reduction=reduction, agg=5)
        # Sumbu BodyParts3D: z ke atas, y ke belakang tubuh. Hasil: y ke atas dan wajah menghadap +z
        points = np.column_stack([points[:, 0], points[:, 2], -points[:, 1]]).astype(np.float64) * SCALE
        raw_parts[fma] = (points, faces)
        grouped.setdefault(organ, []).append((points, faces, fma))
        print(f"{fma} {organ}: {len(faces)} segitiga", flush=True)

    all_points = np.vstack([p for parts in grouped.values() for p, _, _ in parts])
    low, high = all_points.min(axis=0), all_points.max(axis=0)
    shift = np.array([(low[0] + high[0]) / 2, low[1], (low[2] + high[2]) / 2])

    organs = {}
    for organ, parts in grouped.items():
        verts, faces, offset = [], [], 0
        for points, part_faces, _ in parts:
            verts.append(points - shift)
            faces.append(part_faces + offset)
            offset += len(points)
        verts, faces = np.vstack(verts), np.vstack(faces)
        normals = vertex_normals(verts, faces)
        organs[organ] = {"verts": verts, "faces": faces, "normals": normals, "shade": tissue_shade(verts, faces, normals, len(organ))}

    # Jalur ilustratif dari kerongkongan sampai rektum, mengikuti garis tengah rongga tiap bagian
    def moved(fma):
        points, part_faces = raw_parts[fma]
        return points - shift, part_faces

    grid = Grid(all_points.min(axis=0) - shift, all_points.max(axis=0) - shift)
    lumens = {fma: Lumen(grid, *moved(fma)) for fma in ("FMA7131", "FMA7148", "FMA7206", "FMA7207", "FMA7208", "FMA14543nsn", "FMA14544")}
    appendix = voxelize(grid, *moved("FMA14542"))
    union = appendix.copy()
    for lumen in lumens.values():
        union |= lumen.mask
    clearance = ndimage.distance_transform_edt(union) * VOXEL

    def tube(fma, near=None):
        """Jalur satu tabung dari ujung yang paling dekat ke titik sebelumnya."""
        lumen = lumens[fma]
        a, b = lumen.ends()
        if near is not None and np.linalg.norm(lumen.points[b] - near) < np.linalg.norm(lumen.points[a] - near):
            a, b = b, a
        return lumen.route(a, b)

    esophagus = tube("FMA7131")
    if esophagus[0, 1] < esophagus[-1, 1]:
        esophagus = esophagus[::-1]
    stomach_center = moved("FMA7148")[0].mean(axis=0)
    duodenum = tube("FMA7206", stomach_center)
    stomach_lumen = lumens["FMA7148"]
    stomach = stomach_lumen.route(stomach_lumen.nearest(esophagus[-1]), stomach_lumen.nearest(duodenum[0]))
    # Usus besar dimulai dari ujung kolon di dekat usus buntu dan berakhir di ujung yang dekat rektum
    colon_lumen = lumens["FMA14543nsn"]
    rectum_top = moved("FMA14544")[0]
    rectum_top = rectum_top[np.argsort(-rectum_top[:, 1])[:20]].mean(axis=0)
    colon_end, colon_start = sorted(colon_lumen.ends(), key=lambda index: np.linalg.norm(colon_lumen.points[index] - rectum_top))
    colon = colon_lumen.route(colon_start, colon_end)
    rectum = tube("FMA14544", colon[-1])
    # Jejunum dan ileum disambung di pasangan titik rongga terdekat, jauh dari ujung masuk dan ujung keluarnya
    jejunum_lumen, ileum_lumen = lumens["FMA7207"], lumens["FMA7208"]
    jejunum_start = jejunum_lumen.nearest(duodenum[-1])
    ileum_end = ileum_lumen.nearest(colon[0])
    jejunum_stops = np.array([w for w in jejunum_lumen.waypoints() if np.linalg.norm(jejunum_lumen.points[w] - jejunum_lumen.points[jejunum_start]) > 0.05])
    ileum_stops = np.array([w for w in ileum_lumen.waypoints() if np.linalg.norm(ileum_lumen.points[w] - ileum_lumen.points[ileum_end]) > 0.05])
    gap = np.linalg.norm(jejunum_lumen.points[jejunum_stops][:, None] - ileum_lumen.points[ileum_stops][None], axis=2)
    pair = np.unravel_index(np.argmin(gap), gap.shape)
    jejunum = jejunum_lumen.tour(jejunum_start, int(jejunum_stops[pair[0]]))
    ileum = ileum_lumen.tour(int(ileum_stops[pair[1]]), ileum_end)
    parts = {"kerongkongan": [esophagus], "lambung": [stomach], "usus_halus": [duodenum, jejunum, ileum], "usus_besar": [colon, rectum]}
    for name, pieces in parts.items():
        gaps = [float(np.linalg.norm(a[-1] - b[0]) * 100) for a, b in zip(pieces[:-1], pieces[1:])]
        print(f"jalur {name}: panjang {sum(np.linalg.norm(np.diff(x, axis=0), axis=1).sum() for x in pieces):.2f} m, celah sambungan {[round(g, 1) for g in gaps]} cm", flush=True)
    routes = {name: build_route(smooth_inside(np.vstack(pieces), grid, clearance, 3), grid, clearance) for name, pieces in parts.items()}
    joined = np.vstack([routes[name]["points"] for name in SECTIONS])
    print("celah antar organ", [round(float(np.linalg.norm(routes[a]["points"][-1] - routes[b]["points"][0]) * 100), 1) for a, b in zip(SECTIONS[:-1], SECTIONS[1:])], "cm", flush=True)
    full_route = build_route(smooth_inside(joined, grid, clearance, 3), grid, clearance)
    lengths = np.array([np.linalg.norm(np.diff(routes[name]["points"], axis=0), axis=1).sum() for name in SECTIONS])
    arc_marks = np.r_[0, np.cumsum(lengths) / lengths.sum()]
    time_marks = np.r_[0, np.cumsum(FULL_TIME_SHARE)]

    # Partikel: empat bentuk, dua variasi tiap bentuk; satu mesh dipakai bersama agar hemat memori grafis
    rng = np.random.default_rng(404)
    makers = {"fragmen": fragment_mesh, "serat": fiber_mesh, "film": film_mesh, "pelet": pellet_mesh}
    shapes = []
    for variant in range(2):
        for kind in PARTICLE_KINDS:
            shapes.append({"kind": kind, "variant": variant, "shape": unit_shape(*makers[kind](rng), kind)})
    particles = []
    for i in range(PARTICLE_COUNT):
        kind_index, variant = i % 4, (i // 4) % 2
        kind = PARTICLE_KINDS[kind_index]
        positions, normals, indices = shapes[variant * 4 + kind_index]["shape"]
        particles.append(
            {
                "kind": kind,
                "mesh": variant * 4 + kind_index,
                "positions": positions,
                "normals": normals,
                "indices": indices,
                # Jari-jari tampak dalam meter. Ini sangat diperbesar dan tidak menunjukkan ukuran sebenarnya
                "size": rng.uniform(0.009, 0.013),
                "lane": rng.uniform(0.35, 0.85),
                "angle": rng.uniform(0, TWO_PI),
                "wave": rng.uniform(0, TWO_PI),
                # Serat berputar pada sumbu panjangnya supaya tetap searah jalur
                "axis": np.array([1.0, 0.0, 0.0]) if kind == "serat" else normalized(rng.normal(0, 1, 3)),
                "turns": int(rng.integers(2, 5)),
                "tilt": normalized(rng.normal(0, 1, 4)) if kind != "serat" else np.array([0.0, 0.0, 0.0, 1.0]),
            }
        )

    def simulate(particle, clip, route, phase, closed=False):
        """Posisi, ukuran, dan arah satu partikel tiap langkah waktu, lalu dipadatkan menjadi kunci animasi."""
        duration = clip["duration"]
        times = np.arange(0, duration + SAMPLE_STEP / 2, SAMPLE_STEP)
        share = times / duration
        # Maju terus dengan kecepatan yang sedikit berubah; ayunannya berulang tepat di akhir klip
        along = (phase + share + clip["sway"] * np.sin(TWO_PI * clip["waves"] * share + particle["wave"])) % 1.0
        arc = np.interp(along, time_marks, arc_marks) if len(clip["sections"]) > 1 else along
        where = arc * (len(route["points"]) - 1)
        grid_index = np.arange(len(route["points"]))

        def on_route(key):
            return np.column_stack([np.interp(where, grid_index, route[key][:, k]) for k in range(3)])

        center, tangent, normal = on_route("points"), normalized(on_route("tangent")), normalized(on_route("normal"))
        binormal = np.cross(tangent, normal)
        radius = np.interp(where, grid_index, route["radius"])
        # Ukuran mengikuti lebar rongga, jadi partikel tidak lebih besar daripada ruang yang tersedia
        size = np.maximum(np.minimum(particle["size"] * clip.get("shrink", 1), radius * 1.05), 0.005)
        size = ndimage.gaussian_filter1d(size, 6, mode="nearest")
        angle = particle["angle"] + TWO_PI * clip["turns"] * share
        offset = particle["lane"] * np.maximum(radius - size, 0)
        position = center + offset[:, None] * (np.cos(angle)[:, None] * normal + np.sin(angle)[:, None] * binormal)
        tight = grid.sample(clearance, position) < size * 0.7
        position[tight] = center[tight]
        # Muncul dan hilang perlahan di ujung jalur, dan lompatan kembali ke awal tidak terlihat
        fade = np.ones(len(along)) if closed else np.clip(np.minimum(along, 1 - along) / 0.012, 0, 1)
        scale = size * fade
        if not closed:
            jumps = np.flatnonzero(np.abs(np.diff(along)) > 0.5)
            scale[jumps], scale[jumps + 1] = 0, 0
        # Lintasan tertutup tidak punya arah maju yang tetap, jadi partikelnya hanya berputar pelan
        frame = np.tile([0.0, 0.0, 0.0, 1.0], (len(along), 1)) if closed else quaternion_from_frame(tangent, normal, binormal)
        spin = quaternion(particle["axis"], particle["turns"] * TWO_PI * share)
        rotation = normalized(quaternion_multiply(quaternion_multiply(frame, spin), particle["tilt"]))
        for k in range(1, len(rotation)):
            if rotation[k] @ rotation[k - 1] < 0:
                rotation[k] = -rotation[k]
        stats = (grid.sample(union.astype(np.float32), position[fade > 0]) >= 0.5, grid.sample(clearance, position[fade > 0]) >= size[fade > 0] * 0.6, size[fade > 0])
        return {
            "translation": fewer_keys(times, position, 0.0012),
            "scale": fewer_keys(times, scale[:, None], 0.0003),
            "rotation": fewer_keys(times, rotation, 0.05),
            "stats": stats,
        }

    clips = []
    for name, clip in CLIPS.items():
        route = full_route if len(clip["sections"]) > 1 else routes[clip["sections"][0]]
        phases = (np.arange(clip["count"]) + rng.uniform(-0.25, 0.25, clip["count"])) / clip["count"]
        items = {}
        for i in range(clip["count"]):
            if clip.get("wander") and i % 5:
                items[i] = simulate(particles[i], clip, build_route(stomach_lumen.loop(rng), grid, clearance), rng.uniform(0, 1), closed=True)
            else:
                items[i] = simulate(particles[i], clip, route, phases[i] % 1.0)
        inside = np.concatenate([item["stats"][0] for item in items.values()])
        roomy = np.concatenate([item["stats"][1] for item in items.values()])
        sizes = np.concatenate([item["stats"][2] for item in items.values()])
        keys = sum(len(item["translation"][0]) for item in items.values())
        print(f"klip {name}: pusat di dalam rongga {inside.mean() * 100:.1f}%, muat di rongga {roomy.mean() * 100:.1f}%, jari-jari {sizes.mean() * 1000:.1f} mm, kunci posisi {keys}", flush=True)
        clips.append((name, clip["duration"], items))
    for i, particle in enumerate(particles):
        particle["full"] = clips[0][2][i]

    # GLB
    glb = Glb()
    materials, meshes, nodes = [], [], []
    root_children = []
    for name, data in organs.items():
        look = ORGAN_LOOK[name]
        materials.append(
            {
                "name": name,
                "alphaMode": "BLEND",
                "pbrMetallicRoughness": {"baseColorFactor": [*[round(float(c), 4) for c in hex_linear(look["color"])], look["alpha"]], "metallicFactor": 0.0, "roughnessFactor": look["roughness"]},
            }
        )
        color = np.round(np.column_stack([data["shade"], data["shade"], data["shade"], np.ones(len(data["shade"]))]) * 255).astype(np.uint8)
        assert len(data["verts"]) < 65535
        color_accessor = glb.add(color, 5121, "VEC4", 34962)
        glb.accessors[color_accessor]["normalized"] = True
        primitive = {
            "attributes": {
                "POSITION": glb.add(data["verts"].astype(np.float32), 5126, "VEC3", 34962, bounds=True),
                "NORMAL": glb.add(data["normals"].astype(np.float32), 5126, "VEC3", 34962),
                "COLOR_0": color_accessor,
            },
            "indices": glb.add(data["faces"].ravel().astype(np.uint16), 5123, "SCALAR", 34963),
            "material": len(materials) - 1,
        }
        meshes.append({"name": name, "primitives": [primitive]})
        nodes.append({"name": name, "mesh": len(meshes) - 1})
        root_children.append(len(nodes) - 1)
    particle_material = {}
    for kind, color in PARTICLE_LOOK.items():
        materials.append({"name": f"partikel_{kind}", "emissiveFactor": [round(float(c) * PARTICLE_EMISSIVE, 4) for c in hex_linear(color)], "pbrMetallicRoughness": {"baseColorFactor": [*[round(float(c), 4) for c in hex_linear(color)], 1.0], "metallicFactor": 0.0, "roughnessFactor": 0.35}})
        particle_material[kind] = len(materials) - 1
    shape_meshes = {}
    particle_nodes = []
    for i, particle in enumerate(particles):
        if particle["mesh"] not in shape_meshes:
            primitive = {
                "attributes": {"POSITION": glb.add(particle["positions"].astype(np.float32), 5126, "VEC3", 34962, bounds=True), "NORMAL": glb.add(particle["normals"].astype(np.float32), 5126, "VEC3", 34962)},
                "indices": glb.add(particle["indices"].astype(np.uint16), 5123, "SCALAR", 34963),
                "material": particle_material[particle["kind"]],
            }
            meshes.append({"name": f"bentuk_{particle['kind']}_{particle['mesh']}", "primitives": [primitive]})
            shape_meshes[particle["mesh"]] = len(meshes) - 1
        rest = particle["full"]["translation"][1][0]
        nodes.append({"name": f"partikel_{i + 1}", "mesh": shape_meshes[particle["mesh"]], "translation": [float(v) for v in rest], "scale": [float(particle["size"])] * 3})
        particle_nodes.append(len(nodes) - 1)
        root_children.append(len(nodes) - 1)
    animations = []
    for name, duration, items in clips:
        samplers, channels = [], []
        hidden_times = None

        def channel(node, target, moments, values, kind):
            input_accessor = moments if isinstance(moments, int) else glb.add(moments.astype(np.float32), 5126, "SCALAR", bounds=True)
            samplers.append({"input": input_accessor, "output": glb.add(values.astype(np.float32), 5126, kind), "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": node, "path": target}})

        for i, node in enumerate(particle_nodes):
            item = items.get(i)
            if item is None:
                # Partikel yang tidak dipakai jalur ini disembunyikan
                if hidden_times is None:
                    hidden_times = glb.add(np.array([0, duration], dtype=np.float32), 5126, "SCALAR", bounds=True)
                channel(node, "scale", hidden_times, np.zeros((2, 3)), "VEC3")
                continue
            channel(node, "translation", item["translation"][0], item["translation"][1], "VEC3")
            channel(node, "scale", item["scale"][0], np.repeat(item["scale"][1], 3, axis=1), "VEC3")
            channel(node, "rotation", item["rotation"][0], normalized(item["rotation"][1]), "VEC4")
        animations.append({"name": name, "samplers": samplers, "channels": channels})
    nodes.append({"name": "SaluranPencernaan", "children": root_children})
    while len(glb.blob) % 4:
        glb.blob.append(0)
    document = {
        "asset": {"version": "2.0", "generator": "MicroJourney scripts/build-organ-model.py", "copyright": CREDIT},
        "scene": 0,
        "scenes": [{"nodes": [len(nodes) - 1]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "animations": animations,
        "accessors": glb.accessors,
        "bufferViews": glb.views,
        "buffers": [{"byteLength": len(glb.blob)}],
    }
    text = json.dumps(document, separators=(",", ":")).encode("utf-8")
    text += b" " * (-len(text) % 4)
    total = 12 + 8 + len(text) + 8 + len(glb.blob)
    with open(OUT_DIR / "digestive.glb", "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(text), b"JSON") + text)
        f.write(struct.pack("<I4s", len(glb.blob), b"BIN\0") + bytes(glb.blob))
    write_usdz(OUT_DIR / "digestive.usdz", organs, particles)

    triangles = sum(len(d["faces"]) for d in organs.values())
    print(f"organ {triangles:,} segitiga, partikel {sum(len(p['indices']) // 3 for p in particles):,} segitiga tampil, GLB {total // 1024} KB, USDZ {(OUT_DIR / 'digestive.usdz').stat().st_size // 1024} KB")
    size = high - low
    print(f"ukuran {size[0] * 100:.0f} x {size[1] * 100:.0f} x {size[2] * 100:.0f} cm")
    for name, data in organs.items():
        center = (data["verts"].min(axis=0) + data["verts"].max(axis=0)) / 2
        extent = data["verts"].max(axis=0) - data["verts"].min(axis=0)
        print(f"{name}: pusat {center[0]:.3f}m {center[1]:.3f}m {center[2]:.3f}m, ukuran {extent[0]:.3f} {extent[1]:.3f} {extent[2]:.3f}")
    # Lambung berada di sisi kiri tubuh (x positif bila wajah menghadap +z), rektum di sisi belakang
    print("cek arah: lambung x", round(float(organs["lambung"]["verts"][:, 0].mean()), 3), "rektum z", round(float(moved("FMA14544")[0][:, 2].mean()), 3), "lambung z", round(float(organs["lambung"]["verts"][:, 2].mean()), 3))


main()
