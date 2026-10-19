import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ImportArticleTypesDialogComponent} from './import-article-types-dialog.component';

describe('ImportDialogComponent', () => {
  let component: ImportArticleTypesDialogComponent;
  let fixture: ComponentFixture<ImportArticleTypesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportArticleTypesDialogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ImportArticleTypesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
