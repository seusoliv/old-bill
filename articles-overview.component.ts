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
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, firstValueFrom} from 'rxjs';
import {DEBOUNCE_TIME} from '../../constans';
import {ArticleType} from '../../services/storage/interfaces/article-type';
import {ArticleTypesService} from '../../services/storage/article-types.service';
import {MatFormField} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {ArticleTypeInfoComponent} from './components/article-type-info/article-type-info.component';
import {MatTooltip} from '@angular/material/tooltip';
import {
  CreateArticleTypeDialogComponent
} from './components/create-article-type-dialog/create-article-type-dialog.component';
import {ArticleTypeCreateDialogResult} from './interfaces/article-type-create-dialog-result';
import {ArticleTypeCreateDialogData} from './interfaces/article-type-create-dialog-data';
import {ConfirmationDialogComponent} from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {ConfirmationDialogResult} from '../../shared/components/interfaces/confirmation-dialog-result';
import {ImportArticleTypesDialogComponent} from './components/import-dialog/import-article-types-dialog.component';
import {ConfirmationDialogData} from '../../shared/components/interfaces/confirmation-dialog-data';
import {SnackBarService} from '../../services/snack-bar.service';
import {LoadingSpinnerService} from '../../services/loading-spinner/loading-spinner.service';
import {BackendService} from '../../services/backend.service';

@Component({
  selector: 'app-articles-overview',
  imports: [MatProgressSpinnerModule, MatCardModule, MatButtonModule, ReactiveFormsModule, MatFormField, MatInput, ArticleTypeInfoComponent, MatTooltip],
  templateUrl: './articles-overview.component.html',
  styleUrl: './articles-overview.component.scss'
})
export class ArticlesOverviewComponent implements OnInit {
  protected readonly searchString: WritableSignal<string> = signal<string>('');
  protected readonly filteredArticleTypes: Signal<ArticleType[]> = computed((): ArticleType[] => this.updateArticleTypes.value() ?? []);
  protected readonly filterControl: FormControl<string> = new FormControl();

  private readonly updateArticleTypes: ResourceRef<ArticleType[] | undefined> = resource<ArticleType[], string>({
    request: (): string => this.searchString(),
    loader: (param: ResourceLoaderParams<string>): Promise<ArticleType[]> => {
      return this.loadArticleTypes(param.request);
    }
  })
  private readonly articleTypesService: ArticleTypesService = inject(ArticleTypesService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
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

  onImportArticleTypes(): void {
    const dialog = this.dialog.open<ImportArticleTypesDialogComponent>(ImportArticleTypesDialogComponent);
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.updateArticleTypes.reload()
      })
  }

  async onExportArticleTypes(): Promise<void> {
    this.loadingSpinnerService.activateLoadingSpinner();
    try {
      const allArticleTypes = await this.articleTypesService.getAllArticleTypes();
      await firstValueFrom(this.appService.saveArticleTypesBackup(JSON.stringify(allArticleTypes)));
      this.snackbarService.openSnackBar('Artikel erfolgreich exportiert.');
    } catch {
      this.snackbarService.openSnackBar('Artikel konnten nicht exportiert werden.');
    }
    this.loadingSpinnerService.deactivateLoadingSpinner();
  }

  onDeleteAll(): void {
    const dialog = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationDialogResult>(ConfirmationDialogComponent, {
      width: '460px',
      height: '150px',
      data: {
        title: 'Alle Artikel wirklich löschen?'
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ConfirmationDialogResult | undefined): void => {
          if (result !== undefined && result.isConfirmed) {
            this.processDbAction(this.articleTypesService.deleteAllTypes()
              .then(() => this.snackbarService.openSnackBar(' Alle Artikel erfolgreich gelöscht.'))
              .catch(() => this.snackbarService.openSnackBar(' Alle Artikel konnte nicht gelöscht werden.')));
          }
        }
      });
  }

  onAddArticleType(): void {
    const dialog = this.dialog.open<CreateArticleTypeDialogComponent, undefined, ArticleTypeCreateDialogResult>(CreateArticleTypeDialogComponent);
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ArticleTypeCreateDialogResult | undefined): void => {
          if (result !== undefined) {
            this.processDbAction(this.articleTypesService.createArticleType(result.articleType)
              .then(() => this.snackbarService.openSnackBar(' Artikel erfolgreich erstellt.'))
              .catch(() => this.snackbarService.openSnackBar(' Artikel konnte nicht erstellt werden.')));
          }
        }
      });
  }

  onEditArticleType(articleType: ArticleType): void {
    const dialog = this.dialog.open<CreateArticleTypeDialogComponent, ArticleTypeCreateDialogData, ArticleTypeCreateDialogResult>(CreateArticleTypeDialogComponent, {
      data: {
        articleType
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ArticleTypeCreateDialogResult | undefined): void => {
          if (result !== undefined) {
            this.processDbAction(this.articleTypesService.updateArticleType(result.articleType)
              .then(() => this.snackbarService.openSnackBar(' Artikel erfolgreich aktualisiert.'))
              .catch(() => this.snackbarService.openSnackBar(' Artikel konnte nicht aktualisiert werden.')));
          }
        }
      });
  }

  onDeleteArticleType(articleTypeId: number): void {
    const dialog = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, ConfirmationDialogResult>(ConfirmationDialogComponent, {
      width: '460px',
      height: '150px',
      data: {
        title: 'Artikel wirklich löschen?'
      }
    });
    dialog.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ConfirmationDialogResult | undefined): void => {
          if (result !== undefined && result.isConfirmed) {
            this.processDbAction(this.articleTypesService.deleteArticleType(articleTypeId)
              .then(() => this.snackbarService.openSnackBar(' Artikel erfolgreich gelöscht.'))
              .catch(() => this.snackbarService.openSnackBar(' Artikel konnte nicht gelöscht werden.')));
          }
        }
      });
  }

  private async loadArticleTypes(searchString: string): Promise<ArticleType[]> {
    this.loadingSpinnerService.activateLoadingSpinner();
    return this.articleTypesService.findArticleTypes(searchString)
      .finally((): void => this.loadingSpinnerService.deactivateLoadingSpinner());
  }

  private processDbAction(promise: Promise<any>): void {
    this.loadingSpinnerService.activateLoadingSpinner();
    promise.finally((): boolean => this.updateArticleTypes.reload());
  }
}
