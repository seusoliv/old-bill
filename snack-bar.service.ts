import {inject, Injectable} from '@angular/core';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackBarService {
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly matSnackBarConfig: MatSnackBarConfig = {
    duration: 1800
  }

  openSnackBar(title: string): void {
    this.snackBar.open(title, undefined, this.matSnackBarConfig);
  }
}
