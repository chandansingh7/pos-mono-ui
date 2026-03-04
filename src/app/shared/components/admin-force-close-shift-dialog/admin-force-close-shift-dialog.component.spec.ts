import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../shared.module';
import { AdminForceCloseShiftDialogComponent, AdminForceCloseShiftDialogData } from './admin-force-close-shift-dialog.component';
import { ShiftService } from '../../../core/services/shift.service';

describe('AdminForceCloseShiftDialogComponent', () => {
  let component: AdminForceCloseShiftDialogComponent;
  let fixture: ComponentFixture<AdminForceCloseShiftDialogComponent>;
  let shiftService: jasmine.SpyObj<ShiftService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminForceCloseShiftDialogComponent>>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const data: AdminForceCloseShiftDialogData = {
    shift: {
      id: 1,
      cashierUsername: 'cashier1',
      openingFloat: 100,
      cashSales: 0,
      expectedCash: 100,
      countedCash: 0,
      difference: 0,
      status: 'OPEN',
      openedAt: new Date().toISOString()
    } as any
  };

  beforeEach(async () => {
    shiftService = jasmine.createSpyObj('ShiftService', ['forceClose']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    shiftService.forceClose.and.returnValue(of({
      success: true,
      data: { ...data.shift, cashSales: 50, expectedCash: 150, countedCash: 160, difference: 10, status: 'CLOSED' } as any,
      message: null,
      errorCode: null
    }));

    await TestBed.configureTestingModule({
      declarations: [AdminForceCloseShiftDialogComponent],
      imports: [SharedModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ShiftService, useValue: shiftService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminForceCloseShiftDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call forceClose on submit when form is valid', () => {
    component.form.setValue({ countedCash: 160 });
    component.submit();
    expect(shiftService.forceClose).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });
});

