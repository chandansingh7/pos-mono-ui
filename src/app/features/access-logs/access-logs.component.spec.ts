import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { AccessLogsComponent } from './access-logs.component';
import { AccessLogService } from '../../core/services/access-log.service';

describe('AccessLogsComponent', () => {
  let component: AccessLogsComponent;
  let fixture: ComponentFixture<AccessLogsComponent>;
  let service: jasmine.SpyObj<AccessLogService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('AccessLogService', ['getAll', 'getUserIps']);
    service.getAll.and.returnValue(of({
      success: true,
      data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 },
      message: null,
      errorCode: null
    }));
    service.getUserIps.and.returnValue(of({
      success: true,
      data: [],
      message: null,
      errorCode: null
    }));

    await TestBed.configureTestingModule({
      declarations: [AccessLogsComponent],
      imports: [SharedModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: AccessLogService, useValue: service }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccessLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

