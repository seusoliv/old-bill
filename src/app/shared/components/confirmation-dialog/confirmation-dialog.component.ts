import {Component, inject, signal, Signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {ConfirmationDialogResult} from "../interfaces/confirmation-dialog-result";
import {ConfirmationDialogData} from '../interfaces/confirmation-dialog-data';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [MatButtonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  protected readonly data: Signal<ConfirmationDialogData> = signal(inject(MAT_DIALOG_DATA));
  private readonly dialogRef: MatDialogRef<ConfirmationDialogComponent, ConfirmationDialogResult> = inject(MatDialogRef<ConfirmationDialogComponent, ConfirmationDialogResult>);

  onYes(): void {
    this.dialogRef.close({
      isConfirmed: true
    });
  }

  onNo(): void {
    this.dialogRef.close();
  }
}
