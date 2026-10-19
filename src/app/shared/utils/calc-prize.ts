import {Position} from '../components/interfaces/position.interface';

export class CalcPrizeUtils {
  static calcPrize(prize: number, count: number, isNegativePosition: boolean, discount: number | null): number {
    if (discount) {
      const factor = (100 - discount) / 100;
      return isNegativePosition ? prize * count * factor * -1 : prize * count * factor;
    } else {
      return isNegativePosition ? (prize * count) * -1 : prize * count;
    }
  }

  static calcTotalPrize(positions: Position[], discount?: number | null): number {
    const totalWithoutDiscount = positions
      .map((position: Position): number => this.calcPrize(position.prize, position.count, position.isNegativePosition, position.discount))
      .reduce((sum: number, current: number): number => sum + current, 0);
    if (discount) {
      const factor = (100 - discount) / 100;
      return totalWithoutDiscount * factor;
    } else {
      return totalWithoutDiscount;
    }
  }
}
