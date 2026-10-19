import {ComponentFixture, TestBed} from '@angular/core/testing';

import {InitalLoadingIndicatorComponent} from './inital-loading-indicator.component';

describe('InitalLoadingIndicatorComponent', () => {
  let component: InitalLoadingIndicatorComponent;
  let fixture: ComponentFixture<InitalLoadingIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InitalLoadingIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InitalLoadingIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
