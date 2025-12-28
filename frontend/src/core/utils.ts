// src/core/utils.ts

export const formatMs = (v?: number | string) => {
  if (v === undefined || v === null || v === '' || !Number.isFinite(Number(v))) {
    return '—';
  }
  const n = Number(v);
  const centiseconds = Math.floor((n % 1000) / 10);
  const totalSeconds = Math.floor(n / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const formattedMinutes = minutes > 0 ? `${minutes}:` : '';
  const formattedSeconds = minutes > 0 ? String(seconds).padStart(2, '0') : String(seconds);
  const formattedCentiseconds = String(centiseconds).padStart(2, '0');

  return `${formattedMinutes}${formattedSeconds};${formattedCentiseconds}`;
};

// World records in milliseconds for different pool sizes and genders
// Structure: { event: { M: {50: ms, 25: ms}, F: {50: ms, 25: ms} } }
// Values are exact milliseconds (e.g., 46.91s => 46910 ms)
const WORLD_RECORDS: Record<string, { M: Record<number, number>; F: Record<number, number> }> = {
  // Freestyle
  "50m Volný způsob": { M: { 50: 20910, 25: 19900 }, F: { 50: 23610, 25: 22830 } },        // M LCM 20.91s, SCM 19.90s | F LCM 23.61s, SCM 22.83s
  "100m Volný způsob": { M: { 50: 46400, 25: 44840 }, F: { 50: 51710, 25: 49930 } },       // M LCM 46.40s, SCM 44.84s | F LCM 51.71s, SCM 49.93s
  "200m Volný způsob": { M: { 50: 102000, 25: 98610 }, F: { 50: 112230, 25: 109360 } },     // M LCM 1:42.00, SCM 1:38.61 | F LCM 1:52.23, SCM 1:49.36
  "400m Volný způsob": { M: { 50: 219960, 25: 212250 }, F: { 50: 234180, 25: 230250 } },    // M LCM 3:39.96, SCM 3:32.25 | F LCM 3:54.18, SCM 3:50.25
  "1500m Volný způsob": { M: { 50: 870670, 25: 846880 }, F: { 50: 920480, 25: 908240 } },   // M LCM 14:30.67, SCM 14:06.88 | F LCM 15:20.48, SCM 15:08.24

  // Butterfly
  "50m Motýlek": { M: { 50: 22270, 25: 21320 }, F: { 50: 24430, 25: 23720 } },           // M LCM 22.27, SCM 21.32 | F LCM 24.43, SCM 23.72
  "100m Motýlek": { M: { 50: 49450, 25: 47680 }, F: { 50: 54600, 25: 52710 } },          // M LCM 49.45, SCM 47.68 | F LCM 54.60, SCM 52.71
  "200m Motýlek": { M: { 50: 110340, 25: 106850 }, F: { 50: 121810, 25: 119320 } },        // M LCM 1:50.34, SCM 1:46.85 | F LCM 2:01.81, SCM 1:59.32

  // Backstroke
  "50m Znak": { M: { 50: 22970, 25: 22110 }, F: { 50: 26860, 25: 25230 } },              // M LCM 22.97, SCM 22.11 | F LCM 26.86, SCM 25.23
  "100m Znak": { M: { 50: 51600, 25: 48160 }, F: { 50: 57130, 25: 54020 } },             // M LCM 51.60, SCM 48.16 | F LCM 57.13, SCM 54.02
  "200m Znak": { M: { 50: 111920, 25: 105120 }, F: { 50: 123140, 25: 117330 } },          // M LCM 1:51.92, SCM 1:45.12 | F LCM 2:03.14, SCM 1:57.33

  // Breaststroke
  "50m Prsa": { M: { 50: 25950, 25: 24950 }, F: { 50: 29160, 25: 28370 } },              // M LCM 25.95, SCM 24.95 | F LCM 29.16, SCM 28.37
  "100m Prsa": { M: { 50: 56880, 25: 55280 }, F: { 50: 64130, 25: 62360 } },             // M LCM 56.88, SCM 55.28 | F LCM 1:04.13(64.13s), SCM 1:02.36(62.36s)
  "200m Prsa": { M: { 50: 125480, 25: 119520 }, F: { 50: 137550, 25: 132500 } },          // M LCM 2:05.48, SCM 1:59.52 | F LCM 2:17.55, SCM 2:12.50

  // Medley
  "200m Polohový závod": { M: { 50: 112690, 25: 109280 }, F: { 50: 125700, 25: 121630 } }, // M LCM 1:52.69, SCM 1:49.28 | F LCM 2:05.70, SCM 1:55.11
  "400m Polohový závod": { M: { 50: 242500, 25: 234810 }, F: { 50: 263650, 25: 255480 } }, // M LCM 4:02.50, SCM 3:54.81 | F LCM 4:23.65, SCM 4:15.48
};

/**
 * Calculate FINA points using the formula: (worldRecord / swimmerTime) * 1000
 * @param timeMs Time in milliseconds
 * @param eventId Event identifier (e.g., '100m Volný způsob')
 * @param poolSize Pool size in meters (default 50)
 * @returns Calculated FINA points (rounded to integer)
 */
export type Gender = 'M' | 'F';

export const calculateFinaPoints = (
  timeMs: number,
  eventId: string,
  poolSize: number = 50,
  gender: Gender = 'M'
): number => {
  const records = WORLD_RECORDS[eventId];
  
  if (!records) {
    console.warn(`No world record found for event: ${eventId}`);
    return 0;
  }

  const genderRecords = records[gender];
  if (!genderRecords) {
    console.warn(`No world record for gender ${gender} on event: ${eventId}`);
    return 0;
  }

  const worldRecordMs = genderRecords[poolSize];
  
  if (!worldRecordMs) {
    console.warn(`No world record found for event: ${eventId} in ${poolSize}m pool for gender ${gender}`);
    return 0;
  }

  // FINA-style formula (higher points for faster times): (worldRecord / swimmerTime) * 1000
  const points = (worldRecordMs / timeMs) * 1000;

  return Math.round(points);
};

/**
 * Return detailed FINA calculation data for debugging.
 */
export const getFinaDetails = (
  timeMs: number,
  eventId: string,
  poolSize: number = 50,
  gender: Gender = 'M'
) => {
  const records = WORLD_RECORDS[eventId];
  const genderRecords = records ? records[gender] : undefined;
  const worldRecordMs = genderRecords ? genderRecords[poolSize] : undefined;
  const points = (worldRecordMs && timeMs) ? Math.round((worldRecordMs / timeMs) * 1000) : 0;
  return {
    eventId,
    poolSize,
    gender,
    worldRecordMs: worldRecordMs || null,
    timeMs: timeMs || null,
    points,
  };
};
