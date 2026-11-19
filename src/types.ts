export const GAME_WIDTH = 1340;
export const GAME_HEIGHT = 800;

export type CharacterId =
  | 'carlos'
  | 'mateo'
  | 'pilot'
  | 'hero'
  | 'astro'
  | 'dino';

export type GameId = 'race' | 'playground' | 'classroom' | 'mountain';

export type ScreenId = 'select' | 'menu' | 'playing' | 'victory';

export type AnimState = 'idle' | 'run' | 'jump' | 'celebrate';

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  subtitle: string;
  accentColor: string;
  cardBg: string;
}

export const CHARACTERS: CharacterMeta[] = [
  {
    id: 'carlos',
    name: 'Carlos',
    subtitle: '¡El Graduado!',
    accentColor: '#1E3A8A',
    cardBg: '#DBEAFE',
  },
  {
    id: 'mateo',
    name: 'Mateo',
    subtitle: '¡El Aventurero!',
    accentColor: '#EA580C',
    cardBg: '#FFEDD5',
  },
  {
    id: 'pilot',
    name: 'Piloto',
    subtitle: '¡Súper Veloz!',
    accentColor: '#DC2626',
    cardBg: '#FEE2E2',
  },
  {
    id: 'hero',
    name: 'Súper',
    subtitle: '¡Héroe Valiente!',
    accentColor: '#2563EB',
    cardBg: '#E0E7FF',
  },
  {
    id: 'astro',
    name: 'Astro',
    subtitle: '¡Espacial!',
    accentColor: '#7C3AED',
    cardBg: '#EDE9FE',
  },
  {
    id: 'dino',
    name: 'Dino',
    subtitle: '¡Graduado Rex!',
    accentColor: '#16A34A',
    cardBg: '#DCFCE7',
  },
];

export interface PointerInfo {
  id: number;
  x: number;
  y: number;
  downX: number;
  downY: number;
  justPressed: boolean;
}

export interface InputSnapshot {
  pointers: PointerInfo[];
  keysDown: Set<string>;
  keysJustPressed: Set<string>;
}

export interface VictoryData {
  gameId: GameId;
  gameTitle: string;
  characterId: CharacterId;
  headline: string;
  statLabel: string;
  medalTitle: string;
  medalColor: 'gold' | 'rainbow' | 'star';
}

export interface MiniGame {
  update(dt: number, input: InputSnapshot): VictoryData | null;
  render(ctx: CanvasRenderingContext2D): void;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
