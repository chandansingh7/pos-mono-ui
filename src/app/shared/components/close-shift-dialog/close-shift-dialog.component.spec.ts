import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../shared.module';
import { CloseShiftDialogComponent } from './close-shift-dialog.component';
import { ShiftService } from '../../../core/services/shift.service';
import { ApiResponse } from '../../../core/models/api.models';
import { ShiftResponse } from '../../../core/models/shift.models';

describe('CloseShiftDialogComponent', () => {
  let component: CloseShiftDialogComponent;
  let fixture: ComponentFixture<CloseShiftDialogComponent>;
  let shiftService: jasmine.SpyObj<ShiftService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CloseShiftDialogComponent>>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    shiftService = jasmine.createSpyObj('ShiftService', ['getCurrent', 'close']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    shiftService.getCurrent.and.returnValue(of({
      success: true,
      data: { id: 1, cashierUsername: 'cashier', openingFloat: 100, cashSales: 50, expectedCash: 150 } as unknown as ShiftResponse,
      message: null,
      errorCode: null
    } as ApiResponse<ShiftResponse>));
    shiftService.close.and.returnValue(of({
      success: true,
      data: { id: 1, difference: 0 } as unknown as ShiftResponse,
      message: null,
      errorCode: null
    } as ApiResponse<ShiftResponse>));

    await TestBed.configureTestingModule({
      declarations: [CloseShiftDialogComponent],
      imports: [SharedModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ShiftService, useValue: shiftService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CloseShiftDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load current shift on init', () => {
    expect(shiftService.getCurrent).toHaveBeenCalled();
    expect(component.currentShift).toBeTruthy();
  });

  it('should call close on submit when form is valid', () => {
    component.form.setValue({ countedCash: 150 });
    component.submit();
    expect(shiftService.close).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should not submit when form is invalid', () => {
    component.form.setValue({ countedCash: -10 });
    component.submit();
    expect(shiftService.close).not.toHaveBeenCalled();
  });
});

