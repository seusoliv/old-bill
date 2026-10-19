import {Component, input, InputSignal} from '@angular/core';
import {Customer} from "../../../../services/storage/interfaces/customer";
import {NoValuePipe} from '../../../../shared/pipes/no-value.pipe';

@Component({
  selector: 'app-customer-info',
  imports: [
    NoValuePipe
  ],
  templateUrl: './customer-info.component.html',
  styleUrl: './customer-info.component.scss'
})
export class CustomerInfoComponent {
  readonly customer: InputSignal<Customer> = input.required<Customer>();
}
