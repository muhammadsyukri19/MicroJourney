// Pilihan LKPD Tahap 3. Yang disimpan hanya huruf pilihannya, jadi tampilan perlu menerjemahkannya
export const LKPD2_OPTIONS = [
  { id: 'a', text: 'Melalui bioakumulasi hewan filter-feeder dan peluruhan polimer dari wadah kemasan' },
  { id: 'b', text: 'Hanya melalui sayuran yang ditanam di tanah tercemar' },
  { id: 'c', text: 'Melalui proses memasak menggunakan kompor gas' },
];
export const LKPD2_CORRECT = 'a';

export function lkpd2Text(answer?: string) {
  if (!answer) return '';
  return LKPD2_OPTIONS.find(option => option.id === answer)?.text ?? answer;
}

const ORGAN_NAMES: [string, string][] = [
  ['usus halus', 'Usus Halus'],
  ['usus besar', 'Usus Besar'],
  ['lambung', 'Lambung'],
  ['darah', 'Darah'],
  ['kerongkongan', 'Kerongkongan'],
  ['mulut', 'Mulut'],
];

/** Jawaban organ berupa kalimat bebas, jadi yang diambil adalah organ pertama yang disebut siswa */
export function organFromAnswer(answer?: string) {
  const text = (answer ?? '').toLowerCase();
  const found = ORGAN_NAMES.map(([word, name]) => ({ name, at: text.indexOf(word) })).filter(item => item.at >= 0);
  return found.sort((a, b) => a.at - b.at)[0]?.name ?? '';
}
