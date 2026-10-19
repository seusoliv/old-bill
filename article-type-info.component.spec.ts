import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ArticleTypeInfoComponent} from './article-type-info.component';

describe('ArticleTypeInfoComponent', () => {
  let component: ArticleTypeInfoComponent;
  let fixture: ComponentFixture<ArticleTypeInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleTypeInfoComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ArticleTypeInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
