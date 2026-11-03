"""
Model mikroplastik v2: fragmen, serat, film, pelet, dan gabungannya, sebagai GLB dan USDZ dengan tekstur PBR.
Geometri tetap prosedural karena belum ada aset 3D partikel mikroplastik berlisensi yang layak dan bisa diunduh.
Bentuk mengikuti foto mikroskop di docs/Referensi_Model_Mikroplastik_3D.md. Ini ilustrasi, bukan hasil pindai.

Mesh dibuat ringan. Detail kecil (bidang patah, goresan, lipatan, lubang) dihitung dari fungsi tinggi yang sama
lalu disimpan sebagai normal map, relatif terhadap normal verteks yang terinterpolasi.
Lapisan goresan dan bercak aus diambil dari tekstur CC0 ambientCG: Plastic013B, Plastic018B, SurfaceImperfections015.
Cahaya memakai HDRI CC0 Poly Haven studio_small_09 yang diperkecil.

Butuh numpy, scipy, pillow, dan usd-core. Jalankan dari root repo:
  python scripts/build-microplastic-models-v2.py public/models/microplastic/v2 <folder tekstur CC0>
Folder tekstur berisi <id>/<id>_1K-JPG_<peta>.jpg dan studio_small_09/studio_small_09_1k.hdr.
"""

import itertools
import io
import json
import os
import pathlib
import struct
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw
from pxr import Kind, Sdf, Usd, UsdGeom, UsdShade, UsdUtils, Vt
from scipy import ndimage
from scipy.interpolate import LinearNDInterpolator
from scipy.spatial import Delaunay, cKDTree

OUT_DIR = pathlib.Path(sys.argv[1])
CC0_DIR = pathlib.Path(sys.argv[2])
TWO_PI = 2 * np.pi
ATLAS_SIZE = 1024


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def unit(vector):
    return vector / np.linalg.norm(vector)


def normalized(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def hex_rgb(value):
    return np.array([int(value[i : i + 2], 16) / 255 for i in (1, 3, 5)])


def srgb_to_linear(rgb):
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def mix(a, b, t):
    t = np.asarray(t)
    if t.ndim == 2:
        t = t[..., None]
    return a * (1 - t) + b * t


# ─── Lapisan detail ─────────────────────────────────────────────────────────


class Tiles:
    """Tekstur CC0 sebagai lapisan goresan dan bercak aus, diambil acak supaya tiap partikel berbeda."""

    def __init__(self, root):
        self.scratches = [self._height(root, "Plastic013B"), self._height(root, "Plastic018B")]
        self.scuffs = [self._gray(root, "Plastic013B", "Roughness"), self._gray(root, "Plastic018B", "Roughness")]
        self.dust = self._gray(root, "SurfaceImperfections015", "Displacement")

    @staticmethod
    def _gray(root, asset, kind):
        image = np.asarray(Image.open(root / asset / f"{asset}_1K-JPG_{kind}.jpg").convert("L"), dtype=np.float32) / 255
        return image

    def _height(self, root, asset):
        image = self._gray(root, asset, "Displacement")
        return image - np.median(image)

    @staticmethod
    def sample(tile, shape, rng, step=1.15):
        rows, cols = np.mgrid[0 : shape[0], 0 : shape[1]].astype(np.float32)
        angle = rng.uniform(0, TWO_PI)
        offset = rng.uniform(0, tile.shape[0], 2)
        c, s = np.cos(angle), np.sin(angle)
        y = (rows * c - cols * s) * step + offset[0]
        x = (rows * s + cols * c) * step + offset[1]
        return ndimage.map_coordinates(tile, [y, x], order=1, mode="grid-wrap")

    @staticmethod
    def triplanar(tile, dirs, rng, pixels_per_unit):
        offset = rng.uniform(0, tile.shape[0], 6)
        weights = np.abs(dirs) ** 4
        weights /= weights.sum(axis=-1, keepdims=True)
        p = dirs * pixels_per_unit
        total = 0
        for axis, (u, v) in enumerate(((1, 2), (2, 0), (0, 1))):
            layer = ndimage.map_coordinates(tile, [p[..., u] + offset[axis * 2], p[..., v] + offset[axis * 2 + 1]], order=1, mode="grid-wrap")
            total = total + layer * weights[..., axis]
        return total


def fbm(shape, rng, sigma):
    noise = ndimage.gaussian_filter(rng.normal(0, 1, shape).astype(np.float32), sigma, mode="wrap")
    return noise / max(float(noise.std()), 1e-6)


def speckles(shape, rng, density, sigma, cluster_sigma=24):
    """Titik-titik kecil yang berkelompok, seperti partikel halus yang menempel di permukaan."""
    cluster = smoothstep(-0.2, 1.0, fbm(shape, rng, cluster_sigma))
    impulses = (rng.random(shape) < density * cluster).astype(np.float32)
    dots = ndimage.gaussian_filter(impulses, sigma) * (TWO_PI * sigma**2)
    return np.clip(dots, 0, 1)


class Volume:
    """Noise tiga dimensi, jadi detail pelet menyambung di semua sisi tanpa kutub."""

    def __init__(self, rng, size=64, sigma=1.3):
        volume = ndimage.gaussian_filter(rng.normal(0, 1, (size, size, size)).astype(np.float32), sigma, mode="wrap")
        self.volume = volume / volume.std()
        self.size = size

    def __call__(self, points, frequency):
        coords = np.moveaxis(points * frequency, -1, 0) % self.size
        return ndimage.map_coordinates(self.volume, coords, order=1, mode="grid-wrap")


# ─── Kontur ─────────────────────────────────────────────────────────────────


def edge_samples(rng, corners, samples, chip):
    """Titik di sepanjang tepi. Tiap sisi berbeda: ada yang patah lurus, ada yang gompal."""
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
    """Bentuk sabit yang tidak simetris: busur luar dan dalam bertemu di dua ujung runcing."""
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


def densify(outline, step=0.012):
    """Kontur rapat untuk menghitung jarak ke tepi tanpa pola berulang dari titik kontur."""
    points, fractions = [], []
    n = len(outline)
    for i in range(n):
        a, b = outline[i], outline[(i + 1) % n]
        count = max(1, int(np.linalg.norm(b - a) / step))
        for t in np.arange(count) / count:
            points.append(a + (b - a) * t)
            fractions.append((i + t) / n)
    return np.array(points), np.array(fractions)


def vertex_normals(verts, faces):
    tri = verts[faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    normals = np.zeros_like(verts)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    return normalized(normals)


def vertex_tangents(positions, normals, uv, faces):
    """Tangent per verteks. Bitangen menuju atas gambar, yaitu v mengecil, sesuai aturan normal map glTF."""
    tri, tuv = positions[faces], uv[faces]
    e1, e2 = tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]
    d1, d2 = tuv[:, 1] - tuv[:, 0], tuv[:, 2] - tuv[:, 0]
    det = d1[:, 0] * d2[:, 1] - d2[:, 0] * d1[:, 1]
    det = np.where(np.abs(det) < 1e-12, np.inf, det)
    t = ((e1 * d2[:, 1:2] - e2 * d1[:, 1:2]).T / det).T
    b = ((e2 * d1[:, 0:1] - e1 * d2[:, 0:1]).T / det).T
    t = normalized(t)
    b = normalized(b)
    tangent, bitangent = np.zeros_like(positions), np.zeros_like(positions)
    for corner in range(3):
        np.add.at(tangent, faces[:, corner], t)
        np.add.at(bitangent, faces[:, corner], b)
    tangent = tangent - normals * (tangent * normals).sum(-1, keepdims=True)
    degenerate = np.linalg.norm(tangent, axis=-1) < 1e-8
    fallback = np.cross(normals, np.array([0.0, 1.0, 0.0]))
    fallback = np.where(np.linalg.norm(fallback, axis=-1, keepdims=True) < 1e-4, np.array([1.0, 0.0, 0.0]), fallback)
    tangent[degenerate] = fallback[degenerate]
    tangent = normalized(tangent - normals * (tangent * normals).sum(-1, keepdims=True))
    # v pada glTF naik ke bawah gambar, jadi atas gambar adalah kebalikan arah bitangen hasil hitungan
    sign = np.where((np.cross(normals, tangent) * -bitangent).sum(-1) < 0, -1.0, 1.0)
    return np.column_stack([tangent, sign])


# ─── Lembaran: fragmen dan film ─────────────────────────────────────────────


class Sheet:
    """Benda pipih: permukaan atas dan bawah di atas satu kontur, dengan dinding tepi yang punya verteks sendiri."""

    def __init__(self, seed, size, outline, inner, top, bottom, paint, deform=None, alpha=1.0, blend=False, wall_pad=0.04):
        self.rng = np.random.default_rng(seed + 1000)
        self.scale = size / 2
        self.outline = outline
        self.top = top
        self.bottom = bottom
        self.paint = paint
        self.deform = deform
        self.alpha = alpha
        self.blend = blend
        self.wall_pad = wall_pad
        self.xy, self.faces = triangulate(outline, inner)
        self.top_normals = vertex_normals(np.column_stack([self.xy, top(self.xy)]), self.faces)
        low, high = outline.min(axis=0) - wall_pad, outline.max(axis=0) + wall_pad
        self.low, self.high = low, high
        self.extent = (high - low) * self.scale

    def texel_rect(self, density):
        return np.ceil(self.extent * density).astype(int) + 6

    def mesh(self):
        """Posisi, normal, dan UV lokal. Dinding memakai UV yang keluar ke tepi, jadi tidak gepeng."""
        count = len(self.xy)
        z_top, z_bottom = self.top(self.xy), self.bottom(self.xy)
        directed = np.concatenate([self.faces[:, [0, 1]], self.faces[:, [1, 2]], self.faces[:, [2, 0]]])
        edges = directed[~np.isin(directed[:, 0] * count + directed[:, 1], directed[:, 1] * count + directed[:, 0])]
        top_v = np.column_stack([self.xy, z_top])
        bottom_v = np.column_stack([self.xy, z_bottom])
        direction = self.xy[edges[:, 1]] - self.xy[edges[:, 0]]
        outward = normalized(np.column_stack([direction[:, 1], -direction[:, 0]]))
        wall_uv_a = self.xy[edges[:, 0]] + outward * self.wall_pad * 0.8
        wall_uv_b = self.xy[edges[:, 1]] + outward * self.wall_pad * 0.8
        wall_v = np.stack([top_v[edges[:, 0]], bottom_v[edges[:, 0]], bottom_v[edges[:, 1]], top_v[edges[:, 1]]], axis=1).reshape(-1, 3)
        wall_uv = np.stack([self.xy[edges[:, 0]], wall_uv_a, wall_uv_b, self.xy[edges[:, 1]]], axis=1).reshape(-1, 2)
        wall_start = count * 2
        quads = wall_start + np.arange(len(edges))[:, None] * 4 + np.array([0, 1, 2, 3])
        wall_faces = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])
        faces = np.concatenate([self.faces, self.faces[:, ::-1] + count, wall_faces])
        verts = np.concatenate([top_v, bottom_v, wall_v])
        uv = np.concatenate([self.xy, self.xy, wall_uv])
        if self.deform:
            verts = self.deform(verts)
        normals = np.zeros_like(verts)
        normals[: count] = vertex_normals(verts[: count], self.faces)
        normals[count : wall_start] = vertex_normals(verts[count : wall_start], self.faces[:, ::-1])
        tri = verts[quads]
        wall_normals = normalized(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]))
        normals[wall_start:] = np.repeat(wall_normals, 4, axis=0)
        return verts * self.scale, normals, uv, faces

    def bake(self, width, height):
        """Warna, normal, kekasaran, dan alfa untuk satu kotak di atlas."""
        tpn_x = width / (self.high[0] - self.low[0])
        tpn_y = height / (self.high[1] - self.low[1])
        tpn = (tpn_x + tpn_y) / 2
        cols = self.low[0] + (np.arange(width) + 0.5) / tpn_x
        rows = self.high[1] - (np.arange(height) + 0.5) / tpn_y
        X, Y = np.meshgrid(cols, rows)
        points = np.column_stack([X.ravel(), Y.ravel()])
        H = self.top(points).reshape(X.shape)
        thickness = H - self.bottom(points).reshape(X.shape)
        image = Image.new("L", (width, height), 0)
        pixel = np.column_stack([(self.outline[:, 0] - self.low[0]) * tpn_x, (self.high[1] - self.outline[:, 1]) * tpn_y])
        ImageDraw.Draw(image).polygon([tuple(p) for p in pixel], fill=255)
        mask = np.asarray(image) > 0
        distance = ndimage.distance_transform_edt(mask) / tpn
        surface = self.paint(self.rng, X.shape, tpn, X, Y, H, thickness, distance, mask)
        H_total = H + surface["height"] / tpn
        dx = np.gradient(H_total, 1 / tpn_x, axis=1)
        dy = -np.gradient(H_total, 1 / tpn_y, axis=0)
        target = normalized(np.stack([-dx, -dy, np.ones_like(dx)], axis=-1))
        vertex = LinearNDInterpolator(self.xy, self.top_normals, fill_value=np.nan)(points).reshape(*X.shape, 3)
        vertex = np.where(np.isnan(vertex), np.array([0.0, 0.0, 1.0]), vertex)
        vertex = normalized(vertex)
        tangent = normalized(np.array([1.0, 0.0, 0.0]) - vertex * vertex[..., 0:1])
        bitangent = np.cross(vertex, tangent)
        normal = np.stack([(target * tangent).sum(-1), (target * bitangent).sum(-1), np.maximum((target * vertex).sum(-1), 0.05)], axis=-1)
        normal = normalized(normal)
        # Di luar kontur warna dilanjutkan dari tepi, dan normal dibuat datar untuk dinding
        nearest = ndimage.distance_transform_edt(~mask, return_distances=False, return_indices=True)
        base = surface["base"][nearest[0], nearest[1]]
        rough = surface["rough"][nearest[0], nearest[1]]
        alpha = surface["alpha"][nearest[0], nearest[1]] if "alpha" in surface else None
        wall_noise = fbm(X.shape, self.rng, 1.2)[..., None] * 0.07
        flat = normalized(np.array([0.0, 0.0, 1.0]) + np.concatenate([wall_noise, wall_noise * 0.5, np.zeros_like(wall_noise)], axis=-1))
        normal = np.where(mask[..., None], normal, flat)
        return {"base": base, "normal": normal, "rough": rough, "alpha": alpha}

    def atlas_uv(self, uv, x, y, width, height, size):
        u = (x + (uv[:, 0] - self.low[0]) / (self.high[0] - self.low[0]) * width) / size
        v = (y + (self.high[1] - uv[:, 1]) / (self.high[1] - self.low[1]) * height) / size
        return np.column_stack([u, v])


def weathered_plastic(tiles, thin, thick, wear, roughness=0.42, speck_color="#f4f7f2", speck=0.0009, scratch=1.0, wear_width=0.05, relief=1.0, chips=1.0):
    """Permukaan plastik yang sudah lapuk: warna mengikuti ketebalan, tepi aus, ada goresan, bercak, dan bintik."""
    thin, thick, wear, speck_rgb = hex_rgb(thin), hex_rgb(thick), hex_rgb(wear), hex_rgb(speck_color)

    def paint(rng, shape, tpn, X, Y, H, thickness, distance, mask):
        grooves = Tiles.sample(tiles.scratches[rng.integers(2)], shape, rng)
        scuff = Tiles.sample(tiles.scuffs[rng.integers(2)], shape, rng, step=0.8)
        scuff = np.clip((scuff - np.median(scuff)) * 2.2, -0.5, 1)
        dust = Tiles.sample(tiles.dust, shape, rng, step=0.9)
        dust = dust - dust.mean()
        dots = speckles(shape, rng, speck, 1.1)
        scratch_mask = np.clip(-grooves * 3.2, 0, 1) * scratch
        edge_noise = fbm(shape, rng, 7) * 0.5 + 0.5
        wear_mask = smoothstep(np.maximum(wear_width * (0.5 + edge_noise), 0.006), 0.0, distance) * mask
        inside = thickness[mask]
        t = smoothstep(*np.percentile(inside, [8, 92]), thickness) if inside.size else np.zeros(shape)
        mottling = fbm(shape, rng, 22) * 0.055 + fbm(shape, rng, 5) * 0.022 + dust * 0.38
        base = mix(thin, thick, t)
        base = base * (1 + mottling)[..., None]
        base = mix(base, wear, np.clip(wear_mask * 0.42 + scratch_mask * 0.62 + np.maximum(scuff, 0) * 0.08, 0, 0.9))
        base = mix(base, speck_rgb, dots * 0.85)
        rough = roughness + np.maximum(scuff, 0) * 0.26 + scratch_mask * 0.24 + wear_mask * 0.22 + dots * 0.2 + dust * 0.28
        edge_relief = smoothstep(0.14, 0.0, distance) * fbm(shape, rng, 3.5)
        height = (grooves * 5.0 * scratch + fbm(shape, rng, 1.2) * 0.14 + fbm(shape, rng, 4) * 0.5 + dust * 3.4 + dots * 1.5 + edge_relief * 1.6 * chips) * relief
        return {"base": np.clip(base, 0, 1), "rough": np.clip(rough, 0.05, 1), "height": height}

    return paint


def fragment(tiles, seed, size, colors, corners=7, stretch=1.25, thickness=0.12, notches=0, curl=0.0, twist=0.0, planes=7, radius_range=(0.6, 1.0), rim=0.0, ripple=0.0, spacing=0.27, crescent=None, chip=0.012, alpha=1.0, **paint_options):
    """Serpihan pipih dan asimetris. Ketebalan berbeda di tiap titik, dan tiap sisi punya tepi yang berbeda."""
    rng = np.random.default_rng(seed)
    if crescent:
        outline = crescent_outline(rng, 76, *crescent, chip)
    else:
        outline = jagged_outline(rng, corners, 60, radius_range, chip, notches, stretch)
    inner = scatter(rng, outline, spacing)
    dense, fractions = densify(outline)
    tree = cKDTree(dense)
    knots = rng.uniform(0.15, 0.9, 7)
    top_normals, top_offsets = rng.normal(0, 0.55, (planes, 2)), rng.uniform(0.8, 1.25, planes)
    bottom_planes = max(3, planes // 2)
    bottom_normals, bottom_offsets = rng.normal(0, 0.2, (bottom_planes, 2)), rng.uniform(0.8, 1.25, bottom_planes)
    impact = outline[rng.integers(len(outline))]

    def taper(p):
        distance, nearest = tree.query(p)
        floor = np.interp(fractions[nearest] * 7, np.arange(8), np.append(knots, knots[0]))
        return floor + (1 - floor) * smoothstep(0, 0.28, distance), distance

    def top(p):
        edge, distance = taper(p)
        z = thickness * np.clip((p @ top_normals.T + top_offsets).min(axis=1), 0.3, 1.35) * edge
        if ripple:
            reach = np.linalg.norm(p - impact, axis=1)
            z = z + ripple * thickness * np.cos(reach * 15) * np.exp(-reach * 1.1)
        if rim:
            z = z + rim * thickness * smoothstep(0.2, 0.0, distance)
        return z

    def bottom(p):
        edge, _ = taper(p)
        return -thickness * 0.5 * np.clip((p @ bottom_normals.T + bottom_offsets).min(axis=1), 0.3, 1.35) * edge

    def deform(v):
        v = v.copy()
        if curl:
            v[:, 2] += curl * (v[:, 0] ** 2 + 0.4 * v[:, 1] ** 2)
        if twist:
            angle = twist * v[:, 0]
            y, z = v[:, 1].copy(), v[:, 2].copy()
            v[:, 1] = y * np.cos(angle) - z * np.sin(angle)
            v[:, 2] = y * np.sin(angle) + z * np.cos(angle)
        return v

    paint = weathered_plastic(tiles, *colors, **paint_options)
    return Sheet(seed, size, outline, inner, top, bottom, paint, deform if curl or twist else None, alpha=alpha, blend=alpha < 1, wall_pad=max(0.04, min(0.12, thickness)))


def splinter(tiles, seed, length, ratio, thickness, colors, twist=0.9, teeth=7, **paint_options):
    """Batang memanjang dengan alur sejajar yang sedikit terpuntir. Satu ujung patah tumpul, ujung lainnya berserabut."""
    rng = np.random.default_rng(seed)
    half_width = 1 / ratio
    phases = rng.uniform(0, TWO_PI, 3)
    freqs = rng.uniform(5, 9), rng.uniform(13, 21)
    row_knots = np.linspace(-1.6, 1.6, 15)
    row_values = rng.uniform(0.5, 1.0, 15)
    row_values[1::2] *= 0.68
    bend = rng.uniform(0.03, 0.07)

    def width_at(t):
        return half_width * (1 + 0.15 * np.sin(t * freqs[0] + phases[0]) + 0.07 * np.sin(t * freqs[1] + phases[1]))

    def center_at(t):
        return bend * ((2 * t - 1) ** 2 - 0.3)

    ts = np.linspace(0.02, 0.86, 22)
    lower = np.column_stack([-1 + 2 * ts, center_at(ts) - width_at(ts) * (1 + rng.normal(0, 0.03, 22))])
    upper = np.column_stack([-1 + 2 * ts, center_at(ts) + width_at(ts) * (1 + rng.normal(0, 0.03, 22))])[::-1]
    tips = []
    for i in range(teeth * 2):
        a = 1 - 2 * (i + 0.5) / (teeth * 2)
        x = 1 - rng.uniform(0.0, 0.05) if i % 2 == 0 else 1 - rng.uniform(0.09, 0.2)
        t = (x + 1) / 2
        tips.append((x, center_at(t) + a * width_at(t) * 1.12))
    tips = np.array(tips)[::-1]
    start = np.array([[-1 + rng.uniform(0, 0.03), center_at(0.0) + a * width_at(0.0)] for a in (0.72, 0.28, -0.25, -0.7)])
    outline = np.concatenate([lower, tips, upper, start])
    inner = scatter(rng, outline, half_width * 0.62)

    def surface(p):
        t = np.clip((p[:, 0] + 1) / 2, 0, 1)
        across = np.clip((p[:, 1] - center_at(t)) / width_at(t), -1.1, 1.1)
        grooves = np.interp(across + twist * (t - 0.5), row_knots, row_values)
        dome = 1 - 0.55 * across**2
        wave = 1 + 0.14 * np.sin(t * 7 + phases[2])
        return thickness * dome * grooves * wave * (0.5 + 0.5 * smoothstep(1.0, 0.82, t))

    paint = weathered_plastic(tiles, *colors, **paint_options)
    return Sheet(seed, length, outline, inner, surface, lambda p: -0.4 * surface(p), paint, wall_pad=0.03)


def film(tiles, seed, size, tint, opacity, corners=12, stretch=1.4, tears=2, creases=5, crease_depth=0.09, crumple=0.004, thickness=0.012, spacing=0.26, parallel=False, chip=0.012, line_height=0.016, radius_range=(0.66, 1.0), line_alpha=0.55):
    """Lembaran tipis dengan tepi robek. Tiap lipatan menekuk lembaran dan meninggalkan garis putih sempit yang memudar."""
    rng = np.random.default_rng(seed)
    outline = jagged_outline(rng, corners, 76, radius_range, chip, tears, stretch)
    base_angle = rng.uniform(0, np.pi)
    folds, extra = [], []
    for _ in range(creases):
        angle = base_angle + rng.normal(0, 0.1) if parallel else rng.uniform(0, np.pi)
        normal, direction = np.array([np.cos(angle), np.sin(angle)]), np.array([-np.sin(angle), np.cos(angle)])
        offset, middle, half = rng.uniform(-0.55, 0.55), rng.uniform(-0.3, 0.3), rng.uniform(0.45, 1.3)
        amount = rng.choice([-1, 1]) * rng.uniform(0.45, 1.0) * crease_depth
        folds.append((normal, direction, offset, middle, half, amount, rng.uniform(0.5, 1.0)))
        reach = np.arange(middle - half, middle + half, spacing * 0.55)
        extra.append(normal * offset + np.outer(reach, direction) + rng.normal(0, 0.002, (len(reach), 2)))
    inner = np.concatenate([scatter(rng, outline, spacing), *extra])
    inner = inner[inside_polygon(inner, outline)]
    inner = inner[cKDTree(outline).query(inner)[0] > spacing * 0.2]
    waves = [(rng.normal(0, 1, 2), rng.uniform(3, 6), rng.uniform(0, TWO_PI)) for _ in range(3)]

    def fold_field(p):
        z = np.zeros(len(p))
        for normal, direction, offset, middle, half, amount, _ in folds:
            fade = smoothstep(half + 0.15, half - 0.15, np.abs(p @ direction - middle))
            z += amount * np.minimum(np.abs(p @ normal - offset), 0.6) * fade
        for wave, frequency, phase in waves:
            z += crumple * 2 * np.sin(p @ wave * frequency + phase)
        return z

    center = fold_field(outline).mean()
    top = lambda p: fold_field(p) - center + thickness / 2
    bottom = lambda p: fold_field(p) - center - thickness / 2
    tint_rgb = hex_rgb(tint)
    white = np.array([0.96, 0.99, 1.0])

    def paint(paint_rng, shape, tpn, X, Y, H, thickness_map, distance, mask):
        points = np.column_stack([X.ravel(), Y.ravel()])
        lines = np.zeros(shape)
        ridge = np.zeros(shape)
        for normal, direction, offset, middle, half, amount, strength in folds:
            crossing = (points @ normal - offset).reshape(shape)
            fade = smoothstep(half + 0.15, half - 0.15, np.abs(points @ direction - middle)).reshape(shape)
            wobble = fbm(shape, paint_rng, 9) * 0.012
            width = max(1.3 / tpn, 0.008)
            lines = np.maximum(lines, np.exp(-(((crossing + wobble) / width) ** 2)) * fade * strength)
            ridge += np.sign(amount) * line_height * np.exp(-((crossing / (width * 2.4)) ** 2)) * fade
        grooves = Tiles.sample(tiles.scratches[paint_rng.integers(2)], shape, paint_rng)
        scuff = Tiles.sample(tiles.scuffs[paint_rng.integers(2)], shape, paint_rng, step=0.8)
        scuff = np.clip((scuff - np.median(scuff)) * 2.2, 0, 1)
        scratch = np.clip(-grooves * 3.0, 0, 1)
        dots = speckles(shape, paint_rng, 0.0006, 1.0)
        edge = smoothstep(0.035, 0.0, distance) * mask
        haze = fbm(shape, paint_rng, 30) * 0.04 + scuff * 0.1
        alpha = np.clip(opacity + haze + lines * line_alpha + edge * 0.42 + scratch * 0.3 + dots * 0.4, 0, 1)
        base = mix(tint_rgb, white, np.clip(lines * 0.9 + edge * 0.6 + scratch * 0.55 + dots * 0.7 + scuff * 0.14, 0, 1))
        rough = 0.14 + scuff * 0.3 + lines * 0.3 + scratch * 0.26 + dots * 0.25
        height = ridge * tpn + grooves * 3.2 + fbm(shape, paint_rng, 1.5) * 0.09 + fbm(shape, paint_rng, 6) * 0.55
        return {"base": np.clip(base, 0, 1), "rough": np.clip(rough, 0.05, 1), "height": height, "alpha": alpha}

    return Sheet(seed, size, outline, inner, top, bottom, paint, alpha=1.0, blend=True, wall_pad=0.03)


# ─── Pelet: bola kubus dari fungsi r(arah) ──────────────────────────────────

# (a, b, n) dengan a x b = n, jadi u ke arah a dan atas gambar ke arah b sesuai aturan tangent space
CUBE_FACES = [
    (np.array([0.0, 0, -1]), np.array([0.0, 1, 0]), np.array([1.0, 0, 0])),
    (np.array([0.0, 0, 1]), np.array([0.0, 1, 0]), np.array([-1.0, 0, 0])),
    (np.array([1.0, 0, 0]), np.array([0.0, 0, -1]), np.array([0.0, 1, 0])),
    (np.array([1.0, 0, 0]), np.array([0.0, 0, 1]), np.array([0.0, -1, 0])),
    (np.array([1.0, 0, 0]), np.array([0.0, 1, 0]), np.array([0.0, 0, 1])),
    (np.array([-1.0, 0, 0]), np.array([0.0, 1, 0]), np.array([0.0, 0, -1])),
]


def face_dirs(face, alpha, beta):
    a, b, n = face
    return normalized(n + a * np.tan(alpha)[..., None] + b * np.tan(beta)[..., None])


class Blob:
    """Butiran tanpa kutub tekstur. Enam sisi kubus disimpan di atlas, dan detailnya dihitung dari fungsi tiga dimensi."""

    PAD = 3

    def __init__(self, seed, size, shape, paint, grid=11, alpha=1.0):
        self.rng = np.random.default_rng(seed + 2000)
        self.scale = size / 2
        self.shape = shape
        self.paint = paint
        self.grid = grid
        self.alpha = alpha
        self.blend = alpha < 1
        self.extent = np.array([3.0, 2.0]) * self.scale * 1.75

    def texel_rect(self, density):
        face = max(32, int(np.ceil(self.extent[1] / 2 * density)))
        return np.array([face * 3, face * 2])

    def _vertex_normals(self, face, alpha, beta):
        eps = 1e-3
        du = self.shape(face_dirs(face, alpha + eps, beta)) - self.shape(face_dirs(face, alpha - eps, beta))
        dv = self.shape(face_dirs(face, alpha, beta + eps)) - self.shape(face_dirs(face, alpha, beta - eps))
        return normalized(np.cross(du, dv))

    def mesh(self):
        n = self.grid
        angle = np.linspace(-np.pi / 4, np.pi / 4, n + 1)
        verts, normals, uvs, faces = [], [], [], []
        for index, face in enumerate(CUBE_FACES):
            beta_grid, alpha_grid = np.meshgrid(angle[::-1], angle, indexing="ij")
            dirs = face_dirs(face, alpha_grid, beta_grid)
            positions = self.shape(dirs)
            start = sum(len(v) for v in verts)
            verts.append(positions.reshape(-1, 3))
            normals.append(self._vertex_normals(face, alpha_grid, beta_grid).reshape(-1, 3))
            uvs.append(np.column_stack([np.full((n + 1) ** 2, index), alpha_grid.ravel(), beta_grid.ravel()]))
            grid = start + np.arange((n + 1) ** 2).reshape(n + 1, n + 1)
            for i in range(n):
                for j in range(n):
                    a, b, c, d = grid[i, j], grid[i, j + 1], grid[i + 1, j + 1], grid[i + 1, j]
                    faces += [(d, c, b), (d, b, a)]
        return np.concatenate(verts) * self.scale, np.concatenate(normals), np.concatenate(uvs), np.array(faces)

    def bake(self, width, height):
        face_size = height // 2
        base = np.zeros((height, width, 3))
        normal = np.zeros((height, width, 3))
        rough = np.zeros((height, width))
        inner = face_size - 2 * self.PAD
        delta = self.PAD / inner * (np.pi / 2)
        span = np.pi / 2 + 2 * delta
        coords = (np.arange(face_size) + 0.5) / face_size * span - (np.pi / 4 + delta)
        vertex_angle = np.linspace(-np.pi / 4, np.pi / 4, self.grid + 1)
        for index, face in enumerate(CUBE_FACES):
            alpha_grid, beta_grid = np.meshgrid(coords, coords[::-1])
            dirs = face_dirs(face, alpha_grid, beta_grid)
            low = self.shape(dirs)
            surface = self.paint(self.rng, dirs, low, inner / (np.pi / 2))
            high = low + dirs * surface["height"][..., None]
            pu = np.gradient(high, axis=1)
            pv = -np.gradient(high, axis=0)
            target = normalized(np.cross(pu, pv))
            beta_vertices, alpha_vertices = np.meshgrid(vertex_angle[::-1], vertex_angle, indexing="ij")
            vertex_normal = self._vertex_normals(face, alpha_vertices, beta_vertices)
            row = (coords[::-1] + np.pi / 4)[:, None] * np.ones((1, face_size))
            row = self.grid - np.clip(row / (np.pi / 2), 0, 1) * self.grid
            col = np.clip((coords + np.pi / 4) / (np.pi / 2), 0, 1)[None, :] * np.ones((face_size, 1)) * self.grid
            vertex = normalized(np.stack([ndimage.map_coordinates(vertex_normal[..., k], [row, col], order=1, mode="nearest") for k in range(3)], axis=-1))
            low_u = np.gradient(low, axis=1)
            tangent = normalized(low_u - vertex * (low_u * vertex).sum(-1, keepdims=True))
            bitangent = np.cross(vertex, tangent)
            encoded = normalized(np.stack([(target * tangent).sum(-1), (target * bitangent).sum(-1), np.maximum((target * vertex).sum(-1), 0.05)], axis=-1))
            x, y = (index % 3) * face_size, (index // 3) * face_size
            base[y : y + face_size, x : x + face_size] = surface["base"]
            normal[y : y + face_size, x : x + face_size] = encoded
            rough[y : y + face_size, x : x + face_size] = surface["rough"]
        return {"base": base, "normal": normal, "rough": rough, "alpha": None}

    def atlas_uv(self, uv, x, y, width, height, size):
        face_size = height // 2
        inner = face_size - 2 * self.PAD
        delta = self.PAD / inner * (np.pi / 2)
        span = np.pi / 2 + 2 * delta
        index = uv[:, 0].astype(int)
        local_u = (uv[:, 1] + np.pi / 4 + delta) / span
        local_v = (np.pi / 4 + delta - uv[:, 2]) / span
        u = (x + ((index % 3) + local_u) * face_size) / size
        v = (y + ((index // 3) + local_v) * face_size) / size
        return np.column_stack([u, v])


def pellet_paint(tiles, seed, main, shade, wear, roughness=0.5, pits=40, pit_depth=0.012, speck=0.0, groove=None):
    """Permukaan butiran: warna sedikit berbeda antarbagian, lubang kecil, goresan, dan butir halus."""
    rng = np.random.default_rng(seed)
    volume = Volume(rng)
    main, shade, wear = hex_rgb(main), hex_rgb(shade), hex_rgb(wear)
    pit_dirs = normalized(rng.normal(0, 1, (pits, 3)))
    pit_sizes = rng.uniform(0.012, 0.05, pits)
    pit_depths = rng.uniform(0.4, 1.0, pits) * pit_depth

    def paint(face_rng, dirs, low, texels_per_radian):
        blotch = volume(dirs, 5.0) * 0.6 + volume(dirs, 11.0) * 0.4
        fine = volume(dirs, 34.0) * 0.6 + volume(dirs, 63.0) * 0.4
        pit_field = np.zeros(dirs.shape[:2])
        closeness = dirs @ pit_dirs.T
        angle = np.arccos(np.clip(closeness, -1, 1))
        pit_field = (pit_depths * np.exp(-((angle / pit_sizes) ** 2))).sum(-1)
        scratch = np.clip(-Tiles.triplanar(tiles.scratches[0], dirs, face_rng, texels_per_radian * 1.1) * 3.0, 0, 1)
        scuff = np.clip((Tiles.triplanar(tiles.scuffs[0], dirs, face_rng, texels_per_radian) - 0.5) * 2.0, 0, 1)
        t = smoothstep(-1.2, 1.4, blotch)
        base = mix(main, shade, t * 0.75)
        base = base * (1 + fine * 0.018)[..., None]
        base = mix(base, shade * 0.72, np.clip(pit_field / max(pit_depth, 1e-6), 0, 1)[..., None] * 0.55)
        base = mix(base, wear, np.clip(scratch * 0.45 + scuff * 0.14, 0, 0.8)[..., None])
        rough = roughness + t * 0.08 + scratch * 0.2 + scuff * 0.18 + np.abs(fine) * 0.03
        height = -pit_field - scratch * 1.6 / texels_per_radian + fine * 0.5 / texels_per_radian + blotch * 0.0015
        if groove:
            height = height + groove(dirs, low)
        return {"base": np.clip(base, 0, 1), "rough": np.clip(rough, 0.05, 1), "height": height}

    return paint


def bead_shape(seed, lumps=0.05, squash=0.88, chipped=0.0):
    rng = np.random.default_rng(seed)
    bumps = [(unit(rng.normal(0, 1, 3)), lumps * rng.uniform(0.3, 1.0), rng.uniform(2.2, 5), rng.uniform(0, TWO_PI)) for _ in range(6)]
    flat = unit(rng.normal(0, 1, 3))

    def shape(dirs):
        radius = 1.0
        for direction, amount, frequency, phase in bumps:
            radius = radius + amount * np.sin(dirs @ direction * frequency + phase)
        p = dirs * np.asarray(radius)[..., None]
        p = p * np.array([1.0, 1.0, squash])
        if chipped:
            p = p - np.maximum(p @ flat - (1 - chipped), 0)[..., None] * flat
        return p

    return shape


def lens_shape(seed):
    """Cakram membulat dengan tonjolan kecil di tepi."""
    rng = np.random.default_rng(seed)
    nubs = rng.uniform(0, TWO_PI, 3)
    phases = rng.uniform(0, TWO_PI, 2)

    def shape(dirs):
        x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
        rho = np.hypot(x, y)
        theta = np.arctan2(y, x)
        rim = 1 + 0.014 * np.sin(theta * 3 + phases[0]) + 0.008 * np.sin(theta * 5 + phases[1])
        for nub in nubs:
            rim = rim + 0.035 * np.exp(-(((theta - nub + np.pi) % TWO_PI - np.pi) ** 2) / 0.009)
        h = np.where(z > 0, 0.47, 0.34)
        radius = (np.maximum(rho, 1e-5) ** 2.5 + (np.abs(z) / h) ** 2.5) ** (-1 / 2.5)
        p = dirs * radius[..., None]
        return p * np.stack([rim, rim, np.ones_like(rim)], axis=-1)

    return shape


def lens_groove(dirs, low):
    rho = np.hypot(low[..., 0], low[..., 1])
    return -0.018 * np.exp(-(((rho - 0.84) / 0.035) ** 2)) * (low[..., 2] > 0)


def cylinder_shape(seed, ratio, cut=0.07, bend=0.12):
    """Silinder pendek dengan ujung terpotong yang sedikit miring. Bentuk ini ilustratif, bukan dari foto mikroskop."""
    rng = np.random.default_rng(seed)
    phase = rng.uniform(0, TWO_PI)

    def shape(dirs):
        x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
        across = np.hypot(y, z)
        theta = np.arctan2(z, y)
        wobble = 1 + 0.03 * np.sin(theta * 2 + phase) + 0.012 * np.sin(theta * 5 + phase * 2)
        radius = ((np.abs(x) / ratio) ** 9 + np.maximum(across, 1e-5) ** 9) ** (-1 / 9)
        p = dirs * radius[..., None]
        p = p * np.stack([np.ones_like(wobble), wobble, wobble], axis=-1)
        px = p[..., 0] + cut * p[..., 1]
        pz = p[..., 2] + bend * (p[..., 0] / ratio) ** 2
        return np.stack([px, p[..., 1], pz], axis=-1)

    return shape


# ─── Serat ──────────────────────────────────────────────────────────────────


def turning_path(rng, length, segments, samples, smooth, wobble, lift):
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
    z = lift * (np.sin(s * TWO_PI * 3 + rng.uniform(0, TWO_PI)) + 0.6 * np.sin(s * TWO_PI * 7.3 + rng.uniform(0, TWO_PI)))
    path = np.column_stack([x, y, z])
    return path - path.mean(axis=0)


def simplify_path(path, tolerance):
    """Mengurangi titik di bagian lurus, supaya segitiga terpakai di belokan."""
    keep = np.zeros(len(path), dtype=bool)
    keep[[0, -1]] = True
    stack = [(0, len(path) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        a, b = path[i], path[j]
        direction = b - a
        length = np.linalg.norm(direction)
        between = path[i + 1 : j] - a
        if length < 1e-9:
            distance = np.linalg.norm(between, axis=1)
        else:
            distance = np.linalg.norm(np.cross(between, direction / length), axis=1)
        k = int(np.argmax(distance))
        if distance[k] > tolerance:
            middle = i + 1 + k
            keep[middle] = True
            stack += [(i, middle), (middle, j)]
    return path[keep]


class Fiber:
    """Tabung tipis mengikuti jalur. Tekstur serat berulang di sepanjang tabung dan dipakai bersama."""

    def __init__(self, seed, path, radius, color, roughness_factor=1.0, radial=5, flatten=0.85, bump=0.04):
        self.color = color
        self.roughness_factor = roughness_factor
        rng = np.random.default_rng(seed + 3000)
        self.path = simplify_path(path, radius * 0.22)
        self.radius = radius
        self.radial = radial
        self.flatten = flatten
        self.rng = rng
        self.bump = bump
        self.blend = False
        self.alpha = 1.0

    def mesh(self):
        path, radial = self.path, self.radial
        n = len(path)
        tangent = np.gradient(path, axis=0)
        tangent = normalized(tangent)
        normal = unit(np.cross(tangent[0], [0.0, 0.0, 1.0]))
        steps = np.linalg.norm(np.diff(path, axis=0), axis=1)
        arc = np.concatenate([[0], np.cumsum(steps)])
        total = arc[-1]
        taper = np.minimum(1, 0.5 + 0.5 * np.minimum(arc, total - arc) / max(total * 0.025, 1e-6))
        bumps = np.interp(arc, np.linspace(0, total, 64), ndimage.gaussian_filter1d(self.rng.normal(0, 1, 64), 1.5)) * self.bump
        theta = np.arange(radial + 1) / radial * TWO_PI
        positions = np.zeros((n, radial + 1, 3))
        normals = np.zeros((n, radial + 1, 3))
        uvs = np.zeros((n, radial + 1, 2))
        tile_length = TWO_PI * self.radius * 4
        for i in range(n):
            normal = unit(normal - tangent[i] * (normal @ tangent[i]))
            binormal = np.cross(tangent[i], normal)
            r = self.radius * taper[i] * (1 + bumps[i])
            around = np.outer(np.cos(theta), normal)
            side = np.outer(np.sin(theta), binormal)
            positions[i] = path[i] + r * (around + self.flatten * side)
            normals[i] = normalized(around + side / self.flatten)
            uvs[i, :, 0] = theta / TWO_PI
            uvs[i, :, 1] = -arc[i] / tile_length
        verts = positions.reshape(-1, 3)
        faces = []
        for i in range(n - 1):
            for j in range(radial):
                a, b = i * (radial + 1) + j, i * (radial + 1) + j + 1
                c, d = (i + 1) * (radial + 1) + j + 1, (i + 1) * (radial + 1) + j
                faces += [(a, b, c), (a, c, d)]
        # Tutup ujung
        cap_start = len(verts)
        verts = np.concatenate([verts, path[0][None], path[-1][None]])
        norm = np.concatenate([normals.reshape(-1, 3), -tangent[0][None], tangent[-1][None]])
        uv = np.concatenate([uvs.reshape(-1, 2), uvs[0, 0][None], uvs[-1, 0][None]])
        for j in range(radial):
            faces.append((cap_start, j + 1, j))
            faces.append((cap_start + 1, (n - 1) * (radial + 1) + j, (n - 1) * (radial + 1) + j + 1))
        return verts, norm, uv, np.array(faces)


def fiber(seed, length, radius, segments, color, samples=220, smooth=9, wobble=2.0, lift=1.8, bump=0.04, radial=5):
    rng = np.random.default_rng(seed)
    return Fiber(seed, turning_path(rng, length, segments, samples, smooth, wobble, radius * lift), radius, color, bump=bump, radial=radial)


def tangle(seed, reach, radius, color, samples=340):
    """Serat kusut: lingkar-lingkar rapat di tengah, lalu kedua ujungnya keluar membentuk lengkung."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, 1, samples)
    spread = 0.27 + 0.73 * (smoothstep(0.26, 0.0, t) + smoothstep(0.74, 1.0, t))
    phase = rng.uniform(0, TWO_PI, 5)
    main, second, third = rng.uniform(3.2, 3.8), rng.uniform(6.2, 7.0), rng.uniform(8.3, 9.4)
    x = spread * (np.sin(TWO_PI * main * t + phase[0]) + 0.5 * np.sin(TWO_PI * second * t + phase[1]))
    y = spread * (np.cos(TWO_PI * main * t + phase[2]) + 0.5 * np.sin(TWO_PI * third * t + phase[3]))
    z = radius * 2.4 * np.sin(TWO_PI * 11.3 * t + phase[4])
    return Fiber(seed, np.column_stack([x * reach, y * reach, z]), radius, color)


def fiber_tile():
    """Tekstur serat: alur memanjang halus dan warna yang sedikit berubah. Dibuat prosedural, bisa berulang."""
    rng = np.random.default_rng(77)
    shape = (256, 64)
    height = ndimage.gaussian_filter(rng.normal(0, 1, shape), (22, 1.2), mode="wrap")
    height = height / height.std()
    knots = ndimage.gaussian_filter(rng.normal(0, 1, shape), 2.2, mode="wrap")
    knots = knots / knots.std()
    field = height * 1.3 + knots * 0.35
    dx = (np.roll(field, -1, 1) - np.roll(field, 1, 1)) / 2
    dy = (np.roll(field, 1, 0) - np.roll(field, -1, 0)) / 2
    normal = normalized(np.stack([-dx * 0.55, -dy * 0.55, np.ones_like(dx)], axis=-1))
    band = ndimage.gaussian_filter(rng.normal(0, 1, shape), (30, 6), mode="wrap")
    band = band / band.std()
    base = np.clip(0.94 + band * 0.05 + height * 0.03, 0, 1)
    rough = np.clip(0.42 + band * 0.05 + np.abs(knots) * 0.08, 0.05, 1)
    return {
        "base": jpeg(np.repeat(base[..., None], 3, axis=-1), 84, "fiber_base"),
        "normal": jpeg((normal + 1) / 2, 88, "fiber_normal", subsampling=0),
        "rough": jpeg(np.repeat(rough[..., None], 3, axis=-1), 80, "fiber_rough"),
    }


# ─── Berkas tekstur ─────────────────────────────────────────────────────────


class Texture:
    def __init__(self, name, data, mime):
        self.name, self.data, self.mime = name, data, mime
        self.extension = "png" if mime == "image/png" else "jpg"


def jpeg(array, quality, name, subsampling=2):
    buffer = io.BytesIO()
    image = Image.fromarray(np.uint8(np.clip(array, 0, 1) * 255 + 0.5), "RGB")
    image.save(buffer, "JPEG", quality=quality, subsampling=subsampling, optimize=True)
    return Texture(name, buffer.getvalue(), "image/jpeg")


def png_rgba(base, alpha, name):
    """PNG berpalet: alfa film jauh lebih hemat daripada PNG penuh, dan tetap punya tepi yang halus."""
    rgba = np.concatenate([base, alpha[..., None]], axis=-1)
    image = Image.fromarray(np.uint8(np.clip(rgba, 0, 1) * 255 + 0.5), "RGBA")
    buffer = io.BytesIO()
    image.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(buffer, "PNG", optimize=True)
    return Texture(name, buffer.getvalue(), "image/png")


def pack(items, size, padding=6):
    """Rak sederhana: mencari kerapatan texel terbesar yang masih muat, sama untuk semua partikel di satu atlas."""

    def attempt(density):
        rects = [item.texel_rect(density) for item in items]
        order = sorted(range(len(items)), key=lambda i: -rects[i][1])
        x, y, shelf = padding, padding, 0
        placed = {}
        for i in order:
            w, h = rects[i]
            if x + w + padding > size:
                x, y = padding, y + shelf + padding
                shelf = 0
            if x + w + padding > size or y + h + padding > size:
                return None
            placed[i] = (x, y, w, h)
            x += w + padding
            shelf = max(shelf, h)
        return placed

    low, high = 100.0, 40000.0
    best = None
    for _ in range(26):
        middle = (low + high) / 2
        placed = attempt(middle)
        if placed:
            best, low = placed, middle
        else:
            high = middle
    return best


def build_atlas(items, size, label, translucent=False):
    placed = pack(items, size)
    base = np.zeros((size, size, 3))
    normal = np.zeros((size, size, 3))
    normal[..., 2] = 1.0
    rough = np.full((size, size), 0.5)
    alpha = np.ones((size, size))
    meshes = {}
    fills = []
    for i, item in enumerate(items):
        x, y, w, h = placed[i]
        baked = item.bake(int(w), int(h))
        base[y : y + h, x : x + w] = baked["base"]
        normal[y : y + h, x : x + w] = baked["normal"]
        rough[y : y + h, x : x + w] = baked["rough"]
        if baked["alpha"] is not None:
            alpha[y : y + h, x : x + w] = baked["alpha"]
        fills.append(baked["base"].reshape(-1, 3).mean(axis=0))
        meshes[i] = (x, y, w, h)
    used = np.zeros((size, size), dtype=bool)
    for x, y, w, h in meshes.values():
        used[y : y + h, x : x + w] = True
    # Celah atlas diisi warna terdekat supaya tidak ada garis gelap saat mipmap
    nearest = ndimage.distance_transform_edt(~used, return_distances=False, return_indices=True)
    base = base[nearest[0], nearest[1]]
    rough = rough[nearest[0], nearest[1]]
    alpha = alpha[nearest[0], nearest[1]]
    if translucent:
        textures = {"base": png_rgba(base, alpha, f"{label}_base")}
    else:
        textures = {"base": jpeg(base, 86, f"{label}_base", subsampling=0)}
    textures["normal"] = jpeg((normal + 1) / 2, 84, f"{label}_normal", subsampling=0)
    textures["rough"] = jpeg(np.repeat(rough[..., None], 3, axis=-1), 78, f"{label}_rough")
    return placed, textures


# ─── Penempatan dan penulisan ───────────────────────────────────────────────


def rotation(yaw, tilt_x, tilt_z):
    cy, sy = np.cos(yaw), np.sin(yaw)
    cx, sx = np.cos(tilt_x), np.sin(tilt_x)
    cz, sz = np.cos(tilt_z), np.sin(tilt_z)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return ry @ rx @ rz


class Scene:
    def __init__(self, name, margin=0.012, film_atlas=ATLAS_SIZE):
        self.name = name
        self.margin = margin
        self.film_atlas = film_atlas
        self.entries = []

    def add(self, label, item, x, z, yaw=0.0, tilt_x=0.0, tilt_z=0.0, lift=0.0):
        self.entries.append({"label": label, "item": item, "x": x, "z": z, "yaw": yaw, "tilt_x": tilt_x, "tilt_z": tilt_z, "lift": lift})

    def _place(self, entry, verts, normals):
        rotate = rotation(np.radians(entry["yaw"]), np.radians(entry["tilt_x"]), np.radians(entry["tilt_z"]))
        world = np.column_stack([verts[:, 0], verts[:, 2], -verts[:, 1]]) @ rotate.T
        world_normals = np.column_stack([normals[:, 0], normals[:, 2], -normals[:, 1]]) @ rotate.T
        world = world - np.array([world[:, 0].mean(), world[:, 1].min() - entry["lift"], world[:, 2].mean()]) + np.array([entry["x"], 0, entry["z"]])
        return world, world_normals

    def _spread(self, parts):
        for _ in range(240):
            moved = False
            for a, b in itertools.combinations(parts, 2):
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

    def build(self, shared_fiber):
        opaque = [e for e in self.entries if isinstance(e["item"], (Sheet, Blob)) and not e.get("film")]
        films = [e for e in self.entries if e.get("film")]
        textures = []
        parts = []
        for group, translucent, label, size in ((opaque, False, f"{self.name}_atlas", ATLAS_SIZE), (films, True, f"{self.name}_film", self.film_atlas)):
            if not group:
                continue
            placed, atlas = build_atlas([e["item"] for e in group], size, label, translucent)
            textures += list(atlas.values())
            for i, entry in enumerate(group):
                item = entry["item"]
                verts, normals, uv, faces = item.mesh()
                x, y, w, h = placed[i]
                atlas_uv = item.atlas_uv(uv, x, y, w, h, size)
                world, world_normals = self._place(entry, verts, normals)
                parts.append(self._part(entry, world, world_normals, atlas_uv, faces, atlas, (1.0, 1.0, 1.0), item.alpha, translucent or item.blend, False))
        for entry in self.entries:
            item = entry["item"]
            if isinstance(item, Fiber):
                verts, normals, uv, faces = item.mesh()
                world, world_normals = self._place(entry, verts, normals)
                parts.append(self._part(entry, world, world_normals, uv, faces, shared_fiber, srgb_to_linear(hex_rgb(item.color)), 1.0, False, True))
        if any(isinstance(e["item"], Fiber) for e in self.entries):
            textures += list(shared_fiber.values())
        self._spread(parts)
        return parts, textures

    @staticmethod
    def _part(entry, positions, normals, uv, faces, textures, color, alpha, blend, repeat):
        used, inverse = np.unique(faces, return_inverse=True)
        faces = inverse.reshape(faces.shape)
        positions, normals, uv = positions[used], normalized(normals[used]), uv[used]
        return {
            "name": entry["label"],
            "positions": positions.copy(),
            "normals": normals,
            "tangents": vertex_tangents(positions, normals, uv, faces),
            "uv": uv,
            "indices": faces.astype(np.uint32),
            "base": textures["base"],
            "normal": textures["normal"],
            "rough": textures["rough"],
            "color": tuple(float(c) for c in color),
            "alpha": float(alpha),
            "blend": bool(blend),
            "repeat": bool(repeat),
        }


def write_glb(name, parts, textures, directory):
    points = np.concatenate([p["positions"] for p in parts])
    low, high = points.min(axis=0), points.max(axis=0)
    shift = np.array([(low[0] + high[0]) / 2, low[1], (low[2] + high[2]) / 2])
    blob, views, accessors = bytearray(), [], []

    def add_raw(raw, target=None):
        while len(blob) % 4:
            blob.append(0)
        view = {"buffer": 0, "byteOffset": len(blob), "byteLength": len(raw)}
        if target:
            view["target"] = target
        views.append(view)
        blob.extend(raw)
        return len(views) - 1

    def add(values, component, kind, target, bounds=False):
        view = add_raw(values.tobytes(), target)
        accessor = {"bufferView": view, "componentType": component, "count": len(values), "type": kind}
        if bounds:
            accessor["min"] = [float(v) for v in values.min(axis=0)]
            accessor["max"] = [float(v) for v in values.max(axis=0)]
        accessors.append(accessor)
        return len(accessors) - 1

    unique = {id(t): t for t in textures}
    image_index, texture_index = {}, {}
    images, gltf_textures = [], []
    samplers = [
        {"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071},
        {"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497},
    ]
    for key, texture in unique.items():
        image_index[key] = len(images)
        images.append({"bufferView": add_raw(texture.data), "mimeType": texture.mime, "name": texture.name})
        repeat = texture.name.startswith("fiber")
        texture_index[key] = len(gltf_textures)
        gltf_textures.append({"sampler": 1 if repeat else 0, "source": image_index[key], "name": texture.name})

    materials, meshes, nodes, triangles = [], [], [], 0
    for index, part in enumerate(parts):
        material = {
            "name": f"{part['name']}_{index + 1}",
            "pbrMetallicRoughness": {
                "baseColorTexture": {"index": texture_index[id(part["base"])]},
                "baseColorFactor": [*[round(c, 4) for c in part["color"]], part["alpha"]],
                "metallicRoughnessTexture": {"index": texture_index[id(part["rough"])]},
                "metallicFactor": 0.0,
                "roughnessFactor": 1.0,
            },
            "normalTexture": {"index": texture_index[id(part["normal"])]},
        }
        if part["blend"]:
            material["alphaMode"] = "BLEND"
        materials.append(material)
        positions = (part["positions"] - shift).astype(np.float32)
        assert part["indices"].max() < 65535, part["name"]
        triangles += len(part["indices"])
        primitive = {
            "attributes": {
                "POSITION": add(positions, 5126, "VEC3", 34962, bounds=True),
                "NORMAL": add(normalized(part["normals"]).astype(np.float32), 5126, "VEC3", 34962),
                "TEXCOORD_0": add(part["uv"].astype(np.float32), 5126, "VEC2", 34962),
                "TANGENT": add(part["tangents"].astype(np.float32), 5126, "VEC4", 34962),
            },
            "indices": add(part["indices"].ravel().astype(np.uint16), 5123, "SCALAR", 34963),
            "material": index,
        }
        meshes.append({"name": material["name"], "primitives": [primitive]})
        nodes.append({"name": material["name"], "mesh": index})
    nodes.append({"name": name, "children": list(range(len(parts)))})
    while len(blob) % 4:
        blob.append(0)
    document = {
        "asset": {"version": "2.0", "generator": "MicroJourney scripts/build-microplastic-models-v2.py"},
        "scene": 0,
        "scenes": [{"name": name, "nodes": [len(nodes) - 1]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "textures": gltf_textures,
        "images": images,
        "samplers": samplers,
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
    }
    text = json.dumps(document, separators=(",", ":")).encode("utf-8")
    text += b" " * (-len(text) % 4)
    total = 12 + 8 + len(text) + 8 + len(blob)
    path = directory / f"{name}.glb"
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(text), b"JSON") + text)
        f.write(struct.pack("<I4s", len(blob), b"BIN\0") + bytes(blob))
    return triangles, total, high - low, shift


def write_usdz(name, parts, textures, directory, shift):
    """USDZ biner polos seperti aset contoh Apple: Quick Look sendiri yang meletakkannya di permukaan datar."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp:
        temp = pathlib.Path(temp)
        unique = {id(t): t for t in textures}
        for texture in unique.values():
            (temp / f"{texture.name}.{texture.extension}").write_bytes(texture.data)
        stage = Usd.Stage.CreateNew(str(temp / "model.usdc"))
        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        UsdGeom.SetStageMetersPerUnit(stage, 1.0)
        root = UsdGeom.Xform.Define(stage, "/Root")
        stage.SetDefaultPrim(root.GetPrim())
        Usd.ModelAPI(root.GetPrim()).SetKind(Kind.Tokens.component)
        UsdGeom.Scope.Define(stage, "/Root/Materials")

        def texture_shader(material_path, shader_name, texture, reader, color_space, wrap, scale=None, bias=None):
            shader = UsdShade.Shader.Define(stage, f"{material_path}/{shader_name}")
            shader.CreateIdAttr("UsdUVTexture")
            shader.CreateInput("file", Sdf.ValueTypeNames.Asset).Set(f"{texture.name}.{texture.extension}")
            shader.CreateInput("st", Sdf.ValueTypeNames.Float2).ConnectToSource(reader.ConnectableAPI(), "result")
            shader.CreateInput("wrapS", Sdf.ValueTypeNames.Token).Set(wrap)
            shader.CreateInput("wrapT", Sdf.ValueTypeNames.Token).Set(wrap)
            shader.CreateInput("sourceColorSpace", Sdf.ValueTypeNames.Token).Set(color_space)
            if scale is not None:
                shader.CreateInput("scale", Sdf.ValueTypeNames.Float4).Set(scale)
            if bias is not None:
                shader.CreateInput("bias", Sdf.ValueTypeNames.Float4).Set(bias)
            return shader

        for index, part in enumerate(parts):
            label = f"{part['name']}_{index + 1}"
            material_path = f"/Root/Materials/{label}"
            material = UsdShade.Material.Define(stage, material_path)
            surface = UsdShade.Shader.Define(stage, f"{material_path}/PreviewSurface")
            surface.CreateIdAttr("UsdPreviewSurface")
            surface.CreateInput("useSpecularWorkflow", Sdf.ValueTypeNames.Int).Set(0)
            surface.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
            reader = UsdShade.Shader.Define(stage, f"{material_path}/PrimvarReader")
            reader.CreateIdAttr("UsdPrimvarReader_float2")
            reader.CreateInput("varname", Sdf.ValueTypeNames.String).Set("st")
            reader.CreateOutput("result", Sdf.ValueTypeNames.Float2)
            wrap = "repeat" if part["repeat"] else "clamp"
            base = texture_shader(material_path, "BaseColor", part["base"], reader, "sRGB", wrap, scale=(*part["color"], part["alpha"]))
            base.CreateOutput("rgb", Sdf.ValueTypeNames.Float3)
            surface.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).ConnectToSource(base.ConnectableAPI(), "rgb")
            normal = texture_shader(material_path, "Normal", part["normal"], reader, "raw", wrap, scale=(2.0, 2.0, 2.0, 1.0), bias=(-1.0, -1.0, -1.0, 0.0))
            normal.CreateOutput("rgb", Sdf.ValueTypeNames.Float3)
            surface.CreateInput("normal", Sdf.ValueTypeNames.Normal3f).ConnectToSource(normal.ConnectableAPI(), "rgb")
            rough = texture_shader(material_path, "Roughness", part["rough"], reader, "raw", wrap)
            rough.CreateOutput("g", Sdf.ValueTypeNames.Float)
            surface.CreateInput("roughness", Sdf.ValueTypeNames.Float).ConnectToSource(rough.ConnectableAPI(), "g")
            if part["base"].mime == "image/png":
                base.CreateOutput("a", Sdf.ValueTypeNames.Float)
                surface.CreateInput("opacity", Sdf.ValueTypeNames.Float).ConnectToSource(base.ConnectableAPI(), "a")
            elif part["blend"]:
                surface.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(part["alpha"])
            surface_output = surface.CreateOutput("surface", Sdf.ValueTypeNames.Token)
            material.CreateSurfaceOutput().ConnectToSource(surface_output)

            mesh = UsdGeom.Mesh.Define(stage, f"/Root/{label}")
            positions = (part["positions"] - shift).astype(np.float32)
            indices = part["indices"].ravel()
            mesh.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(positions))
            mesh.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(normalized(part["normals"]).astype(np.float32)))
            mesh.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
            mesh.CreateFaceVertexCountsAttr(Vt.IntArray(np.full(len(part["indices"]), 3).tolist()))
            mesh.CreateFaceVertexIndicesAttr(Vt.IntArray(indices.tolist()))
            mesh.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
            mesh.CreateDoubleSidedAttr(False)
            mesh.CreateExtentAttr(Vt.Vec3fArray([tuple(float(v) for v in positions.min(axis=0)), tuple(float(v) for v in positions.max(axis=0))]))
            st = part["uv"].astype(np.float32).copy()
            st[:, 1] = 1 - st[:, 1]
            primvar = UsdGeom.PrimvarsAPI(mesh).CreatePrimvar("st", Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
            primvar.Set(Vt.Vec2fArray.FromNumpy(st))
            UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)
        stage.GetRootLayer().Save()
        target = (directory / f"{name}.usdz").resolve()
        cwd = os.getcwd()
        os.chdir(temp)
        try:
            ok = UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath("model.usdc"), str(target))
        finally:
            os.chdir(cwd)
        assert ok, "USDZ gagal dibuat"
        del stage
    return target.stat().st_size


# ─── Cahaya ─────────────────────────────────────────────────────────────────


def read_hdr(path):
    data = path.read_bytes()
    end = data.index(b"\n\n") + 2
    line_end = data.index(b"\n", end)
    parts = data[end:line_end].split()
    height, width = int(parts[1]), int(parts[3])
    position = line_end + 1
    image = np.zeros((height, width, 4), dtype=np.uint8)
    for y in range(height):
        assert data[position] == 2 and data[position + 1] == 2
        position += 4
        for channel in range(4):
            x = 0
            while x < width:
                count = data[position]
                position += 1
                if count > 128:
                    count -= 128
                    image[y, x : x + count, channel] = data[position]
                    position += 1
                else:
                    image[y, x : x + count, channel] = np.frombuffer(data, np.uint8, count, position)
                    position += count
                x += count
    exponent = image[..., 3:4].astype(np.float32)
    return np.where(exponent > 0, image[..., :3] * np.ldexp(1.0, (exponent - 136).astype(int)), 0).astype(np.float32)


def write_hdr(path, rgb):
    height, width = rgb.shape[:2]
    peak = rgb.max(axis=-1, keepdims=True)
    mantissa, exponent = np.frexp(peak)
    scale = np.where(peak > 1e-20, mantissa * 256 / np.maximum(peak, 1e-20), 0)
    rgbe = np.concatenate([np.clip(rgb * scale, 0, 255), np.where(peak > 1e-20, exponent + 128, 0)], axis=-1).astype(np.uint8)
    out = bytearray(f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {height} +X {width}\n".encode())
    for y in range(height):
        out += bytes([2, 2, width >> 8, width & 255])
        for channel in range(4):
            line = rgbe[y, :, channel]
            x = 0
            while x < width:
                run = 1
                while x + run < width and run < 127 and line[x + run] == line[x]:
                    run += 1
                if run >= 3:
                    out += bytes([128 + run, line[x]])
                    x += run
                else:
                    start = x
                    x += run
                    while x < width and x - start < 128:
                        run = 1
                        while x + run < width and run < 3 and line[x + run] == line[x]:
                            run += 1
                        if run >= 3:
                            break
                        x += 1
                    out += bytes([x - start]) + line[start:x].tobytes()
    path.write_bytes(bytes(out))


def build_environment(source, target, factor=4):
    rgb = read_hdr(source)
    height, width = rgb.shape[0] // factor, rgb.shape[1] // factor
    small = rgb[: height * factor, : width * factor].reshape(height, factor, width, factor, 3).mean(axis=(1, 3))
    # Warna studio aslinya hangat; dinetralkan supaya warna plastik tidak bergeser
    mean = small.reshape(-1, 3).mean(axis=0)
    small = small * (mean.mean() / mean)
    write_hdr(target, small)
    return target.stat().st_size, (width, height)


# ─── Komposisi per kategori ─────────────────────────────────────────────────
# Warna hanya mengikuti identitas MicroJourney dan keragaman di foto; warna tidak menunjukkan jenis polimer.

LONG_TURNS = [(0.2, 55), (0.09, -130), (0.1, 40), (0.24, 385), (0.12, -60), (0.12, 110), (0.13, -70)]
KINKS = [(0.2, 18), (0.04, -72), (0.22, 26), (0.04, 64), (0.2, -20), (0.05, -58), (0.25, 22)]
BLUE = ("#5db5e6", "#2474ae", "#d5eef8")
CYAN = ("#6fdde4", "#177f94", "#d3f6f3")
GREEN = ("#58cfae", "#1b8c78", "#dcf6e8")
CLEAR = ("#d0f1fa", "#88cfe6", "#f2fcff")


def add_film(scene, label, item, *args, **kwargs):
    scene.add(label, item, *args, **kwargs)
    scene.entries[-1]["film"] = True


def build_fragments(t):
    s = Scene("fragmen")
    # Serpihan pipih bersudut dengan takik (Chinglenthoiba dkk. C1)
    s.add("fragmen", fragment(t, 11, 0.16, BLUE, corners=7, stretch=1.35, thickness=0.1, notches=1), -0.085, 0.05, yaw=25, tilt_x=6, tilt_z=-4)
    # Bongkah dengan bidang patah dan riak (Wu dkk. D, Gao dkk. F)
    s.add("fragmen", fragment(t, 23, 0.1, CYAN, corners=6, stretch=1.2, thickness=0.4, planes=11, radius_range=(0.7, 1.0), ripple=0.08, spacing=0.2, roughness=0.28, speck=0.0005), 0.1, 0.07, yaw=-30, tilt_x=8, tilt_z=5)
    # Batang dengan alur dan ujung berserabut (Li dkk. a)
    s.add("fragmen", splinter(t, 37, 0.27, 6.6, 0.05, GREEN, roughness=0.5, speck=0.0022, scratch=0.6), -0.01, -0.075, yaw=10, tilt_x=3)
    # Sabit tipis melengkung dengan tepi lebih tebal (Li dkk. b, Gao dkk. I)
    s.add("fragmen", fragment(t, 53, 0.12, CLEAR, thickness=0.05, curl=0.28, twist=0.5, rim=1.2, crescent=(3.6, 0.58), spacing=0.17, roughness=0.2, alpha=0.82, speck=0.0003), 0.01, 0.1, yaw=70, tilt_x=10)
    return s


def build_fibers():
    s = Scene("serat")
    # Serat panjang melingkar dan bersilangan (Gao dkk. B, Chinglenthoiba dkk. B)
    s.add("serat", fiber(3, 0.52, 0.0026, LONG_TURNS, "#2a93e0"), -0.04, -0.085, yaw=12, lift=0.002)
    # Gumpalan kusut dengan lengkung yang keluar dari gumpalan (Gao dkk. C)
    s.add("serat", tangle(9, 0.05, 0.0019, "#2f6fc0"), 0.115, 0.06, yaw=30, lift=0.001)
    # Serat pendek berkelok patah-patah (Gao dkk. A)
    s.add("serat", fiber(14, 0.13, 0.0021, KINKS, "#3acbe0", samples=130, smooth=3, wobble=1.0), 0.155, -0.07, yaw=-20, lift=0.001)
    # Lengkung lebar (Huang dkk. h)
    s.add("serat", fiber(19, 0.25, 0.0023, [(1.0, 165)], "#4f8cde", samples=130, smooth=15, wobble=1.2), -0.13, 0.045, yaw=40, lift=0.001)
    # Serat lurus lebih tebal dengan permukaan kasar dan ujung bengkok (Wu dkk. C)
    s.add("serat", fiber(26, 0.17, 0.004, [(0.93, 6), (0.07, 75)], "#2fbba6", samples=110, smooth=5, wobble=0.15, lift=0.15, bump=0.16, radial=6), -0.01, 0.105, yaw=-8, lift=0.001)
    return s


def build_films(t):
    s = Scene("film")
    # Lembaran hampir datar dengan takik dan garis lipat (Li dkk. c)
    add_film(s, "film", film(t, 5, 0.2, "#bdeefb", 0.4, corners=6, stretch=1.3, tears=1, creases=6, crease_depth=0.05, crumple=0.0015, thickness=0.012, radius_range=(0.86, 1.0), line_height=0.02), -0.08, 0.04, yaw=-12, tilt_x=5, lift=0.003)
    # Pita robek dan berkerut (Wu dkk. B, Chinglenthoiba dkk. C2)
    add_film(s, "film", film(t, 17, 0.26, "#8fe2f5", 0.46, corners=14, stretch=2.8, tears=3, creases=9, crease_depth=0.26, crumple=0.01, thickness=0.009), 0.03, -0.1, yaw=8, lift=0.002)
    # Lembaran biru dengan lipatan sejajar dan tepi terkikis (Gao dkk. E, Li dkk. d)
    add_film(s, "film", film(t, 29, 0.15, "#2d8fd6", 0.8, corners=7, stretch=1.25, tears=0, creases=4, crease_depth=0.13, crumple=0.003, thickness=0.016, parallel=True, chip=0.03, line_height=0.024, line_alpha=0.2), 0.115, 0.055, yaw=35, tilt_x=4, lift=0.002)
    return s


def build_pellets(t):
    s = Scene("pelet", margin=0.008)
    # Butiran tidak bulat sempurna dengan satu sisi rata (Chinglenthoiba dkk. A)
    s.add("pelet", Blob(7, 0.085, bead_shape(7, 0.045, 0.84, 0.1), pellet_paint(t, 7, "#eef2ec", "#d6d7c6", "#ffffff", roughness=0.58, pits=60), grid=11), -0.075, 0.015)
    # Cakram membulat dengan bibir tepi (Wu dkk. E)
    s.add("pelet", Blob(21, 0.085, lens_shape(21), pellet_paint(t, 21, "#c9eff7", "#9ddbea", "#f2fcff", roughness=0.2, pits=18, pit_depth=0.006, groove=lens_groove), grid=11, alpha=0.9), 0.055, 0.04, yaw=20, tilt_x=9, tilt_z=-5)
    # Silinder pendek (ilustratif, hanya dari deskripsi tertulis tentang pelet industri)
    s.add("pelet", Blob(33, 0.05, cylinder_shape(33, 1.5), pellet_paint(t, 33, "#8fdff2", "#63c3df", "#e6f9fd", roughness=0.36, pits=30, pit_depth=0.008), grid=11), -0.005, -0.075, yaw=35)
    # Butiran kecil (Gao dkk. D, Huang dkk. c)
    s.add("pelet", Blob(41, 0.034, bead_shape(41, 0.03, 0.95), pellet_paint(t, 41, "#3ec8cf", "#25a3ad", "#c9f6f6", roughness=0.34, pits=24, pit_depth=0.01), grid=7), 0.09, -0.05)
    return s


def build_all(t):
    s = Scene("semua", margin=0.014, film_atlas=512)
    s.add("fragmen", fragment(t, 63, 0.125, BLUE, corners=8, stretch=1.2, thickness=0.11), -0.11, 0.07, yaw=-20, tilt_x=6, tilt_z=4)
    s.add("fragmen", splinter(t, 67, 0.19, 6.2, 0.05, GREEN, roughness=0.5, speck=0.0022, scratch=0.6), 0.06, 0.125, yaw=170, tilt_x=3)
    s.add("serat", fiber(71, 0.44, 0.0024, [(0.25, 70), (0.15, -140), (0.22, 380), (0.18, -80), (0.2, 90)], "#2a93e0"), 0.09, -0.085, yaw=20, lift=0.002)
    s.add("serat", fiber(73, 0.2, 0.0022, [(1.0, 150)], "#4f8cde", samples=120, smooth=13, wobble=1.2), -0.14, -0.13, yaw=-60, lift=0.001)
    add_film(s, "film", film(t, 82, 0.15, "#a6e8f8", 0.5, corners=10, stretch=1.35, tears=1, creases=5, crease_depth=0.16, crumple=0.006, thickness=0.012), -0.065, -0.04, yaw=30, tilt_x=4, lift=0.003)
    s.add("pelet", Blob(83, 0.058, bead_shape(83, 0.045, 0.86, 0.08), pellet_paint(t, 83, "#eef2ec", "#d6d7c6", "#ffffff", roughness=0.58, pits=50), grid=10), 0.02, 0.03)
    s.add("pelet", Blob(87, 0.066, lens_shape(87), pellet_paint(t, 87, "#c9eff7", "#9ddbea", "#f2fcff", roughness=0.2, pits=14, pit_depth=0.006, groove=lens_groove), grid=10, alpha=0.9), 0.15, 0.035, yaw=-30, tilt_x=8, tilt_z=5)
    return s


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tiles = Tiles(CC0_DIR)
    shared_fiber = fiber_tile()
    only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
    builders = {"semua": lambda: build_all(tiles), "fragmen": lambda: build_fragments(tiles), "serat": build_fibers, "film": lambda: build_films(tiles), "pelet": lambda: build_pellets(tiles)}
    for name, builder in builders.items():
        if only and name not in only:
            continue
        scene = builder()
        parts, textures = scene.build(shared_fiber)
        triangles, glb_size, size, shift = write_glb(name, parts, textures, OUT_DIR)
        usdz_size = write_usdz(name, parts, textures, OUT_DIR, shift)
        sizes = ", ".join(f"{t.name} {len(t.data) // 1024}" for t in {id(t): t for t in textures}.values())
        print(f"{name}: {len(parts)} partikel, {triangles:,} segitiga, {size[0] * 100:.0f} x {size[1] * 100:.0f} x {size[2] * 100:.0f} cm, GLB {glb_size // 1024} KB, USDZ {usdz_size // 1024} KB | tekstur KB: {sizes}", flush=True)
    bytes_written, dimensions = build_environment(CC0_DIR / "studio_small_09" / "studio_small_09_1k.hdr", OUT_DIR / "studio.hdr")
    print(f"studio.hdr: {dimensions[0]}x{dimensions[1]}, {bytes_written // 1024} KB")


main()
