import {Component, inject} from '@angular/core';
import * as XLSX from 'xlsx';
import {ArticleType} from '../../../../services/storage/interfaces/article-type';
import {Unit} from '../../../../shared/components/interfaces/unit';
import {ArticleTypesService} from '../../../../services/storage/article-types.service';
import {SnackBarService} from '../../../../services/snack-bar.service';
import {MatButton} from '@angular/material/button';
import {MatDialogRef} from '@angular/material/dialog';
import {LoadingSpinnerService} from '../../../../services/loading-spinner/loading-spinner.service';

interface ExelData {
  Artikelnummer: string;
  Artikelbezeichnung: string;
  Preis: number;
}

@Component({
  selector: 'app-import-dialog',
  imports: [
    MatButton
  ],
  templateUrl: './import-article-types-dialog.component.html',
  styleUrl: './import-article-types-dialog.component.scss'
})
export class ImportArticleTypesDialogComponent {
  protected readonly articleTypesService: ArticleTypesService = inject(ArticleTypesService);
  protected excelData: ExelData[] = [];
  private readonly snackbarService: SnackBarService = inject(SnackBarService);
  private readonly loadingSpinnerService: LoadingSpinnerService = inject(LoadingSpinnerService);
  private readonly dialogRef: MatDialogRef<ImportArticleTypesDialogComponent> = inject(MatDialogRef<ImportArticleTypesDialogComponent>);

  onFileChange(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const workbook = XLSX.read(e.target.result, {type: 'binary'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      this.excelData = XLSX.utils.sheet_to_json(worksheet, {raw: true});
    };
    reader.readAsArrayBuffer(file);
  }

  onSave(): void {
    this.loadingSpinnerService.activateLoadingSpinner();
    this.addArticleType(this.excelData)
      .then((): void => {
        this.loadingSpinnerService.deactivateLoadingSpinner();
        this.dialogRef.close();
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private async addArticleType(newTypes: ExelData[]): Promise<void> {
    const articleTypes: ArticleType[] = newTypes.map((newType: ExelData): ArticleType => {
      return {
        name: newType.Artikelbezeichnung,
        unit: Unit.PIECE,
        prize: Number(newType.Preis),
        articleNumber: newType.Artikelnummer.toString(),
        isFlexPrice: false,
        isNegativePosition: false,
      }
    });
    for (const articleType of articleTypes) {
      try {
        const article = await this.articleTypesService.getArticleTypeByNumber(articleType.articleNumber);
        if (article !== undefined) {
          await this.articleTypesService.updateArticleType({...articleType, id: article.id});
        } else {
          await this.articleTypesService.createArticleType(articleType);
        }
      } catch (e) {
        this.snackbarService.openSnackBar(`Artikel ${articleType.name} konnte nicht importiert werden`)
      }
    }
  }
}
