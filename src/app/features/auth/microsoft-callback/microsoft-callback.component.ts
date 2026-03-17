import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Shown in the popup after Microsoft OAuth redirect from the backend.
 * Displays "Connected — no need to verify again" (or error), notifies the opener and closes.
 */
@Component({
  selector: 'app-microsoft-callback',
  templateUrl: './microsoft-callback.component.html',
  styleUrls: ['./microsoft-callback.component.scss']
})
export class MicrosoftCallbackComponent implements OnInit {
  success = false;
  email = '';
  errorMessage = '';
  closing = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const err = params.get('error');
    const msg = params.get('message');

    if (params.get('ms_connected') === '1' && !err) {
      this.success = true;
      this.email = params.get('email') || '';
      this.notifyAndClose();
    } else {
      this.success = false;
      this.errorMessage = msg || err || 'Connection was not completed.';
      this.closing = true;
      this.notifyAndClose();
    }
  }

  private notifyAndClose(): void {
    try {
      if (window.opener) {
        window.opener.postMessage(
          { type: 'ms_connected', email: this.email, success: this.success },
          window.location.origin
        );
      }
    } catch {}

    setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 2200);
  }
}
