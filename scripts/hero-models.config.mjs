export const HERO_MODELS = [
  {
    id: "mailbox",
    src: "/home-v2/hero-models/mailbox.glb",
    x: 0.14,
    y: 0.18,
    height: 0.18,
    rotation: [-0.18, -0.52, 0.16],
    mobile: true,
    mobileLayout: { x: 0.12, y: 0.12, height: 0.13 },
  },
  {
    id: "watering-can",
    src: "/home-v2/hero-models/watering-can.glb",
    x: 0.8,
    y: 0.17,
    height: 0.16,
    rotation: [-0.12, 0.5, 0.1],
    mobile: true,
    mobileLayout: { x: 0.88, y: 0.12, height: 0.12 },
  },
  {
    id: "hand-tool-left",
    src: "/home-v2/hero-models/hand-tool-left.glb",
    x: 0.045,
    y: 0.43,
    height: 0.22,
    rotation: [0.18, -0.24, -0.48],
    mobile: false,
  },
  {
    id: "crate",
    src: "/home-v2/hero-models/crate.glb",
    x: 0.86,
    y: 0.58,
    height: 0.18,
    rotation: [-0.14, 0.46, -0.2],
    mobile: false,
  },
  {
    id: "barrel",
    src: "/home-v2/hero-models/barrel.glb",
    x: 0.16,
    y: 0.72,
    height: 0.18,
    rotation: [-0.2, -0.38, 0.02],
    mobile: true,
    mobileLayout: { x: 0.12, y: 0.88, height: 0.12 },
  },
  {
    id: "hand-tool-right",
    src: "/home-v2/hero-models/hand-tool-right.glb",
    x: 0.94,
    y: 0.36,
    height: 0.21,
    rotation: [0.12, 0.35, 0.58],
    mobile: false,
  },
];

export function getHeroModelsForViewport(width) {
  if (width > 820) return HERO_MODELS;
  return HERO_MODELS
    .filter((model) => model.mobile)
    .map((model) => ({ ...model, ...model.mobileLayout }));
}
