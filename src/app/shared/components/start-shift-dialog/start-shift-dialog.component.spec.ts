import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../shared.module';
import { StartShiftDialogComponent } from './start-shift-dialog.component';
import { ShiftService } from '../../../core/services/shift.service';

describe('StartShiftDialogComponent', () => {
  let component: StartShiftDialogComponent;
  let fixture: ComponentFixture<StartShiftDialogComponent>;
  let shiftService: jasmine.SpyObj<ShiftService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<StartShiftDialogComponent>>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    shiftService = jasmine.createSpyObj('ShiftService', ['open']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [StartShiftDialogComponent],
      imports: [SharedModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ShiftService, useValue: shiftService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StartShiftDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call shiftService.open on submit when form is valid', () => {
    component.form.setValue({ openingFloat: 100 });
    shiftService.open.and.returnValue(of({ success: true, data: null, message: null, errorCode: null }));

    component.submit();

    expect(shiftService.open).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should not submit when form is invalid', () => {
    component.form.setValue({ openingFloat: -5 });
    component.submit();
    expect(shiftService.open).not.toHaveBeenCalled();
  });
}

