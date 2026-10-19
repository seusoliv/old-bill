import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'noValue'
})
export class NoValuePipe implements PipeTransform {

  transform(value: any): any {
    if (value === undefined || value === null || value === '') {
      return '-';
    } else {
      return value;
    }
  }

}
