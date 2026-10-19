import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CreateArticleTypeDialogComponent} from './create-article-type-dialog.component';

describe('CreateArticleTypeDialogComponent', () => {
  let component: CreateArticleTypeDialogComponent;
  let fixture: ComponentFixture<CreateArticleTypeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateArticleTypeDialogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CreateArticleTypeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
