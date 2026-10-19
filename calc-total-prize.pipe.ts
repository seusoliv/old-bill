import {Pipe, PipeTransform} from '@angular/core';
import {CalcPrizeUtils} from '../../../shared/utils/calc-prize';
import {Position} from '../../../shared/components/interfaces/position.interface';

@Pipe({
  name: 'calcTotalPrize',
  standalone: true,
})
export class CalcTotalPrizePipe implements PipeTransform {

  transform(positions: Position[], discount: number | null): number {
    return CalcPrizeUtils.calcTotalPrize(positions, discount)
  }
}
