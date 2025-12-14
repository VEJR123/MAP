// src/core/config/relayRules.ts

export interface RelayLeg {
  stroke: 'Backstroke' | 'Breaststroke' | 'Butterfly' | 'Freestyle';
}

export interface RelayRule {
  legs: RelayLeg[];
  distance: number;
  description: string;
}

export const relayRules: Record<string, RelayRule> = {
  '4x50PZ': {
    distance: 50,
    description: '4x50m PZ',
    legs: [
      { stroke: 'Backstroke' },
      { stroke: 'Breaststroke' },
      { stroke: 'Butterfly' },
      { stroke: 'Freestyle' },
    ],
  },
  '4x100PZ': {
    distance: 100,
    description: '4x100m PZ',
    legs: [
      { stroke: 'Backstroke' },
      { stroke: 'Breaststroke' },
      { stroke: 'Butterfly' },
      { stroke: 'Freestyle' },
    ],
  },
  '4x50VZ': {
    distance: 50,
    description: '4x50m VZ',
    legs: [
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
    ],
  },
  '4x100VZ': {
    distance: 100,
    description: '4x100m VZ',
    legs: [
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
    ],
  },
    '4x200VZ': {
    distance: 200,
    description: '4x200m VZ',
    legs: [
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
      { stroke: 'Freestyle' },
    ],
  },
};
