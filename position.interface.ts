import {Unit} from './unit';

export interface Position {
  name: string;
  count: number;
  prize: number;
  unit: Unit;
  discount: number | null;
  isFlexPrice: boolean;
  isNegativePosition: boolean;
}
