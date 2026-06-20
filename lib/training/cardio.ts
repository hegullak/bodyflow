export type CardioSlug = "longrun" | "tempo-run" | "4x4-interval" | "interval";

export const CARDIO_TYPES: { slug: CardioSlug; name: string; nameNo: string }[] = [
  { slug: "longrun",       name: "Long Run",     nameNo: "Langøkt" },
  { slug: "tempo-run",     name: "Tempo Run",    nameNo: "Tempoøkt" },
  { slug: "4x4-interval",  name: "4x4 Interval", nameNo: "4x4 intervall" },
  { slug: "interval",      name: "Interval",     nameNo: "Intervall" },
];

export const RUN_IMAGE_URL = "https://static.exercisedb.dev/media/oLrKqDH.gif";
