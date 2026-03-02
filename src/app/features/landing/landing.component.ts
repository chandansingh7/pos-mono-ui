import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  features = [
    { icon: 'point_of_sale',  title: 'Fast Checkout',       desc: 'Barcode scanning, cart management and instant order processing for your cashiers.' },
    { icon: 'inventory_2',    title: 'Inventory Control',   desc: 'Real-time stock tracking with low-stock alerts so you never run out of top sellers.' },
    { icon: 'people',         title: 'Customer Management', desc: 'Build customer profiles, track purchase history and grow loyalty.' },
    { icon: 'bar_chart',      title: 'Sales Reports',       desc: 'Daily and monthly revenue reports with top-product rankings at a glance.' },
    { icon: 'manage_accounts',title: 'Role-Based Access',   desc: 'Admin, Manager and Cashier roles keep every team member in the right place.' },
    { icon: 'cloud_done',     title: 'Cloud Powered',       desc: 'Runs on Azure — always available, automatically backed up, no servers to manage.' },
  ];

  /** Current product strengths — what’s included today. */
  strengths = [
    'Full product & category management with barcode support and bulk Excel upload.',
    'Inventory tracking with low-stock alerts and manual adjustments.',
    'Complete order lifecycle: create, cancel; multiple payment method labels (Cash, Card, etc.).',
    'Customer management with member cards (scannable barcode at checkout) and reward points.',
    'Member rewards: earn points per sale, redeem at checkout; configurable rates.',
    'Label printing: product labels and standalone labels with barcodes; attach labels to products.',
    'Daily and monthly sales reports with top products and Excel export.',
    'Company branding: logo, receipt layout (paper size, header/footer), tax ID.',
    'User management: Admin, Manager, Cashier roles; create, edit, activate/deactivate users.',
    'In-app Guide, Support and FAQ with search.',
    'JWT authentication, role-based API security, and centralised error handling.',
    'Deployed on Azure with CI/CD (GitHub Actions).',
  ];

  /** Current limitations — planned improvements (transparent roadmap). */
  limitations = [
    'No integrated card payment processing (e.g. Stripe/Square); payment method is recorded only.',
    'No refund workflow (full or partial) or refund receipts.',
    'Fixed tax rate; no configurable or per-product tax rules.',
    'No promotions engine (percentage off, BOGO, coupon codes) beyond manual discount.',
    'Single-location only; no multi-store or stock transfers.',
    'Web-only; no offline mode or PWA sync for poor connectivity.',
    'No dedicated mobile or tablet-optimised layout.',
    'No audit trail for price or inventory changes.',
    'Billing is receipt configuration only; no formal invoicing (numbered invoices, PDF, due dates).',
    'Customer order history view is not yet implemented.',
    'No email receipt option for customers.',
    'Reports use fixed periods; no custom date range or period comparison.',
    'No accounting or e-commerce integrations (e.g. QuickBooks, Xero).',
    'No shift or cash-drawer reconciliation.',
    'Single SKU per product; no size/color variants.',
    'Single language and currency; no localisation or multi-currency.',
  ];

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/app/dashboard']);
    }
  }
}
