import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService, UserResponse, UserStats } from '../../core/services/user.service';
import { SharedModule } from '../../shared/shared.module';
import { UsersComponent } from './users.component';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  const mockUser: UserResponse = {
    id: 1,
    username: 'admin',
    firstName: null,
    lastName: null,
    email: 'admin@pos.com',
    phone: null,
    address: null,
    deliveryAddress: null,
    role: 'ADMIN',
    active: true,
    createdAt: '2024-01-01T00:00:00'
  };

  const mockPageResponse = {
    content: [mockUser],
    totalElements: 1,
    totalPages: 1,
    size: 10,
    number: 0
  };

  beforeEach(async () => {
    const userService = jasmine.createSpyObj('UserService', ['getAll', 'getStats', 'toggleActive']);
    userService.getAll.and.returnValue(of({ success: true, data: mockPageResponse, message: null, errorCode: null }));
    userService.getStats.and.returnValue(of({ success: true, data: { total: 1, admins: 1, managers: 0, cashiers: 0, active: 1, inactive: 0 } as UserStats, message: null, errorCode: null }));

    await TestBed.configureTestingModule({
      declarations: [UsersComponent],
      imports: [SharedModule, MatRadioModule],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: { getUsername: () => 'admin' } },
        { provide: UserService, useValue: userService },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
        { provide: MatSnackBar, useValue: { open: () => {} } }
      ]
    }).compileComponents();

    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users with default page size 10 on init', () => {
    fixture.detectChanges();
    expect(userServiceSpy.getAll).toHaveBeenCalledWith(0, 10);
    expect(component.dataSource.data).toEqual([mockUser]);
    expect(component.totalElements).toBe(1);
  });

  it('should call getAll with correct page and size on page change', () => {
    fixture.detectChanges();
    userServiceSpy.getAll.calls.reset();

    component.onPage({ pageIndex: 1, pageSize: 20, length: 50 } as any);
    expect(userServiceSpy.getAll).toHaveBeenCalledWith(1, 20);
  });

  it('refreshUsers should reset to page 0 and reload', () => {
    fixture.detectChanges();
    component.pageIndex = 2;
    userServiceSpy.getAll.calls.reset();

    component.refreshUsers();
    expect(component.pageIndex).toBe(0);
    expect(userServiceSpy.getAll).toHaveBeenCalledWith(0);
  });
});
