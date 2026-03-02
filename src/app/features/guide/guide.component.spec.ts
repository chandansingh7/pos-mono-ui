import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../shared/shared.module';
import { GuideComponent } from './guide.component';

describe('GuideComponent', () => {
  let component: GuideComponent;
  let fixture: ComponentFixture<GuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GuideComponent],
      imports: [SharedModule, MatTabsModule, RouterTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GuideComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should filter guide sections by search query', () => {
    fixture.detectChanges();
    expect(component.filteredGuideSections.length).toBe(component.guideSections.length);

    component.searchQuery = 'barcode';
    expect(component.filteredGuideSections.length).toBeGreaterThan(0);
    expect(component.filteredGuideSections.length).toBeLessThanOrEqual(component.guideSections.length);

    component.searchQuery = 'xyznonexistent';
    expect(component.filteredGuideSections.length).toBe(0);
  });

  it('should filter FAQ by search query', () => {
    fixture.detectChanges();
    component.searchQuery = 'password';
    expect(component.filteredFaqItems.length).toBeGreaterThanOrEqual(1);
    component.searchQuery = 'nonexistentxyz';
    expect(component.filteredFaqItems.length).toBe(0);
  });
});

