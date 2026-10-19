import {Pipe, PipeTransform} from '@angular/core';
import {OrderState} from '../../../services/storage/interfaces/order';

@Pipe({
  name: 'orderState'
})
export class OrderStatePipe implements PipeTransform {

  transform(state: OrderState): string {
    switch (state) {
      case OrderState.OPEN:
        return 'Neu';
      case OrderState.IN_PROGRESS:
        return 'Rechnung erstellt';
      case OrderState.SENT_MAIL:
        return 'Mail verschickt'
      case OrderState.CLOSED:
        return 'Rechnung bezahlt';
    }
  }

}
