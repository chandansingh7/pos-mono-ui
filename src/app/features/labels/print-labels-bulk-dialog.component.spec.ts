import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from '../../shared/shared.module';
import { CompanyService } from '../../core/services/company.service';
import { PrintLabelsBulkDialogComponent } from './print-labels-bulk-dialog.component';

describe('PrintLabelsBulkDialogComponent', () => {
  let component: PrintLabelsBulkDialogComponent;
  let fixture: ComponentFixture<PrintLabelsBulkDialogComponent>;
  const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

  beforeEach(async () => {
    const companySvc = jasmine.createSpyObj('CompanyService', ['getCached']);
    companySvc.getCached.and.returnValue({ displayCurrency: 'USD' } as any);

    await TestBed.configureTestingModule({
      declarations: [PrintLabelsBulkDialogComponent],
      imports: [SharedModule, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: CompanyService, useValue: companySvc },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            products: [
              { id: 1, name: 'Item A', price: 10, quantity: 5, sku: 'A', barcode: '111' },
              { id: 2, name: 'Item B', price: 20, quantity: 0, sku: 'B', barcode: '222' }
            ]
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrintLabelsBulkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates form with default counts of 1', () => {
    expect(component).toBeTruthy();
    expect(component.getCount({ id: 1 } as any)).toBe(1);
    expect(component.getCount({ id: 2 } as any)).toBe(1);
  });

  it('flags when count exceeds stock but still allows printing', () => {
    component.form.get('count_1')?.setValue(10);
    expect(component.exceedsQuantity({ id: 1, quantity: 5 } as any)).toBe(true);
    expect(component.hasAnyExceedsQuantity()).toBe(true);

    component.onPrint();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('does not print when form is invalid', () => {
    component.form.get('count_1')?.setValue(0); // invalid (min 1)
    dialogRef.close.calls.reset();
    component.onPrint();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});

