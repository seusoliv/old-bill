import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ArticlesOverviewComponent} from './articles-overview.component';

describe('ArticlesOverviewComponent', () => {
  let component: ArticlesOverviewComponent;
  let fixture: ComponentFixture<ArticlesOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticlesOverviewComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ArticlesOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
