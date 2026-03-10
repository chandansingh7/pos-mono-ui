import { Component } from '@angular/core';
import { CompanyService } from '../../core/services/company.service';
import { formatCurrency } from '../../core/utils/currency.util';

export interface GuideSection {
  title: string;
  bullets: string[];
}

export interface SupportItem {
  title: string;
  content: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss']
})
export class GuideComponent {
  searchQuery = '';

  constructor(private companyService: CompanyService) {}

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  /** Replaces {{CURRENCY_1}} placeholder with formatted 1 in display currency. */
  processText(text: string): string {
    const formatted = formatCurrency(1, this.currencyCode, this.companyService.getCached()?.locale);
    return text.replace(/\{\{CURRENCY_1\}\}/g, formatted);
  }

  readonly guideSections: GuideSection[] = [
    {
      title: '1. Getting started',
      bullets: [
        'Sign in with your assigned email and password.',
        'Use the left sidebar to move between modules such as POS / Cashier, Products, Inventory, Orders, Labels and Reports.',
        'Your role (Admin / Manager / Cashier) controls which menus you see and what actions are allowed.'
      ]
    },
    {
      title: '2. Daily sales – POS / Cashier',
      bullets: [
        'Open POS / Cashier for all selling and checkout work.',
        'Scan a barcode or search by product name to add items to the cart.',
        'Adjust quantities, apply discounts if allowed, and choose the payment method.',
        'For items sold by weight or volume (kg, lb, L, etc.), you can enter decimal quantities (for example 0.3 kg) and totals and stock will update correctly.',
        'Complete the sale to create an order and automatically update inventory.',
        'For CASH payments you must have an open shift; the app will block cash sales if no shift is open.'
      ]
    },
    {
      title: '3. Products & inventory',
      bullets: [
        'Use Products to add and edit items (name, price, category, barcode, image).',
        'Use Categories to group products (for example: Grocery, Beverages, Electronics).',
        'Use Inventory to track stock levels, update quantities after deliveries, and see low‑stock alerts.'
      ]
    },
    {
      title: '4. Labels & barcodes',
      bullets: [
        'Open Labels to print shelf / product labels with barcodes.',
        'From the From products tab you can select existing products and print labels directly.',
        'From the Standalone labels tab you can create labels before the product exists, auto-generate a barcode, and later attach a label to an existing or new product (with option to overwrite barcode).'
      ]
    },
    {
      title: '5. Shifts & cash drawer',
      bullets: [
        'Cashiers open a shift with an opening float amount, and close & reconcile at the end of the day.',
        'From the Shifts page, you can see your current shift, past shifts, and whether any shifts are still open.',
        'When closing a shift you enter the counted cash; the system compares it to expected cash and shows over/short.',
        'Admins can configure rules in Settings → Company (max allowed difference, minimum/maximum shift duration, and whether shifts must be closed the same day).',
        'Admins and managers can force-close stuck or overnight shifts from the Shifts admin view, with full reconciliation details.'
      ]
    },
    {
      title: '6. Orders, billing & reports',
      bullets: [
        'Use Orders to look up past sales, see order details and status.',
        'Use Billing for invoices, outstanding amounts and payment history.',
        'Use Reports to see daily and monthly sales, top products and other KPIs.'
      ]
    },
    {
      title: '7. Member rewards',
      bullets: [
        'Customers earn points on every order (configurable: e.g. 1 point per {{CURRENCY_1}} spent).',
        'Create a member card (Customers or Member Rewards → Create card): the card has a unique barcode. Print it for the member.',
        'At POS, scan the member card barcode (or select customer manually) to attach the sale to the member and use their points balance and redemption.',
        'Use the Member Rewards page to view how the program works, see points balances, and create or reprint cards.'
      ]
    },
    {
      title: '8. Audit, access logs & admin',
      bullets: [
        'Settings (Admin only) contains company profile, shift rules and other global configuration.',
        'Users (Admin only) is where you create cashiers and managers and assign roles.',
        'Access Logs (Admin only) shows who is using the system, from which IPs, and which high-level actions they perform (for example “Created order”, “Updated product”).',
        'Cashiers are redirected to POS and cannot access the Dashboard; managers and admins see the Dashboard and more analytics.',
        'Use your profile menu in the top bar to change password or update your own details.'
      ]
    }
  ];

  readonly supportItems: SupportItem[] = [
    {
      title: 'In-app help',
      content: 'Use this Guide / Manual page (Guide, Support, and FAQ tabs) for how-to and common questions.'
    },
    {
      title: 'Password reset',
      content: 'Use "Forgot password" on the login page, or ask an Admin to reset your password from Settings → Users.'
    },
    {
      title: 'Permissions and access',
      content: 'Only Admins can manage users and company settings. If you need access to a feature, contact your administrator.'
    },
    {
      title: 'Technical issues',
      content: 'If the app does not load, check your internet connection and try again. For recurring errors, contact your system administrator or IT support.'
    }
  ];

  readonly faqItems: FaqItem[] = [
    {
      question: 'How do I add a new product?',
      answer: 'Go to Products, click Add Product, then fill in name, price, category, and optionally barcode and image. Save.'
    },
    {
      question: 'How do I print labels for items without a barcode?',
      answer: 'Go to Labels → Standalone labels. Create a label and either enter a barcode or leave it blank to auto-generate one, then print. You can later attach the label to a product (or convert it into a product) from the same screen.'
    },
    {
      question: 'Where do I see daily sales?',
      answer: 'Open Reports for daily and monthly sales summaries, top products, and low-stock alerts. Dashboard also shows a quick overview.'
    },
    {
      question: 'How do I change my password?',
      answer: 'Click your profile icon in the top bar → Change Password, then enter your current password and the new one.'
    },
    {
      question: 'Why can I not see some menu items?',
      answer: 'Visibility depends on your role. Cashiers see POS, Orders, Products, Customers. Managers additionally see Categories, Inventory, Reports, Billing, Labels, Member Rewards. Admins see everything including Settings and Users.'
    },
    {
      question: 'How do shifts and cash drawer reconciliation work?',
      answer: 'Before taking CASH payments, open a shift with your opening float (cash in the drawer). During the day, POS tracks cash sales. When you close & reconcile, enter the counted cash; the system calculates expected cash and shows whether you are over, short, or exact. Depending on shift rules configured in Settings, large differences or very short/very long shifts may be blocked and require an admin to review or force-close.'
    },
    {
      question: 'What happens if a shift stays open overnight?',
      answer: 'If the same-day rule is enabled in Settings, cashiers will not be able to close a shift that has rolled over to the next calendar day. An Admin or Manager must go to the Shifts page and use Force close to reconcile and close that shift.'
    },
    {
      question: 'How are my actions and IP address logged?',
      answer: 'For security, the system records which user performed key actions (such as login, creating orders, updating products) along with their IP address and browser information. Admins can review this on the Access Logs page. From there, admins can add or remove IPs to a per-user allow list (whitelist). When a user has at least one allowed IP, only those IPs can be used for login and API access; otherwise all IPs are allowed.'
    },
    {
      question: 'How do member reward points work?',
      answer: 'Customers earn points when they are selected at checkout and an order is completed. They can redeem points at POS: select the customer, enter points to redeem, and the discount is applied (e.g. 100 points = {{CURRENCY_1}} off). View balances on the Member Rewards page.'
    }
  ];

  private matchesQuery(text: string): boolean {
    if (!this.searchQuery.trim()) return true;
    const q = this.searchQuery.trim().toLowerCase();
    return text.toLowerCase().includes(q);
  }

  get filteredGuideSections(): GuideSection[] {
    if (!this.searchQuery.trim()) return this.guideSections;
    return this.guideSections.filter(s => {
      const searchable = [s.title, ...s.bullets].join(' ');
      return this.matchesQuery(searchable);
    });
  }

  get filteredSupportItems(): SupportItem[] {
    if (!this.searchQuery.trim()) return this.supportItems;
    return this.supportItems.filter(s =>
      this.matchesQuery(s.title + ' ' + s.content)
    );
  }

  get filteredFaqItems(): FaqItem[] {
    if (!this.searchQuery.trim()) return this.faqItems;
    return this.faqItems.filter(f =>
      this.matchesQuery(f.question + ' ' + f.answer)
    );
  }
}
