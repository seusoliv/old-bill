import {Pipe, PipeTransform} from '@angular/core';
import {CalcPrizeUtils} from '../../../shared/utils/calc-prize';

@Pipe({
  name: 'calcPrize',
  standalone: true,
})
export class CalcPrizePipe implements PipeTransform {

  transform(prize: number, count: number, isNegative: boolean, discount: number | null): number {
    return CalcPrizeUtils.calcPrize(prize, count, isNegative, discount)
  }
}
