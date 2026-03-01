import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { LabelService } from '../../core/services/label.service';
import { CategoryService } from '../../core/services/category.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../shared/shared.module';
import { LabelsComponent } from './labels.component';
import { ProductResponse } from '../../core/models/product.models';
import { LabelResponse } from '../../core/models/label.models';
import { CategoryResponse } from '../../core/models/category.models';

const mockProduct: ProductResponse = {
  id: 1,
  name: 'Test Product',
  sku: 'SKU001',
  barcode: '1234567890123',
  price: 9.99,
  categoryId: 1,
  categoryName: 'Electronics',
  imageUrl: '',
  active: true,
  quantity: 10,
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
  updatedBy: 'admin'
};

const mockLabel: LabelResponse = {
  id: 1,
  barcode: '4901234560011',
  name: 'Test Label',
  price: 12.99,
  sku: 'LBL001',
  categoryId: 1,
  categoryName: 'Electronics',
  productId: null,
  createdAt: '2024-01-01T00:00:00'
};

const mockCategory: CategoryResponse = {
  id: 1,
  name: 'Electronics',
  description: '',
  updatedAt: '2024-01-01T00:00:00',
  updatedBy: 'admin'
};

const mockProductPage = {
  content: [mockProduct],
  totalElements: 1,
  totalPages: 1,
  size: 50,
  number: 0
};

const mockLabelPage = {
  content: [mockLabel],
  totalElements: 1,
  totalPages: 1,
  size: 50,
  number: 0
};

describe('LabelsComponent', () => {
  let component: LabelsComponent;
  let fixture: ComponentFixture<LabelsComponent>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let labelServiceSpy: jasmine.SpyObj<LabelService>;

  beforeEach(async () => {
    const productService = jasmine.createSpyObj('ProductService', ['getAll']);
    productService.getAll.and.returnValue(
      of({ success: true, data: mockProductPage, message: null, errorCode: null })
    );

    const labelService = jasmine.createSpyObj('LabelService', ['getAll']);
    labelService.getAll.and.returnValue(
      of({ success: true, data: mockLabelPage, message: null, errorCode: null })
    );

    const categoryService = jasmine.createSpyObj('CategoryService', ['getList']);
    categoryService.getList.and.returnValue(
      of({ success: true, data: [mockCategory], message: null, errorCode: null })
    );

    await TestBed.configureTestingModule({
      declarations: [LabelsComponent],
      imports: [SharedModule, MatTabsModule, NoopAnimationsModule],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: LabelService, useValue: labelService },
        { provide: CategoryService, useValue: categoryService },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
        { provide: MatSnackBar, useValue: { open: () => {} } }
      ]
    }).compileComponents();

    productServiceSpy = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    labelServiceSpy = TestBed.inject(LabelService) as jasmine.SpyObj<LabelService>;
    fixture = TestBed.createComponent(LabelsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load products, labels, and categories on init', () => {
    fixture.detectChanges();
    expect(productServiceSpy.getAll).toHaveBeenCalledWith('', undefined, 0, 50, 'name,asc');
    expect(labelServiceSpy.getAll).toHaveBeenCalled();
    expect(component.products).toEqual([mockProduct]);
    expect(component.labels).toEqual([mockLabel]);
  });

  it('should toggle product selection', () => {
    fixture.detectChanges();
    expect(component.selectedCount).toBe(0);

    component.toggleSelectProduct(mockProduct);
    expect(component.selectedIds.has(mockProduct.id)).toBe(true);
    expect(component.selectedCount).toBe(1);

    component.toggleSelectProduct(mockProduct);
    expect(component.selectedIds.has(mockProduct.id)).toBe(false);
    expect(component.selectedCount).toBe(0);
  });

  it('should toggle select all products', () => {
    fixture.detectChanges();
    component.toggleSelectAllProducts();
    expect(component.isAllProductsSelected).toBe(true);
    expect(component.selectedCount).toBe(1);

    component.toggleSelectAllProducts();
    expect(component.isAllProductsSelected).toBe(false);
    expect(component.selectedCount).toBe(0);
  });

  it('should select all in category', () => {
    fixture.detectChanges();
    component.selectAllInCategory(1);
    expect(component.selectedIds.has(mockProduct.id)).toBe(true);

    component.selectAllInCategory(1);
    expect(component.selectedIds.has(mockProduct.id)).toBe(false);
  });

  it('should call loadProducts on page change when on products tab', () => {
    fixture.detectChanges();
    component.activeTab = 0;
    productServiceSpy.getAll.calls.reset();

    component.onPage({ pageIndex: 1, pageSize: 100 } as any);
    expect(productServiceSpy.getAll).toHaveBeenCalledWith('', undefined, 1, 100, 'name,asc');
  });

  it('should show snackbar when printing with no selection', () => {
    const snackBarSpy = spyOn(TestBed.inject(MatSnackBar), 'open');
    fixture.detectChanges();
    component.activeTab = 0;

    component.openPrintPreview();
    expect(snackBarSpy).toHaveBeenCalledWith('Select at least one product', 'Close', { duration: 3000 });
  });
});
