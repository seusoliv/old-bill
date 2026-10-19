import {Component, input, InputSignal} from '@angular/core';
import {Order} from '../../../../services/storage/interfaces/order';
import {CurrencyPipe, DatePipe} from '@angular/common';
import {NoValuePipe} from '../../../../shared/pipes/no-value.pipe';
import {OrderStatePipe} from '../../pipes/order-state.pipe';

@Component({
  selector: 'app-order-info',
  imports: [
    DatePipe,
    NoValuePipe,
    CurrencyPipe,
    OrderStatePipe
  ],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.scss'
})
export class OrderInfoComponent {
  readonly order: InputSignal<Order> = input.required<Order>();
}
