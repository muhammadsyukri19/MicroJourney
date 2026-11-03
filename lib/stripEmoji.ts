/** Membersihkan emoji dari teks yang datang dari basis data, misalnya nama tokoh yang tersimpan sebelumnya */
export function stripEmoji(text: string) {
  return text.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').trim();
}
