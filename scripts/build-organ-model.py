"""
Model saluran pencernaan untuk Tahap 4: kerongkongan, lambung, usus halus, dan usus besar dari BodyParts3D, ditambah
partikel mikroplastik ilustratif yang bergerak sepanjang jalur. GLB dan USDZ berisi satu komposisi yang sama, jadi
partikel ikut tampil di AR. Jalur partikel hanya ilustrasi, bukan hasil pengamatan di dalam tubuh.

BodyParts3D, Copyright(C) 2008 Life Science Integrated Database Center, CC Attribution-Share Alike 2.1 Japan.
Modifikasi: mesh digabung per organ, disederhanakan, diputar, dan diberi warna. Hasilnya berlisensi sama.

Butuh numpy, fast-simplification, dan usd-core. Jalankan dari root repo:
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

# Klip animasi: nama, bagian jalur (None berarti seluruh jalur), jumlah partikel, durasi detik, jumlah kunci
PARTICLE_COUNT = 30
FULL_DURATION = 40.0
ROTATION_KEYS = 25
USD_FPS = 24
CLIPS = [
    ("jalur_lengkap", None, 30, FULL_DURATION, 160),
    ("kerongkongan", "kerongkongan", 8, 8.0, 24),
    ("lambung", "lambung", 14, 16.0, 48),
    ("usus_halus", "usus_halus", 14, 26.0, 110),
    ("usus_besar", "usus_besar", 14, 26.0, 80),
]

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


def inner_points(verts, faces, normals, samples, seed):
    """Titik tengah rongga: dari permukaan, sinar ke arah dalam sampai dinding seberang."""
    rng = np.random.default_rng(seed)
    pick = rng.choice(len(verts), min(samples, len(verts)), replace=False)
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    e1, e2 = b - a, c - a
    found = []
    for index in pick:
        origin = verts[index] - normals[index] * 1e-4
        direction = -normals[index]
        p = np.cross(direction, e2)
        det = (e1 * p).sum(-1)
        ok = np.abs(det) > 1e-12
        inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
        s = origin - a
        u = (s * p).sum(-1) * inv
        q = np.cross(s, e1)
        v = (direction * q).sum(-1) * inv
        t = (e2 * q).sum(-1) * inv
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-3)
        if hit.any():
            found.append(origin + direction * t[hit].min() / 2)
    return np.array(found)


def walk(points, start, jump=0.05):
    """Mengurutkan titik rongga dari titik awal dengan langkah terdekat; berhenti bila titik berikutnya terlalu jauh."""
    remaining = np.ones(len(points), dtype=bool)
    current = start
    chain = []
    while remaining.any():
        indices = np.flatnonzero(remaining)
        distances = np.linalg.norm(points[indices] - current, axis=1)
        nearest = int(np.argmin(distances))
        if chain and distances[nearest] > jump:
            break
        current = points[indices[nearest]]
        chain.append(current)
        remaining[indices[nearest]] = False
    return np.array(chain)


def inside_mesh(points, verts, faces):
    """Titik berada di dalam mesh tertutup bila sinar dari titik itu menembus permukaan sebanyak bilangan ganjil."""
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    e1, e2 = b - a, c - a
    direction = normalized(np.array([0.37, 0.53, 0.76]))
    p = np.cross(direction, e2)
    det = (e1 * p).sum(-1)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
    result = []
    for origin in points:
        s = origin - a
        u = (s * p).sum(-1) * inv
        q = np.cross(s, e1)
        v = (direction * q).sum(-1) * inv
        t = (e2 * q).sum(-1) * inv
        result.append(int((ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 0)).sum()) % 2 == 1)
    return np.array(result)


def arc_path(points, start, end, bins):
    """Garis tengah organ melengkung: titik rongga dikelompokkan menurut sudut di sekitar lekukannya."""
    middle = (start + end) / 2
    first, last = normalized(start - middle), normalized(end - middle)
    side = normalized(points.mean(axis=0) - middle)
    side = normalized(side - first * (side @ first))
    offset = points - middle
    angle = np.arctan2(offset @ side, offset @ first) % TWO_PI
    sweep = np.arctan2(last @ side, last @ first) % TWO_PI
    edges = np.linspace(0, sweep, bins + 1)
    chain = [start]
    for low, high in zip(edges[:-1], edges[1:]):
        group = points[(angle >= low) & (angle < high)]
        if len(group):
            chain.append(np.median(group, axis=0))
    chain.append(end)
    return np.array(chain)


def smooth_path(path, width):
    kernel = np.hanning(width + 2)[1:-1]
    kernel /= kernel.sum()
    padded = np.concatenate([np.repeat(path[:1], width, axis=0), path, np.repeat(path[-1:], width, axis=0)])
    return np.column_stack([np.convolve(padded[:, k], kernel, mode="same") for k in range(3)])[width:-width]


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


def flat(verts, faces):
    tri = verts[faces]
    normals = normalized(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]))
    return tri.reshape(-1, 3), np.repeat(normals, 3, axis=0), np.arange(len(tri) * 3)


def quaternion(axis, angle):
    return np.concatenate([axis * np.sin(angle / 2), [np.cos(angle / 2)]])


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
            translate, orient, scale = xform.AddTranslateOp(), xform.AddOrientOp(), xform.AddScaleOp()
            track = particle["full"]
            for k, moment in enumerate(track["times"]):
                when = float(moment) * USD_FPS
                translate.Set(Gf.Vec3d(*(float(v) for v in track["translation"][k])), when)
                # Skala nol membuat matriks tidak bisa dibalik di beberapa penampil USD
                scale.Set(Gf.Vec3f(*(max(float(v), 0.001) for v in track["scale"][k])), when)
            for k, moment in enumerate(track["rotation_times"]):
                x, y, z, w = (float(v) for v in track["rotation"][k])
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
    chain_parts = []
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

    # Jalur ilustratif dari kerongkongan sampai rektum
    def moved(fma):
        points, part_faces = raw_parts[fma]
        return points - shift, part_faces

    def cavity(fma, samples):
        points, part_faces = moved(fma)
        return inner_points(points, part_faces, vertex_normals(points, part_faces), samples, sum(map(ord, fma)))

    esophagus = cavity("FMA7131", 60)
    esophagus = smooth_path(esophagus[np.argsort(-esophagus[:, 1])], 7)
    duodenum_points = cavity("FMA7206", 120)
    pylorus = duodenum_points[np.argmin(np.linalg.norm(duodenum_points - moved("FMA7148")[0].mean(axis=0), axis=1))]
    stomach_points, stomach_faces = moved("FMA7148")
    stomach = resample(smooth_path(arc_path(cavity("FMA7148", 500), esophagus[-1], pylorus, 14), 3), 60)
    print("jalur lambung di dalam rongga:", int(inside_mesh(stomach, stomach_points, stomach_faces).sum()), "dari", len(stomach), flush=True)
    small, current = [], stomach[-1]
    for fma, samples in (("FMA7206", 120), ("FMA7207", 420), ("FMA7208", 420)):
        section = walk(cavity(fma, samples), current, jump=0.06)
        small.append(section)
        current = section[-1]
    small = smooth_path(np.vstack(small), 5)
    colon_points = cavity("FMA14543nsn", 500)
    cecum = colon_points[np.argmin(np.linalg.norm(colon_points - moved("FMA14542")[0].mean(axis=0), axis=1))]
    colon = walk(colon_points, cecum, jump=0.06)
    rectum = cavity("FMA14544", 60)
    large = smooth_path(np.vstack([colon, rectum[np.argsort(-rectum[:, 1])]]), 5)
    sections = {"kerongkongan": esophagus, "lambung": stomach, "usus_halus": small, "usus_besar": large}
    for name, section in sections.items():
        print(f"jalur {name}: {len(section)} titik, {np.linalg.norm(np.diff(section, axis=0), axis=1).sum():.2f} m", flush=True)
    full_path = np.vstack(list(sections.values()))

    # Partikel: bentuk berbeda dan fase berbeda; ukurannya diperbesar supaya terlihat
    rng = np.random.default_rng(404)
    makers = {"fragmen": fragment_mesh, "serat": fiber_mesh, "film": film_mesh, "pelet": pellet_mesh}
    sequence = (["fragmen", "serat", "pelet", "film"] * 8)[:PARTICLE_COUNT]
    particles = []
    for kind in sequence:
        verts, faces = makers[kind](rng)
        positions, normals, indices = flat(verts * rng.uniform(0.007, 0.0105), faces)
        particles.append({"kind": kind, "positions": positions, "normals": normals, "indices": indices, "axis": normalized(rng.normal(0, 1, 3)), "turns": int(rng.integers(1, 4)), "start": rng.uniform(0, TWO_PI), "jitter": rng.normal(0, 0.0025, 3)})

    def tracks(particle, path, phase, duration, keys, spread=0.0, mesh=None):
        """Satu putaran melingkar: partikel mengecil di ujung jalur dan muncul lagi di awal."""
        points = resample(path, max(keys * 2, 240))
        times = np.linspace(0, duration, keys)
        where = ((phase + np.linspace(0, 1, keys)) % 1.0) * (len(points) - 1)
        translation = np.column_stack([np.interp(where, np.arange(len(points)), points[:, k]) for k in range(3)]) + particle["jitter"]
        if spread:
            # Partikel menyebar di rongga, tetapi kembali ke garis tengah bila sebarannya menembus dinding
            shifted = translation + normalized(particle["jitter"]) * spread
            keep = inside_mesh(shifted, *mesh)
            translation = np.where(keep[:, None], shifted, translation)
        scale = np.ones((keys, 3))
        for k in range(keys - 1):
            if where[k + 1] < where[k]:
                scale[k] = scale[k + 1] = 0
        if scale[0, 0] == 0 or scale[-1, 0] == 0:
            scale[0] = scale[-1] = 0
        rotation_times = np.linspace(0, duration, ROTATION_KEYS)
        angles = particle["turns"] * TWO_PI * np.linspace(0, 1, ROTATION_KEYS) + particle["start"]
        rotation = np.array([quaternion(particle["axis"], a) for a in angles])
        return {"times": times, "translation": translation, "scale": scale, "rotation_times": rotation_times, "rotation": rotation}

    clips = []
    for name, path, count, duration, keys in CLIPS:
        path = full_path if path is None else sections[path]
        order = sorted({round(i * PARTICLE_COUNT / count) for i in range(count)})
        extra = {"spread": 0.016, "mesh": (stomach_points, stomach_faces)} if name == "lambung" else {}
        items = {i: tracks(particles[i], path, order.index(i) / len(order), duration, keys, **extra) for i in order}
        clips.append((name, duration, items))
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
    particle_nodes = []
    for i, particle in enumerate(particles):
        primitive = {
            "attributes": {"POSITION": glb.add(particle["positions"].astype(np.float32), 5126, "VEC3", 34962, bounds=True), "NORMAL": glb.add(particle["normals"].astype(np.float32), 5126, "VEC3", 34962)},
            "indices": glb.add(particle["indices"].astype(np.uint16), 5123, "SCALAR", 34963),
            "material": particle_material[particle["kind"]],
        }
        meshes.append({"name": f"partikel_{i + 1}", "primitives": [primitive]})
        rest = particle["full"]["translation"][0]
        nodes.append({"name": f"partikel_{i + 1}", "mesh": len(meshes) - 1, "translation": [float(v) for v in rest]})
        particle_nodes.append(len(nodes) - 1)
        root_children.append(len(nodes) - 1)
    animations = []
    for name, duration, items in clips:
        samplers, channels = [], []
        first = next(iter(items.values()))
        time_accessor = glb.add(first["times"].astype(np.float32), 5126, "SCALAR", bounds=True)
        spin_accessor = glb.add(first["rotation_times"].astype(np.float32), 5126, "SCALAR", bounds=True)
        step_accessor = None

        def channel(node, target, input_accessor, values, kind):
            samplers.append({"input": input_accessor, "output": glb.add(values.astype(np.float32), 5126, kind), "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": node, "path": target}})

        for i, node in enumerate(particle_nodes):
            item = items.get(i)
            if item is None:
                # Partikel yang tidak dipakai jalur ini disembunyikan
                if step_accessor is None:
                    step_accessor = glb.add(np.array([0, duration], dtype=np.float32), 5126, "SCALAR", bounds=True)
                channel(node, "scale", step_accessor, np.zeros((2, 3)), "VEC3")
                continue
            channel(node, "translation", time_accessor, item["translation"], "VEC3")
            channel(node, "scale", time_accessor, item["scale"], "VEC3")
            channel(node, "rotation", spin_accessor, item["rotation"], "VEC4")
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
    print(f"organ {triangles:,} segitiga, partikel {sum(len(p['indices']) // 3 for p in particles):,} segitiga, GLB {total // 1024} KB, USDZ {(OUT_DIR / 'digestive.usdz').stat().st_size // 1024} KB")
    size = high - low
    print(f"ukuran {size[0] * 100:.0f} x {size[1] * 100:.0f} x {size[2] * 100:.0f} cm")
    for name, data in organs.items():
        center = (data["verts"].min(axis=0) + data["verts"].max(axis=0)) / 2
        extent = data["verts"].max(axis=0) - data["verts"].min(axis=0)
        print(f"{name}: pusat {center[0]:.3f}m {center[1]:.3f}m {center[2]:.3f}m, ukuran {extent[0]:.3f} {extent[1]:.3f} {extent[2]:.3f}")
    # Lambung berada di sisi kiri tubuh (x positif bila wajah menghadap +z), rektum di sisi belakang
    print("cek arah: lambung x", round(float(organs["lambung"]["verts"][:, 0].mean()), 3), "rektum z", round(float(moved("FMA14544")[0][:, 2].mean()), 3), "lambung z", round(float(organs["lambung"]["verts"][:, 2].mean()), 3))


main()
