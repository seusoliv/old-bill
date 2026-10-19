import {Component, inject, signal, WritableSignal} from '@angular/core';
import {MatButton} from '@angular/material/button';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Order} from '../../../../services/storage/interfaces/order';
import {OrdersService} from '../../../../services/storage/orders.service';
import {SnackBarService} from '../../../../services/snack-bar.service';

@Component({
  selector: 'app-import-order-dialog',
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
  ],
  templateUrl: './import-order-dialog.component.html',
})
export class ImportOrderDialogComponent {
  private readonly ordersService: OrdersService = inject(OrdersService);
  private readonly snackbarService: SnackBarService = inject(SnackBarService);
  private readonly dialogRef: MatDialogRef<ImportOrderDialogComponent> = inject(MatDialogRef<ImportOrderDialogComponent>);

  protected readonly fileName: WritableSignal<string> = signal('');
  private orders: Order[] = [];

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileName.set(file.name);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>): void => {
      try {
        this.orders = JSON.parse(e.target!.result as string);
      } catch {
        this.snackbarService.openSnackBar('Datei konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
  }

  async onImport(): Promise<void> {
    for (const order of this.orders) {
      try {
        await this.ordersService.updateOrder(order);
      } catch {
        this.snackbarService.openSnackBar(`Auftrag ${order.orderNumber} konnte nicht importiert werden.`);
      }
    }
    this.dialogRef.close();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
