import { Component } from '@angular/core';

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
        'Complete the sale to create an order and automatically update inventory.'
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
      title: '5. Orders, billing & reports',
      bullets: [
        'Use Orders to look up past sales, see order details and status.',
        'Use Billing for invoices, outstanding amounts and payment history.',
        'Use Reports to see daily and monthly sales, top products and other KPIs.'
      ]
    },
    {
      title: '6. Admin & user management',
      bullets: [
        'Settings (Admin only) contains company profile and global configuration.',
        'Users (Admin only) is where you create cashiers and managers and assign roles.',
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
      answer: 'Go to Labels → Standalone labels. Create a label and leave barcode blank to auto-generate one, then print. You can later attach the label to a product from the same screen.'
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
      answer: 'Visibility depends on your role. Cashiers see POS, Orders, Products, Customers. Managers additionally see Categories, Inventory, Reports, Billing, Labels. Admins see everything including Settings and Users.'
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
