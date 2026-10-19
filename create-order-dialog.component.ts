import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  resource,
  ResourceLoaderParams,
  signal,
  Signal,
  WritableSignal
} from '@angular/core';
import {MatFormField, MatLabel, MatPrefix, MatSuffix} from '@angular/material/form-field';
import {MatAutocomplete, MatAutocompleteTrigger, MatOption} from '@angular/material/autocomplete';
import {MatInput} from '@angular/material/input';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import {Customer} from '../../../../services/storage/interfaces/customer';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CustomersService} from '../../../../services/storage/customers.service';
import {debounceTime} from 'rxjs';
import {DEBOUNCE_TIME} from '../../../../constans';
import {Unit} from '../../../../shared/components/interfaces/unit';
import {ArticleType} from '../../../../services/storage/interfaces/article-type';
import {ArticleTypesService} from '../../../../services/storage/article-types.service';
import {MatButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {CurrencyPipe} from '@angular/common';
import {CalcPrizePipe} from '../../pipes/calc-prize.pipe';
import {MatDivider} from '@angular/material/divider';
import {CalcTotalPrizePipe} from '../../pipes/calc-total-prize.pipe';
import {Position} from '../../../../shared/components/interfaces/position.interface';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {OrderCreateDialogResult} from '../../interfaces/order-create-dialog-result';
import {Order, OrderState} from '../../../../services/storage/interfaces/order';
import {CalcPrizeUtils} from '../../../../shared/utils/calc-prize';
import {OrderCreateDialogData} from '../../interfaces/order-create-dialog-data';
import {v4 as uuidv4} from 'uuid';


interface FormType {
  customer: FormControl<Customer | null>;
  positions: FormArray<FormGroup<PositionFormType>>;
  discount: FormControl<number | null>;
}

export interface PositionFormType {
  id: FormControl<string>;
  name: FormControl<string>;
  count: FormControl<number>;
  prize: FormControl<number>;
  unit: FormControl<Unit>;
  discount: FormControl<number | null>;
  isFlexPrice: FormControl<boolean>;
  isNegativePosition: FormControl<boolean>;
}

@Component({
  selector: 'app-create-order-dialog',
  imports: [
    MatFormField,
    MatAutocomplete,
    MatInput,
    ReactiveFormsModule,
    MatAutocompleteTrigger,
    MatOption,
    MatLabel,
    MatTooltip,
    CurrencyPipe,
    MatSuffix,
    MatButton,
    MatPrefix,
    CalcPrizePipe,
    MatDivider,
    CalcTotalPrizePipe
  ],
  templateUrl: './create-order-dialog.component.html',
  styleUrl: './create-order-dialog.component.scss'
})
export class CreateOrderDialogComponent implements OnInit {
  protected readonly customerControl: FormControl<Customer | string> = new FormControl<Customer | string>('', {nonNullable: true});
  protected readonly articleTypeControl: FormControl<ArticleType | string> = new FormControl<ArticleType | string>('', {nonNullable: true});
  protected readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly positions: WritableSignal<Position[]> = signal<Position[]>([]);
  protected readonly data: Signal<OrderCreateDialogData | null> = signal<OrderCreateDialogData>(inject(MAT_DIALOG_DATA));
  protected readonly formGroup: FormGroup<FormType>;
  protected readonly Unit = Unit;
  private readonly dialogRef: MatDialogRef<CreateOrderDialogComponent, OrderCreateDialogResult> = inject(MatDialogRef);
  private readonly customerSearchString: WritableSignal<string> = signal<string>('');
  private readonly articleTypeSearchString: WritableSignal<string> = signal<string>('');
  private readonly updateCustomers = resource<Customer[], string>({
    request: (): string => this.customerSearchString(),
    loader: (param: ResourceLoaderParams<string>): Promise<Customer[]> => this.loadCustomers(param.request)
  });
  protected readonly customers: Signal<Customer[]> = computed((): Customer[] => this.updateCustomers.value() ?? []);
  private readonly updateArticleTypes = resource<ArticleType[], string>({
    request: (): string => this.articleTypeSearchString(),
    loader: (param: ResourceLoaderParams<string>): Promise<ArticleType[]> => this.loadArticleTypes(param.request)
  });
  protected readonly articleTypes: Signal<ArticleType[]> = computed((): ArticleType[] => this.updateArticleTypes.value() ?? []);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly customersService: CustomersService = inject(CustomersService);
  private readonly articleTypesService: ArticleTypesService = inject(ArticleTypesService);

  constructor() {
    const order = this.data()?.order;
    this.formGroup = this.createFormGroup();
    if (order !== undefined) {
      this.patchFormGroup(order);
      this.positions.set(order.positions);
    }
  }

  ngOnInit(): void {
    this.customerControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(DEBOUNCE_TIME)
      ).subscribe({
      next: (input: string | Customer): void => {
        if (typeof input === 'string') {
          this.customerSearchString.set(input);
        } else {
          this.customerSearchString.set(input.surname);
          this.formGroup.controls.customer.setValue(input, {emitEvent: false})
        }
      }
    });

    this.articleTypeControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(DEBOUNCE_TIME)
      ).subscribe({
      next: (input: string | ArticleType): void => {
        if (typeof input === 'string') {
          this.articleTypeSearchString.set(input);
        } else {
          this.articleTypeSearchString.set('');
          this.articleTypeControl.setValue('', {emitEvent: false});
          this.addPositionFormGroup(input);
        }
      }
    })

    this.formGroup.controls.positions.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(DEBOUNCE_TIME))
      .subscribe({
        next: (): void => {
          const controls = this.formGroup.controls.positions;
          const positions: Position[] = controls.controls.map((value: FormGroup<PositionFormType>): Position => {
            return {
              name: value.controls.name.value,
              prize: value.controls.prize.value,
              isFlexPrice: value.controls.isFlexPrice.value,
              discount: value.controls.discount.value,
              isNegativePosition: value.controls.isNegativePosition.value,
              count: value.controls.count.value,
              unit: value.controls.unit.value,
            }
          })
          this.positions.set(positions);
        }
      })
  }

  displayCustomer(customer: Customer | string): string {
    if (typeof customer !== 'string') {
      return customer.surname + ' ' + customer.name;
    }
    return '';
  }

  displayArticle(article: ArticleType | string): string {
    if (typeof article !== 'string') {
      return article.name;
    }
    return '';
  }

  deleteArticle(id: string): void {
    const index = this.formGroup.controls.positions.controls.findIndex((formGroup: FormGroup<PositionFormType>): boolean => formGroup.controls.id.value === id);
    if (index != -1) {
      this.formGroup.controls.positions.removeAt(index);
    }
  }

  onSave(): void {
    const order: Order = {
      customerNumber: this.formGroup.controls.customer.value!.id!,
      customerName: `${this.formGroup.controls.customer.value!.surname} ${this.formGroup.controls.customer.value!.name}`,
      isMailAddressAvailable: !!this.formGroup.controls.customer.value!.email,
      state: OrderState.OPEN,
      createdDate: new Date(),
      positions: this.positions(),
      discount: this.formGroup.controls.discount.value,
      total: CalcPrizeUtils.calcTotalPrize(this.positions(), this.formGroup.controls.discount.value),
    }
    if (this.data()?.order !== undefined) {
      order.orderNumber = this.data()!.order.orderNumber;
      order.state = this.data()!.order.state!;
    }
    this.dialogRef.close({order})
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private async loadCustomers(searchString: string): Promise<Customer[]> {
    this.isLoading.set(true);
    return this.customersService.findCustomers(searchString)
      .finally(() => this.isLoading.set(false));
  }

  private async loadArticleTypes(searchString: string): Promise<ArticleType[]> {
    this.isLoading.set(true);
    return this.articleTypesService.findArticleTypes(searchString)
      .finally(() => this.isLoading.set(false));
  }

  private createFormGroup(): FormGroup<FormType> {
    return new FormGroup({
      discount: new FormControl<number | null>(null),
      positions: new FormArray<FormGroup<PositionFormType>>([]),
      customer: new FormControl<Customer | null>(null, {validators: [Validators.required]})
    });
  }

  private addPositionFormGroup(articleType: ArticleType): void {
    const formGroup: FormGroup<PositionFormType> = new FormGroup({
      id: new FormControl<string>(uuidv4(), {nonNullable: true}),
      name: new FormControl<string>(articleType.name, {nonNullable: true, validators: [Validators.required]}),
      count: new FormControl<number>(1, {nonNullable: true, validators: [Validators.required, Validators.min(1)]}),
      prize: new FormControl<number>(articleType.prize, {validators: [this.numberValidator()], nonNullable: true}),
      unit: new FormControl<Unit>(articleType.unit, {nonNullable: true}),
      discount: new FormControl<number | null>(null),
      isFlexPrice: new FormControl<boolean>(articleType.isFlexPrice, {nonNullable: true}),
      isNegativePosition: new FormControl<boolean>(articleType.isNegativePosition, {nonNullable: true})
    });
    this.formGroup.controls.positions.push(formGroup);
  }

  private patchFormGroup(order: Order) {
    this.formGroup.patchValue({
      discount: order.discount,
    })
    for (const position of order.positions) {
      this.addFilledPosition(position);
    }
    this.patchCustomer(order.customerNumber);
  }

  private addFilledPosition(position: Position): void {
    const formGroup: FormGroup<PositionFormType> = new FormGroup({
      id: new FormControl<string>(uuidv4(), {nonNullable: true}),
      name: new FormControl<string>(position.name, {nonNullable: true, validators: [Validators.required]}),
      count: new FormControl<number>(position.count, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)]
      }),
      prize: new FormControl<number>(position.prize, {nonNullable: true}),
      unit: new FormControl<Unit>(position.unit, {nonNullable: true}),
      discount: new FormControl<number | null>(position.discount),
      isFlexPrice: new FormControl<boolean>(position.isFlexPrice, {nonNullable: true}),
      isNegativePosition: new FormControl<boolean>(position.isNegativePosition, {nonNullable: true})
    });
    this.formGroup.controls.positions.push(formGroup);
  }

  private patchCustomer(customerNumber: number): void {
    this.customersService.getCustomer(customerNumber)
      .then((customer: Customer | undefined): void => {
        if (customer !== undefined) {
          this.formGroup.controls.customer.setValue(customer, {emitEvent: false});
        }
      })
  }

  private numberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const isValid = typeof control.value === 'number' && !isNaN(control.value);
      return isValid ? null : {notANumber: true};
    };
  }
}
