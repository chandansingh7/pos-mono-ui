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
    'Unit-aware products: sold by piece, weight, or volume (each, kg, lb, L, etc.).',
    'Decimal quantities for weight/volume items at POS (e.g. 0.3 kg) with correct totals and stock updates.',
    'Inventory tracking with low-stock alerts and manual adjustments.',
    'Complete order lifecycle: create, cancel; multiple payment method labels (Cash, Card, etc.).',
    'Customer management with member cards (scannable barcode at checkout) and reward points.',
    'Member rewards: earn points per sale, redeem at checkout; configurable rates.',
    'Label printing: print from products or standalone labels with barcodes; attach labels to products.',
    'Daily and monthly sales reports with top products and Excel export.',
    'Shift and cash-drawer management with opening float, close & reconcile, and over/short checks.',
    'Admin tools for resolving stuck shifts, including force-close with full reconciliation details.',
    'Company branding: logo, receipt layout (paper size, header/footer), tax ID; display currency and locale (multi-currency and localisation).',
    'User management: Admin, Manager, Cashier roles; create, edit, activate/deactivate users.',
    'Granular access control on UI modules (e.g. Dashboard guarded from cashiers).',
    'Access logging with per-user IP usage and friendly action labels for key operations.',
    'Per-user IP allow list (whitelist): restrict login and API access to specific IPs from Access Logs.',
    'In-app Guide, Support and FAQ with search.',
    'JWT authentication, role-based API security, and centralised error handling.',
    'One global UI control standard: inputs, dropdowns, and buttons are consistent across the app.',
    'Deployed on Azure with CI/CD (GitHub Actions).',
  ];

  /** Current limitations — planned improvements (transparent roadmap). */
  limitations = [
    'Monolith backend today; microservice split is planned in the roadmap.',
    'Single-company per deployment; no multi-store or stock transfers yet.',
    'Web-only; no offline mode or PWA sync for poor connectivity.',
    'No integrated card payment processing (e.g. Stripe/Square); payment method is recorded only.',
    'No refund workflow (full or partial) or refund receipts.',
    'Fixed tax rate; no configurable or per-product tax rules.',
    'No promotions engine (percentage off, BOGO, coupon codes) beyond manual discount.',
    'No audit trail for price or inventory changes (access logs do not yet track field-level changes).',
    'Billing is receipt configuration only; no formal invoicing (numbered invoices, PDF, due dates).',
    'Customer order history view is not yet implemented.',
    'No email receipt option for customers.',
    'Reports use fixed periods; no custom date range or period comparison.',
    'No accounting or e-commerce integrations (e.g. QuickBooks, Xero).',
    'No full label template designer (you can choose A4 templates or a basic custom layout).',
  ];

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getRole();
      if (role === 'CASHIER') {
        this.router.navigate(['/app/pos']);
      } else {
        this.router.navigate(['/app/dashboard']);
      }
    }
  }
}
