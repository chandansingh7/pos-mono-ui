import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../shared/shared.module';
import { ProductService } from '../../core/services/product.service';
import { LabelAttachProductDialogComponent, LabelAttachProductDialogData } from './label-attach-product-dialog.component';
import { LabelResponse } from '../../core/models/label.models';

describe('LabelAttachProductDialogComponent', () => {
  let component: LabelAttachProductDialogComponent;
  let fixture: ComponentFixture<LabelAttachProductDialogComponent>;

  const mockLabel: LabelResponse = {
    id: 1,
    barcode: '4901234560011',
    name: 'Test Label',
    price: 9.99,
    sku: 'LBL001',
    categoryId: 1,
    categoryName: 'Electronics',
    productId: null,
    createdAt: '2024-01-01T00:00:00',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelAttachProductDialogComponent],
      imports: [SharedModule, NoopAnimationsModule],
      providers: [
        { provide: ProductService, useValue: { getAll: () => of() } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { label: mockLabel } as LabelAttachProductDialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LabelAttachProductDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

