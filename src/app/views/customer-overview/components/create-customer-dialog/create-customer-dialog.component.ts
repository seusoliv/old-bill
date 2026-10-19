import {Component, inject, signal, Signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {CustomerCreateDialogResult} from "../interfaces/customer-create-dialog-result";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {CustomerCreateDialogData} from '../interfaces/customer-create-dialog-data';
import {Customer} from '../../../../services/storage/interfaces/customer';

interface FormType {
  name: FormControl<string>;
  surname: FormControl<string>;
  email: FormControl<string | null>;
  zipCode: FormControl<number | null>;
  street: FormControl<string>;
  city: FormControl<string>;
  houseNumber: FormControl<string>;
}

@Component({
  selector: 'app-create-customer-dialog',
  imports: [MatButtonModule, MatInputModule, MatFormFieldModule, ReactiveFormsModule],
  templateUrl: './create-customer-dialog.component.html',
  styleUrl: './create-customer-dialog.component.scss'
})
export class CreateCustomerDialogComponent {
  protected readonly data: Signal<CustomerCreateDialogData | null> = signal(inject(MAT_DIALOG_DATA));
  protected readonly formGroup: FormGroup<FormType>;
  private readonly dialogRef: MatDialogRef<CreateCustomerDialogComponent, CustomerCreateDialogResult> = inject(MatDialogRef<CreateCustomerDialogComponent, CustomerCreateDialogResult>);

  constructor() {
    const customer = this.data()?.customer;
    this.formGroup = this.createFormGroup();
    if (customer !== undefined) {
      this.patchFormValues(customer);
    }
  }

  onSave(): void {
    const customer: Customer = {
      name: this.formGroup.controls.name.value,
      surname: this.formGroup.controls.surname.value,
      city: this.formGroup.controls.city.value,
      street: this.formGroup.controls.street.value,
      houseNumber: this.formGroup.controls.houseNumber.value,
      email: this.formGroup.controls.email.value ?? undefined,
      zipCode: this.formGroup.controls.zipCode.value!,
    }
    if (this.data()?.customer !== undefined) {
      customer.id = this.data()!.customer!.id;
    }
    this.dialogRef.close({customer});
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private createFormGroup(): FormGroup {
    return new FormGroup<FormType>({
      name: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
      surname: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
      email: new FormControl(null),
      zipCode: new FormControl(null, {validators: [Validators.required]}),
      street: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
      city: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
      houseNumber: new FormControl('', {nonNullable: true, validators: [Validators.required]})
    })
  }

  private patchFormValues(customer: Customer): void {
    this.formGroup.patchValue(customer);
  }
}
