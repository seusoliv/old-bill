import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  resource,
  ResourceLoaderParams,
  ResourceRef,
  Signal,
  signal,
  WritableSignal
} from '@angular/core';
import {CustomersService} from "../../services/storage/customers.service";
import {Customer} from "../../services/storage/interfaces/customer";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatCardModule} from '@angular/material/card';
import {CustomerInfoComponent} from "./components/customer-info/customer-info.component";
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmationDialogComponent} from "../../shared/components/confirmation-dialog/confirmation-dialog.component";
import {ConfirmationDialogResult} from "../../shared/components/interfaces/confirmation-dialog-result";
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CreateCustomerDialogComponent} from './components/create-customer-dialog/create-customer-dialog.component';
import {CustomerCreateDialogData} from './components/interfaces/customer-create-dialog-data';
import {CustomerCreateDialogResult} from './components/interfaces/customer-create-dialog-result';
import {MatFormField} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, firstValueFrom} from 'rxjs';
import {DEBOUNCE_TIME} from '../../constans';
import {ConfirmationDialogData} from '../../shared/components/interfaces/confirmation-dialog-data';
import {SnackBarService} from '../../services/snack-bar.service';
import {LoadingSpinnerService} from '../../services/loading-spinner/loading-spinner.service';
import {ImportCustomerDialogComponent} from './components/import-dialog/import-customer-dialog.component';
import {BackendService} from '../../services/backend.service';

@Component({
  selector: 'app-customer-overview',
  imports: [MatProgressSpinnerModule, MatCardModule, CustomerInfoComponent, MatButtonModule, MatFormField, MatInput, ReactiveFormsModule],
  templateUrl: './customer-overview.component.html',
  styleUrl: './customer-overview.component.scss'
})
export class CustomerOverviewComponent implements OnInit {
  protected readonly searchString: WritableSignal<string> = signal<string>('');
  protected readonly filteredCustomers: Signal<Customer[]> = computed(() => this.updateCustomer.value() ?? []);
  protected readonly filterControl: FormControl<string> = new FormControl();

  private readonly updateCustomer: ResourceRef<Customer[] | undefined> = resource<Customer[], string>({
    request: (): string => this.searchString(),
    loader: (param: ResourceLoaderParams<string>): Promise<Customer[]> => this.loadCustomers(param.request)
  })
  private readonly customerService: CustomersService = inject(CustomersService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackbarService: SnackBarService = inject(SnackBarService);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly appService = inject(BackendService);

  ngOnInit(): void {
    this.filterControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(DEBOUNCE_TIME)
      )
      .subscribe({
        next: (searchSting: string): void => this.searchString.set(searchSting)
      });
  }

  onImportCustomers(): void {
    const dialog = this.dialog.open<ImportCustomerDialogComponent>(ImportCustomerDialogComponent);
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.updateCustomer.reload()
      })
  }

  async onExportCustomers(): Promise<void> {
    this.loadingSpinnerService.activateLoadingSpinner();
    try {
      const allCustomers = await this.customerService.getAllCustomers();
      await firstValueFrom(this.appService.saveCustomerBackup(JSON.stringify(allCustomers)));
      this.snackbarService.openSnackBar('Kundendaten erfolgreich exportiert.');
    } catch {
      this.snackbarService.openSnackBar('Kundendaten konnten nicht exportiert werden.');
    }
    this.loadingSpinnerService.deactivateLoadingSpinner();
  }

  onAddCustomer(): void {
    const dialog = this.dialog.open<CreateCustomerDialogComponent, undefined, CustomerCreateDialogResult>(CreateCustomerDialogComponent);
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: CustomerCreateDialogResult | undefined): void => {
          if (result !== undefined) {
            this.processDbAction(this.customerService.createCustomer(result.customer)
              .then(() => this.snackbarService.openSnackBar(' Kunde erfolgreich erstellt.'))
              .catch(() => this.snackbarService.openSnackBar(' Kunde konnte nicht erstellt werden.')));
          }
        }
      });
  }

  onEditCustomer(customer: Customer): void {
    const dialog = this.dialog.open<CreateCustomerDialogComponent, CustomerCreateDialogData, CustomerCreateDialogResult>(CreateCustomerDialogComponent, {
      data: {
        customer
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: CustomerCreateDialogResult | undefined): void => {
          if (result !== undefined) {
            this.processDbAction(this.customerService.updateCustomer(result.customer)
              .then(() => this.snackbarService.openSnackBar(' Kunde erfolgreich aktualisiert.'))
              .catch(() => this.snackbarService.openSnackBar(' Kunde konnte nicht aktualisiert werden.')));
          }
        }
      });
  }

  onDeleteCustomer(customerId: number): void {
    const dialog = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationDialogResult>(ConfirmationDialogComponent, {
      width: '460px',
      height: '150px',
      data: {
        title: 'Kundendaten wirklich löschen?'
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ConfirmationDialogResult | undefined): void => {
          if (result !== undefined && result.isConfirmed) {
            this.processDbAction(this.customerService.deleteCustomer(customerId)
              .then(() => this.snackbarService.openSnackBar(' Kunde erfolgreich gelöscht.'))
              .catch(() => this.snackbarService.openSnackBar(' Kunde konnte nicht gelöscht werden.')));
          }
        }
      });
  }

  private async loadCustomers(searchString: string): Promise<Customer[]> {
    this.loadingSpinnerService.activateLoadingSpinner();
    return this.customerService.findCustomers(searchString)
      .finally(() => this.loadingSpinnerService.deactivateLoadingSpinner());
  }

  private processDbAction(promise: Promise<any>): void {
    this.loadingSpinnerService.activateLoadingSpinner();
    promise.finally((): boolean => this.updateCustomer.reload());
  }
}
