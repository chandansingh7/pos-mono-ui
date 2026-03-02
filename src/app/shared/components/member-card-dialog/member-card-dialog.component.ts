import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import JsBarcode from 'jsbarcode';
import { CustomerResponse } from '../../../core/models/customer.models';

export interface MemberCardDialogData {
  customer: CustomerResponse;
}

@Component({
  selector: 'app-member-card-dialog',
  templateUrl: './member-card-dialog.component.html',
  styleUrls: ['./member-card-dialog.component.scss']
})
export class MemberCardDialogComponent implements AfterViewInit {
  @ViewChild('barcodeSvg') barcodeSvg!: ElementRef<SVGSVGElement>;

  constructor(
    public dialogRef: MatDialogRef<MemberCardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MemberCardDialogData
  ) {}

  get customer(): CustomerResponse {
    return this.data.customer;
  }

  ngAfterViewInit(): void {
    if (this.customer?.memberCardBarcode && this.barcodeSvg?.nativeElement) {
      try {
        JsBarcode(this.barcodeSvg.nativeElement, this.customer.memberCardBarcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: false
        });
      } catch (e) {
        console.warn('JsBarcode render failed', e);
      }
    }
  }

  print(): void {
    const w = window.open('', '_blank', 'width=400,height=320');
    if (!w) return;
    const c = this.customer;
    const barcode = c.memberCardBarcode || '';
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Member Card</title>' +
      '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>' +
      '</head><body><div class="card" style="padding:24px;text-align:center;">' +
      '<h2 style="color:#1a237e;">Member Card</h2><p>' + (c.name || '').replace(/</g, '&lt;') + '</p>' +
      '<p>' + (barcode || '') + '</p><svg id="bc"></svg></div>' +
      '<script>setTimeout(function(){try{JsBarcode("#bc","' + String(barcode).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '",{format:"CODE128",width:2,height:60});}catch(e){}},200);<\/script></body></html>'
    );
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
  }

  close(): void {
    this.dialogRef.close();
  }
}
