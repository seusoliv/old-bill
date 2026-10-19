import {Component, inject} from '@angular/core';
import * as XLSX from 'xlsx';
import {SnackBarService} from '../../../../services/snack-bar.service';
import {MatButton} from '@angular/material/button';
import {MatDialogRef} from '@angular/material/dialog';
import {LoadingSpinnerService} from '../../../../services/loading-spinner/loading-spinner.service';
import {CustomersService} from '../../../../services/storage/customers.service';
import {Customer} from '../../../../services/storage/interfaces/customer';

interface ExelData {
  Vorname: string;
  Nachname: string;
  Ort: string;
  Straße: string;
  Mail: string;
  HausNr: string;
  PLZ: number;
}

@Component({
  selector: 'app-import-dialog',
  imports: [
    MatButton
  ],
  templateUrl: './import-customer-dialog.component.html',
  styleUrl: './import-customer-dialog.component.scss'
})
export class ImportCustomerDialogComponent {
  protected readonly customerService: CustomersService = inject(CustomersService);
  protected excelData: ExelData[] = [];
  protected jsonCustomers: Customer[] = [];
  private readonly snackbarService: SnackBarService = inject(SnackBarService);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly dialogRef: MatDialogRef<ImportCustomerDialogComponent> = inject(MatDialogRef<ImportCustomerDialogComponent>);

  onFileChange(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      this.excelData = [];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          this.jsonCustomers = JSON.parse(e.target.result) as Customer[];
        } catch {
          this.snackbarService.openSnackBar('JSON-Datei konnte nicht gelesen werden.');
        }
      };
      reader.readAsText(file);
    } else {
      this.jsonCustomers = [];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const workbook = XLSX.read(e.target.result, {type: 'binary'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        this.excelData = XLSX.utils.sheet_to_json(worksheet, {raw: true});
      };
      reader.readAsArrayBuffer(file);
    }
  }

  onSave(): void {
    this.loadingSpinnerService.activateLoadingSpinner();
    const task = this.jsonCustomers.length > 0
      ? this.addCustomersFromJson(this.jsonCustomers)
      : this.addCustomers(this.excelData);
    task.then((): void => {
      this.loadingSpinnerService.deactivateLoadingSpinner();
      this.dialogRef.close();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private async addCustomersFromJson(customers: Customer[]): Promise<void> {
    for (const customer of customers) {
      try {
        await this.customerService.updateCustomer(customer);
      } catch {
        this.snackbarService.openSnackBar(`Kunde ${customer.surname} ${customer.name} konnte nicht importiert werden`);
      }
    }
  }

  private async addCustomers(newCustomers: ExelData[]): Promise<void> {
    const customers: Customer[] = newCustomers.map((newCustomer: ExelData): Customer => {
      return {
        surname: newCustomer.Nachname,
        name: newCustomer.Vorname,
        street: newCustomer.Straße,
        city: newCustomer.Ort,
        zipCode: newCustomer.PLZ,
        houseNumber: newCustomer.HausNr,
        email: newCustomer.Mail ?? undefined,
      }
    });
    for (const customer of customers) {
      try {
        await this.customerService.createCustomer(customer);
      } catch (e) {
        this.snackbarService.openSnackBar(`Kunde ${customer.surname} ${customer.name} konnte nicht importiert werden`)
      }
    }
  }
}
