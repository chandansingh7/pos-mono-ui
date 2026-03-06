import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { PosComponent } from './pos.component';
import { ProductService } from '../../core/services/product.service';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { CompanyService } from '../../core/services/company.service';
import { RewardService } from '../../core/services/reward.service';
import { ShiftService } from '../../core/services/shift.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ApiResponse } from '../../core/models/api.models';
import { OrderResponse } from '../../core/models/order.models';

describe('PosComponent', () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;
  let orderService: jasmine.SpyObj<OrderService>;
  let shiftService: jasmine.SpyObj<ShiftService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const productSvc = jasmine.createSpyObj('ProductService', ['getAll', 'getByBarcode']);
    productSvc.getAll.and.returnValue(of({ success: true, data: { content: [] }, message: null, errorCode: null }));
    productSvc.getByBarcode.and.returnValue(of({ success: true, data: null, message: null, errorCode: null }));

    const customerSvc = jasmine.createSpyObj('CustomerService', ['getAll', 'getByMemberCard']);
    customerSvc.getAll.and.returnValue(of({ success: true, data: { content: [] }, message: null, errorCode: null }));
    customerSvc.getByMemberCard.and.returnValue(of({ success: true, data: null, message: null, errorCode: null }));

    orderService = jasmine.createSpyObj('OrderService', ['create']);
    orderService.create.and.returnValue(of({
      success: true,
      data: { id: 1 } as unknown as OrderResponse,
      message: null,
      errorCode: null
    } as ApiResponse<OrderResponse>));

    const companySvc = jasmine.createSpyObj('CompanyService', ['get', 'getCached'], { company$: of(null) });
    companySvc.get.and.returnValue(of({ success: true, data: null, message: null, errorCode: null }));
    companySvc.getCached.and.returnValue(null);

    const rewardSvc = jasmine.createSpyObj('RewardService', ['getConfig']);
    rewardSvc.getConfig.and.returnValue(of({ success: true, data: null, message: null, errorCode: null }));

    shiftService = jasmine.createSpyObj('ShiftService', ['getCurrent']);
    shiftService.getCurrent.and.returnValue(throwError(() => ({ status: 404 })));

    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [PosComponent],
      imports: [SharedModule, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: ProductService, useValue: productSvc },
        { provide: CustomerService, useValue: customerSvc },
        { provide: OrderService, useValue: orderService },
        { provide: CompanyService, useValue: companySvc },
        { provide: RewardService, useValue: rewardSvc },
        { provide: ShiftService, useValue: shiftService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prevent cash order when no open shift', () => {
    component.cart = [{
      product: { id: 1, name: 'Test', price: 10, quantity: 5 } as any,
      quantity: 1,
      subtotal: 10
    }];
    component.paymentMethod = 'CASH';
    component.hasOpenShift = false;

    component.placeOrder();

    expect(orderService.create).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('isScanLayout returns true when company posLayout is scan', () => {
    component.company = null;
    expect(component.isScanLayout).toBe(false);

    component.company = { posLayout: 'grid' } as any;
    expect(component.isScanLayout).toBe(false);

    component.company = { posLayout: 'scan' } as any;
    expect(component.isScanLayout).toBe(true);
  });

  it('scanInputValue with short string loads products', () => {
    const productSvc = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    component.company = { posLayout: 'scan' } as any;

    component.scanInputValue('a');
    expect(productSvc.getAll).toHaveBeenCalledWith('a', undefined, 0, 30);
  });

  it('scanInputValue with barcode match adds to cart and clears control', () => {
    const productSvc = TestBed.inject(ProductService) as jasmine.SpyObj<ProductService>;
    const product = { id: 1, name: 'Scanned', price: 5, quantity: 10 } as any;
    productSvc.getByBarcode.and.returnValue(of({ success: true, data: product, message: null, errorCode: null }));
    component.company = { posLayout: 'scan' } as any;

    component.scanInputValue('12345678');
    expect(component.cart.length).toBe(1);
    expect(component.cart[0].product).toBe(product);
    expect(component.barcodeControl.value).toBe('');
  });
});

