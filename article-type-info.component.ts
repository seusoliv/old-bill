import {Component, input, InputSignal} from '@angular/core';
import {ArticleType} from '../../../../services/storage/interfaces/article-type';
import {MatCheckbox} from '@angular/material/checkbox';
import {Unit} from '../../../../shared/components/interfaces/unit';
import {CurrencyPipe} from '@angular/common';

@Component({
  selector: 'app-article-type-info',
  imports: [
    MatCheckbox,
    CurrencyPipe
  ],
  templateUrl: './article-type-info.component.html',
  styleUrl: './article-type-info.component.scss'
})
export class ArticleTypeInfoComponent {
  readonly articleType: InputSignal<ArticleType> = input.required<ArticleType>();
  protected readonly Unit = Unit;
}
