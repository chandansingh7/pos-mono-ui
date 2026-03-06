import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { BackupService } from '../../core/services/backup.service';
import { SharedModule } from '../../shared/shared.module';
import { BackupComponent } from './backup.component';

describe('BackupComponent', () => {
  let component: BackupComponent;
  let fixture: ComponentFixture<BackupComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let backupService: jasmine.SpyObj<BackupService>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['isAdmin']);
    authService.isAdmin.and.returnValue(true);

    backupService = jasmine.createSpyObj('BackupService', ['isSqlAvailable', 'exportJson', 'exportSql', 'restore']);
    backupService.isSqlAvailable.and.returnValue(of({
      success: true,
      data: true,
      message: null,
      errorCode: null
    }));
    backupService.exportJson.and.returnValue(of(new Blob(['{}'])));
    backupService.exportSql.and.returnValue(of(new Blob(['-- SQL'])));
    backupService.restore.and.returnValue(of({
      success: true,
      data: 'Restore completed successfully',
      message: null,
      errorCode: null
    }));

    router = jasmine.createSpyObj('Router', ['navigate']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [BackupComponent],
      imports: [SharedModule, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: BackupService, useValue: backupService },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BackupComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should redirect non-admin to dashboard', () => {
    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('should check SQL availability on init', () => {
    fixture.detectChanges();
    expect(backupService.isSqlAvailable).toHaveBeenCalled();
    expect(component.sqlAvailable).toBe(true);
    expect(component.loadingSqlCheck).toBe(false);
  });

  it('downloadJson should call export and show snackbar', () => {
    fixture.detectChanges();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(URL, 'revokeObjectURL');
    const link = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(link, 'click');

    component.downloadJson();

    expect(backupService.exportJson).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('JSON backup downloaded', 'Close', { duration: 3000 });
  });

  it('downloadSql should call export when sql available', () => {
    component.sqlAvailable = true;
    fixture.detectChanges();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(URL, 'revokeObjectURL');
    const link = document.createElement('a');
    spyOn(document, 'createElement').and.returnValue(link);
    spyOn(link, 'click');

    component.downloadSql();

    expect(backupService.exportSql).toHaveBeenCalled();
  });

  it('onFileSelected should set selectedFile', () => {
    const file = new File(['{}'], 'backup.json');
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file], writable: false });
    const event = { target: input } as unknown as Event;

    component.onFileSelected(event);

    expect(component.selectedFile).toBe(file);
  });

  it('restore without file should show snackbar', () => {
    component.selectedFile = null;
    component.restore();
    expect(snackBar.open).toHaveBeenCalledWith('Please select a backup file', 'Close', { duration: 3000 });
    expect(backupService.restore).not.toHaveBeenCalled();
  });

  it('restore with file should call backupService.restore', () => {
    const file = new File(['{}'], 'backup.json');
    component.selectedFile = file;
    component.restoreFormat = 'json';
    component.restore();

    expect(backupService.restore).toHaveBeenCalledWith(file, 'json');
    expect(snackBar.open).toHaveBeenCalledWith('Restore completed successfully', 'Close', { duration: 4000 });
    expect(component.selectedFile).toBeNull();
  });

  it('restore with wrong extension should show warning', () => {
    const file = new File(['{}'], 'backup.txt');
    component.selectedFile = file;
    component.restoreFormat = 'json';
    component.restore();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Selected file does not appear to be a JSON backup',
      'Close',
      { duration: 4000 }
    );
    expect(backupService.restore).not.toHaveBeenCalled();
  });

  it('restore error should show error message with code', () => {
    backupService.restore.and.returnValue(
      throwError(() => ({ error: { errorCode: 'BR001', message: 'Restore failed' } }))
    );
    component.selectedFile = new File(['{}'], 'backup.json');
    component.restore();

    expect(snackBar.open).toHaveBeenCalledWith('[BR001] Restore failed', 'Close', { duration: 5000 });
  });

  it('clearFile should reset selectedFile', () => {
    component.selectedFile = new File(['{}'], 'backup.json');
    component.clearFile();
    expect(component.selectedFile).toBeNull();
  });
});
