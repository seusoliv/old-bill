import {Component, inject, signal, Signal, WritableSignal} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatButtonModule} from '@angular/material/button';
import {LoadingSpinnerService} from './services/loading-spinner/loading-spinner.service';
import {LoadingSpinnerComponent} from './shared/components/loading-spinner/loading-spinner.component';
import {Title} from '@angular/platform-browser';
import {
  InitalLoadingIndicatorComponent
} from './shared/components/inital-loading-indicator/inital-loading-indicator.component';
import {animate, group, query, style, transition, trigger} from '@angular/animations';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSidenavModule, MatButtonModule, RouterLink, LoadingSpinnerComponent, InitalLoadingIndicatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [
    trigger('moveAndScale', [
      transition(':leave', [
        query(':self', [
          style({position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}),
          group([
            animate('1s ease-in-out', style({top: '-45%', left: '-50%'})),
            animate('1s ease-in-out', style({transform: 'scale(0.1)', opacity: 0}))
          ])
        ])
      ])
    ])
  ]
})
export class AppComponent {
  protected readonly isLoading: Signal<boolean>;
  protected readonly isInitialLoading: WritableSignal<boolean> = signal(true);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly titleService: Title = inject(Title);

  constructor() {
    this.isLoading = this.loadingSpinnerService.isLoading;
    this.titleService.setTitle('Wohlfühlhaut');
    setTimeout(() => {
      this.isInitialLoading.set(false);
    }, 5000)
  }
}
