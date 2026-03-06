import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let service: BackupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BackupService]
    });
    service = TestBed.inject(BackupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isSqlAvailable should return ApiResponse with boolean', () => {
    service.isSqlAvailable().subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.data).toBe(true);
    });
    const req = httpMock.expectOne(r => r.url.includes('/sql-available'));
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: true, message: null, errorCode: null });
  });

  it('exportJson should return blob and trigger download', () => {
    const blob = new Blob(['{"version":1}'], { type: 'application/json' });
    service.exportJson().subscribe(data => {
      expect(data).toBeInstanceOf(Blob);
      expect(data.type).toBe('application/json');
    });
    const req = httpMock.expectOne(r => r.url.includes('/export/json'));
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });

  it('exportSql should return blob', () => {
    const blob = new Blob(['-- PostgreSQL dump'], { type: 'application/sql' });
    service.exportSql().subscribe(data => {
      expect(data).toBeInstanceOf(Blob);
    });
    const req = httpMock.expectOne(r => r.url.includes('/export/sql'));
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });

  it('restore should POST file and format', () => {
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    service.restore(file, 'json').subscribe(res => {
      expect(res.success).toBe(true);
      expect(res.data).toContain('Restore completed');
    });
    const req = httpMock.expectOne(r => r.url.includes('/restore'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const form = req.request.body as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('format')).toBe('json');
    req.flush({ success: true, data: 'Restore completed successfully', message: null, errorCode: null });
  });

  it('restore with sql format should send format sql', () => {
    const file = new File(['-- SQL'], 'backup.sql', { type: 'text/plain' });
    service.restore(file, 'sql').subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/restore'));
    expect((req.request.body as FormData).get('format')).toBe('sql');
    req.flush({ success: true, data: 'OK', message: null, errorCode: null });
  });
});
