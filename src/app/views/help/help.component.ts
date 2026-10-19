import {Component, inject, signal} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatDividerModule} from '@angular/material/divider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {StorageModeService} from '../../services/storage-mode.service';

@Component({
  selector: 'app-help',
  imports: [
    MatCardModule,
    MatDividerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})
export class HelpComponent {
  private readonly storageMode = inject(StorageModeService);
  protected readonly sqliteEnabled = signal(this.storageMode.isSqliteEnabled());

  protected onToggleStorageMode(enabled: boolean): void {
    this.storageMode.setSqliteEnabled(enabled);
    this.sqliteEnabled.set(enabled);
    // Provider factories read the mode at startup, so reload to apply it.
    window.location.reload();
  }
}
