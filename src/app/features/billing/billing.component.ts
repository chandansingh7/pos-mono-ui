import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { CompanyResponse, RECEIPT_PAPER_SIZES } from '../../core/models/company.models';

interface SampleLine {
  productName: string;
  quantity: number;
  subtotal: number;
}

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit {
  company: CompanyResponse | null = null;
  loading = true;
  billType: string = '80mm';
  receiptSizes = RECEIPT_PAPER_SIZES;

  /** Sample receipt data – matches what customer sees in hand */
  sampleOrder = {
    orderId: 'PREVIEW',
    items: [
      { productName: 'Sample Product A', quantity: 2, subtotal: 19.98 },
      { productName: 'Sample Product B', quantity: 1, subtotal: 12.50 },
      { productName: 'Another Item', quantity: 3, subtotal: 8.97 }
    ] as SampleLine[],
    subtotal: 41.45,
    tax: 4.15,
    discount: 0,
    total: 45.60,
    paymentMethod: 'CASH'
  };

  constructor(
    private companyService: CompanyService,
    private router: Router
  ) {}

  get currencyCode(): string {
    return this.company?.displayCurrency || 'USD';
  }

  ngOnInit(): void {
    this.companyService.get(true).subscribe({
      next: res => {
        this.company = res.data ?? null;
        if (this.company?.receiptPaperSize) {
          this.billType = this.company.receiptPaperSize;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  goToSettings(): void {
    this.router.navigate(['/app/settings']);
  }

  get previewWidthClass(): string {
    if (this.billType === '58mm') return 'preview-58';
    if (this.billType === 'A4') return 'preview-a4';
    return 'preview-80';
  }
}
