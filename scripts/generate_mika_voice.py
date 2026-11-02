"""
Membuat MP3 suara Mika dari lib/mikaVoiceLines.json ke public/audio/mika/.
Aplikasi otomatis memakai MP3 ini; bila belum ada, aplikasi memakai suara bawaan HP.

Butuh paket edge-tts (pip install edge-tts) dan koneksi internet.
Jalankan dari root repo: python scripts/generate_mika_voice.py
"""

import asyncio
import json
import os

import edge_tts

VOICE = "id-ID-GadisNeural"  # suara wanita Bahasa Indonesia
RATE = "+6%"
PITCH = "+12Hz"
OUT_DIR = os.path.join("public", "audio", "mika")


async def main():
    with open(os.path.join("lib", "mikaVoiceLines.json"), encoding="utf-8") as f:
        lines = json.load(f)
    os.makedirs(OUT_DIR, exist_ok=True)
    for key, text in lines.items():
        path = os.path.join(OUT_DIR, f"tahap2-{key}.mp3")
        await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(path)
        print("dibuat:", path)


if __name__ == "__main__":
    asyncio.run(main())
