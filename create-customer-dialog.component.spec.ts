import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CreateCustomerDialogComponent} from './create-customer-dialog.component';

describe('DeleteCustomerDialogComponent', () => {
  let component: CreateCustomerDialogComponent;
  let fixture: ComponentFixture<CreateCustomerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateCustomerDialogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CreateCustomerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
