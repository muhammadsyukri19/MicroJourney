export interface Food {
  id: string;
  name: string;
  image: string;  // path ke /public/foods/
  particles: number;
  unit: string;
  justification: string;
}

export const FOODS: Food[] = [
  {
    id: "garam",
    name: "Garam Dapur",
    image: "/foods/garam.webp",
    particles: 600,
    unit: "sendok makan",
    justification: "Berdasarkan data kristalisasi polutan pada garam rakyat akibat penguapan air laut yang tercemar."
  },
  {
    id: "kerang",
    name: "Kerang / Seafood",
    image: "/foods/kerang.webp",
    particles: 90,
    unit: "porsi (100g)",
    justification: "Kerang bersifat filter feeder, mengakibatkan laju bioakumulasi mikroplastik sangat tinggi pada jaringan tubuhnya."
  },
  {
    id: "air_mineral",
    name: "Air Mineral Botol",
    image: "/foods/air_mineral.webp",
    particles: 240,
    unit: "botol (600ml)",
    justification: "Estimasi peluruhan (leaching) mikro-nano plastik dari dinding botol polimer PET akibat fluktuasi suhu penyimpanan."
  },
  {
    id: "cilok",
    name: "Cilok (Wadah Styrofoam)",
    image: "/foods/cilok.webp",
    particles: 150,
    unit: "porsi",
    justification: "Peluruhan zat Polystyrene (PS) secara masif akibat kontak langsung antara makanan bersuhu tinggi (>80°C) dengan dinding wadah."
  },
  {
    id: "es_teh",
    name: "Es Teh Kemasan Plastik",
    image: "/foods/es_teh.webp",
    particles: 200,
    unit: "gelas cup",
    justification: "Pelepasan serpihan polimer Polypropylene (PP) akibat gesekan mekanis es batu dan tusukan sedotan plastik."
  }
];
