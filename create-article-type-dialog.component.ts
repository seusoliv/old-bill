import {Component, inject, signal, Signal} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Unit} from '../../../../shared/components/interfaces/unit';
import {MatCheckbox} from '@angular/material/checkbox';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ArticleTypeCreateDialogData} from '../../interfaces/article-type-create-dialog-data';
import {MatOption} from '@angular/material/core';
import {MatAutocomplete, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {ArticleType} from '../../../../services/storage/interfaces/article-type';
import {ArticleTypeCreateDialogResult} from '../../interfaces/article-type-create-dialog-result';

interface FormType {
  name: FormControl<string>;
  unit: FormControl<Unit>;
  prize: FormControl<number | null>
  articleNumber: FormControl<string>;
  isFlexPrice: FormControl<boolean>;
  isNegativePosition: FormControl<boolean>;
}

@Component({
  selector: 'app-create-article-type-dialog',
  imports: [
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    MatCheckbox,
    MatOption,
    MatAutocomplete,
    MatAutocompleteTrigger,
  ],
  templateUrl: './create-article-type-dialog.component.html',
  styleUrl: './create-article-type-dialog.component.scss'
})
export class CreateArticleTypeDialogComponent {
  protected readonly data: Signal<ArticleTypeCreateDialogData | null> = signal(inject(MAT_DIALOG_DATA));
  protected readonly formGroup: FormGroup<FormType>;
  protected readonly Unit = Unit;
  private readonly dialogRef: MatDialogRef<CreateArticleTypeDialogComponent, ArticleTypeCreateDialogResult> = inject(MatDialogRef<CreateArticleTypeDialogComponent, ArticleTypeCreateDialogResult>);

  constructor() {
    const articleType = this.data()?.articleType;
    this.formGroup = this.createFormGroup();
    if (articleType !== undefined) {
      this.patchFormValues(articleType);
    }

  }

  onSave(): void {
    const articleType: ArticleType = {
      name: this.formGroup.controls.name.value,
      articleNumber: this.formGroup.controls.articleNumber.value,
      isNegativePosition: this.formGroup.controls.isNegativePosition.value,
      isFlexPrice: this.formGroup.controls.isNegativePosition.value,
      prize: this.formGroup.controls.prize.value!,
      unit: this.formGroup.controls.unit.value,
    }
    if (this.data()?.articleType !== undefined) {
      articleType.id = this.data()!.articleType.id!;
    }
    this.dialogRef.close({
      articleType
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private createFormGroup(): FormGroup<FormType> {
    return new FormGroup<FormType>({
      name: new FormControl<string>('', {nonNullable: true, validators: [Validators.required]}),
      articleNumber: new FormControl<string>('', {nonNullable: true, validators: [Validators.required]}),
      prize: new FormControl<number | null>(null, {validators: [Validators.required]}),
      isFlexPrice: new FormControl<boolean>(false, {nonNullable: true}),
      isNegativePosition: new FormControl<boolean>(false, {nonNullable: true}),
      unit: new FormControl<Unit>(Unit.PIECE, {nonNullable: true, validators: [Validators.required]}),
    })
  }

  private patchFormValues(articleType: ArticleType): void {
    this.formGroup.patchValue(articleType);
  }
}
