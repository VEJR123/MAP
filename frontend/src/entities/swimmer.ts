export type Gender = "M" | "F";

export interface SwimTime {
  id: string;
  event: string; // např. "100m Znak"
  personalBestMs: number;
  expectedTimeMs?: number;
}

export interface Swimmer {
  id: string;
  firstName: string;
  lastName: string;
  newLastName?: string;
  yearOfBirth?: number;
  gender: Gender;
  category?: string;
  times: SwimTime[];
}

export const mockSwimmers: Swimmer[] = [
  {
    id: "1",
    firstName: "Václav",
    lastName: "Eybl",
    yearOfBirth: 2006,
    gender: "M",
    category: "Open",
    times: [
      "100m Znak",
      "100m Prsa",
      "200m Prsa",
      "100m Motýlek",
      "200m Motýlek",
      "100m Volný způsob",
      "200m Volný způsob",
      "400m Volný způsob",
      "1500m Volný způsob",
      "200m Polohový závod",
      "400m Polohový závod",
      "50m Motýl",
      "50m Znak",
      "50m Prsa",
      "50m Volný způsob",
    ].map((event, index) => ({
      id: `1-${index}`,
      event,
      personalBestMs: 60_000,
      expectedTimeMs: 61_500,
    })),
  },
];


