import {Unit} from '../../../shared/components/interfaces/unit';

export interface ArticleType {
  id?: number;
  name: string;
  unit: Unit;
  prize: number
  additionalInformation?: string;
  articleNumber: string;
  isFlexPrice: boolean;
  isNegativePosition: boolean;
}
