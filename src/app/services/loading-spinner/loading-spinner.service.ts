import {Injectable, Signal, signal, WritableSignal} from '@angular/core';
import {Subscription, timer} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingSpinnerService {
  private readonly _isLoading: WritableSignal<boolean> = signal(false);
  private timer?: Subscription;

  get isLoading(): Signal<boolean> {
    return this._isLoading.asReadonly();
  }

  activateLoadingSpinner(): void {
    this._isLoading.set(true);
  }

  deactivateLoadingSpinner(): void {
    this.timer?.unsubscribe();
    this.timer = timer(250).subscribe({
      next: () => this._isLoading.set(false)
    });
  }
}
