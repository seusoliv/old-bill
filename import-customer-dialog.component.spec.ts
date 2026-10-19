import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ImportCustomerDialogComponent} from './import-customer-dialog.component';

describe('ImportDialogComponent', () => {
  let component: ImportCustomerDialogComponent;
  let fixture: ComponentFixture<ImportCustomerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportCustomerDialogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ImportCustomerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
