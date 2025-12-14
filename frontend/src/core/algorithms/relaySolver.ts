// src/core/algorithms/relaySolver.ts

import { relayRules, RelayRule } from '../config/relayRules';

// --- Type Definitions ---
export interface NormalizedSwimmer {
  id: string;
  name: string;
  gender: 'M' | 'F';
  times: {
    [stroke: string]: { [distance: number]: number };
  };
}

export interface RelayLegAssignment {
  swimmer: NormalizedSwimmer;
  stroke: string;
  time: number;
}

export interface RelayTeam {
  swimmers: RelayLegAssignment[];
  totalTime: number;
}

// --- Solver Logic ---

function normalizeSwimmers(swimmers: any[]): NormalizedSwimmer[] {
  const getStrokeFromCode = (code: string): string | null => {
    const lastChar = code.slice(-1).toUpperCase();
    switch (lastChar) {
      case 'K': return 'Freestyle';
      case 'M': return 'Butterfly';
      case 'P': return 'Breaststroke';
      case 'Z': return 'Backstroke';
      default: return null;
    }
  };

  return swimmers.map(swimmer => {
    const timesByStrokeAndDistance: { [stroke: string]: { [distance: number]: number } } = {};

    for (const time of swimmer.times || []) {
      const stroke = getStrokeFromCode(time.event);
      const distanceMatch = time.event.match(/^(\d+)/);
      const distance = distanceMatch ? parseInt(distanceMatch[1], 10) : 0;

      if (stroke && distance && time.personalBestMs) {
        if (!timesByStrokeAndDistance[stroke]) {
          timesByStrokeAndDistance[stroke] = {};
        }
        const existingTime = timesByStrokeAndDistance[stroke][distance];
        if (!existingTime || time.personalBestMs < existingTime) {
          timesByStrokeAndDistance[stroke][distance] = time.personalBestMs;
        }
      }
    }
    return {
      id: swimmer.id,
      name: `${swimmer.firstName} ${swimmer.lastName}`,
      gender: swimmer.gender,
      times: timesByStrokeAndDistance,
    };
  });
}

function getBestTime(swimmer: NormalizedSwimmer, stroke: string, distance: number): number {
  return swimmer.times[stroke]?.[distance] || Infinity;
}

function getCombinations<T>(array: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(combination: T[], start: number) {
    if (combination.length === k) {
      result.push([...combination]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combination.push(array[i]);
      backtrack(combination, i + 1);
      combination.pop();
    }
  }
  backtrack([], 0);
  return result;
}

function solveFreestyle(pool: NormalizedSwimmer[], gender: 'M' | 'F' | 'MIX', distance: number): RelayTeam[] {
  let swimmersWithTimes: { swimmer: NormalizedSwimmer, time: number }[];

  if (gender === 'M' || gender === 'F') {
    swimmersWithTimes = pool
      .filter(s => s.gender === gender && getBestTime(s, 'Freestyle', distance) !== Infinity)
      .map(s => ({ swimmer: s, time: getBestTime(s, 'Freestyle', distance) }))
      .sort((a, b) => a.time - b.time);
  } else { // MIX
    const men = pool.filter(s => s.gender === 'M' && getBestTime(s, 'Freestyle', distance) !== Infinity).map(s => ({ swimmer: s, time: getBestTime(s, 'Freestyle', distance) })).sort((a, b) => a.time - b.time);
    const women = pool.filter(s => s.gender === 'F' && getBestTime(s, 'Freestyle', distance) !== Infinity).map(s => ({ swimmer: s, time: getBestTime(s, 'Freestyle', distance) })).sort((a, b) => a.time - b.time);
    if (men.length < 2 || women.length < 2) return [];
    swimmersWithTimes = [...men.slice(0, 2), ...women.slice(0, 2)];
  }

  if (swimmersWithTimes.length < 4) return [];

  const combos = getCombinations(swimmersWithTimes, 4);
  return combos.map(combo => {
    const totalTime = combo.reduce((sum, s) => sum + s.time, 0);
    return {
      swimmers: combo.map(s => ({ swimmer: s.swimmer, stroke: 'Freestyle', time: s.time })),
      totalTime,
    };
  });
}

function solveMedley(pool: NormalizedSwimmer[], gender: 'M' | 'F' | 'MIX', distance: number): RelayTeam[] {
  const legs = ['Backstroke', 'Breaststroke', 'Butterfly', 'Freestyle'];
  const allTeams: RelayTeam[] = [];
  
  const swimmerCombinations = getCombinations(pool, 4);

  for (const combo of swimmerCombinations) {
    const permutations = getCombinations(combo, combo.length); // This is wrong, should be permutations
    // A simple permutation implementation:
    const perms = (arr: any[]) => {
      if (arr.length === 0) return [[]];
      const first = arr[0];
      const rest = arr.slice(1);
      const permsWithoutFirst = perms(rest);
      const allPermutations: any[][] = [];
      permsWithoutFirst.forEach(p => {
        for (let i = 0; i <= p.length; i++) {
          const perm = [...p.slice(0, i), first, ...p.slice(i)];
          allPermutations.push(perm);
        }
      });
      return allPermutations;
    };

    const swimmerPermutations = perms(combo);


    for (const p of swimmerPermutations) {
      const currentTeam: RelayLegAssignment[] = [];
      let currentTotalTime = 0;
      let isValid = true;

      for (let i = 0; i < 4; i++) {
        const swimmer = p[i];
        const stroke = legs[i];
        const time = getBestTime(swimmer, stroke, distance);
        if (time === Infinity) {
          isValid = false;
          break;
        }
        currentTeam.push({ swimmer, stroke, time });
        currentTotalTime += time;
      }
      
      if (isValid) {
        if (gender === 'MIX') {
          const menCount = p.filter((s: NormalizedSwimmer) => s.gender === 'M').length;
          const womenCount = p.filter((s: NormalizedSwimmer) => s.gender === 'F').length;
          if (menCount !== 2 || womenCount !== 2) {
            continue;
          }
        }
        allTeams.push({ swimmers: currentTeam, totalTime: currentTotalTime });
      }
    }
  }

  return allTeams;
}

export function findOptimalRelayTeam(allSwimmers: any[], config: { poolLength: 25 | 50, relayType: string, gender: 'Muži' | 'Ženy' | 'Mix' }): RelayTeam[] {
  const normalizedPool = normalizeSwimmers(allSwimmers);
  const rule = relayRules[config.relayType];
  if (!rule) throw new Error('Unknown relay type');

  const genderMap = { 'Muži': 'M', 'Ženy': 'F', 'Mix': 'MIX' } as const;
  const mappedGender = genderMap[config.gender];

  let allTeams: RelayTeam[];
  if (rule.legs.every(leg => leg.stroke === 'Freestyle')) {
    allTeams = solveFreestyle(normalizedPool, mappedGender, rule.distance);
  } else {
    allTeams = solveMedley(normalizedPool, mappedGender, rule.distance);
  }
  
  return allTeams.sort((a, b) => a.totalTime - b.totalTime).slice(0, 6);
}