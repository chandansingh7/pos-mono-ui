import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CustomerService } from '../../core/services/customer.service';
import { RewardService } from '../../core/services/reward.service';
import { SharedModule } from '../../shared/shared.module';
import { RewardsComponent } from './rewards.component';

describe('RewardsComponent', () => {
  let component: RewardsComponent;
  let fixture: ComponentFixture<RewardsComponent>;

  beforeEach(async () => {
    const rewardService = jasmine.createSpyObj('RewardService', ['getConfig']);
    rewardService.getConfig.and.returnValue(of({
      success: true,
      data: { pointsPerDollar: 1, redemptionRate: 100 },
      message: null,
      errorCode: null
    }));
    const customerService = jasmine.createSpyObj('CustomerService', ['getAll']);
    customerService.getAll.and.returnValue(of({
      success: true,
      data: { content: [{ id: 1, name: 'Jane', email: 'j@x.com', rewardPoints: 200 }], totalElements: 1, totalPages: 1, size: 20, number: 0 },
      message: null,
      errorCode: null
    }));

    await TestBed.configureTestingModule({
      declarations: [RewardsComponent],
      imports: [SharedModule, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: RewardService, useValue: rewardService },
        { provide: CustomerService, useValue: customerService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RewardsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load config and customers on init', () => {
    fixture.detectChanges();
    expect(component.config).toEqual({ pointsPerDollar: 1, redemptionRate: 100 });
    expect(component.customers.length).toBe(1);
    expect(component.customers[0].rewardPoints).toBe(200);
  });

  it('should compute redemption value', () => {
    component.config = { pointsPerDollar: 1, redemptionRate: 100 };
    expect(component.redemptionValue(100)).toBe(1);
    expect(component.redemptionValue(250)).toBe(2.5);
  });
});
