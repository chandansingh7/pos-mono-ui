import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BackupService } from '../../core/services/backup.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-backup',
  templateUrl: './backup.component.html',
  styleUrls: ['./backup.component.scss']
})
export class BackupComponent implements OnInit {
  sqlAvailable = false;
  loadingSqlCheck = true;
  exporting = false;
  restoring = false;
  selectedFile: File | null = null;
  restoreFormat: 'json' | 'sql' = 'json';

  constructor(
    private authService: AuthService,
    private backupService: BackupService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/app/dashboard']);
      return;
    }
    this.checkSqlAvailable();
  }

  checkSqlAvailable(): void {
    this.loadingSqlCheck = true;
    this.backupService.isSqlAvailable().subscribe({
      next: res => {
        this.sqlAvailable = res.data ?? false;
        this.loadingSqlCheck = false;
      },
      error: () => {
        this.sqlAvailable = false;
        this.loadingSqlCheck = false;
      }
    });
  }

  downloadJson(): void {
    this.exporting = true;
    this.backupService.exportJson().subscribe({
      next: blob => {
        this.downloadBlob(blob, `pos-backup-${this.timestamp()}.json`);
        this.exporting = false;
        this.snackBar.open('JSON backup downloaded', 'Close', { duration: 3000 });
      },
      error: err => {
        this.exporting = false;
        this.showError(err, 'JSON backup failed');
      }
    });
  }

  downloadSql(): void {
    this.exporting = true;
    this.backupService.exportSql().subscribe({
      next: blob => {
        this.downloadBlob(blob, `pos-backup-${this.timestamp()}.sql`);
        this.exporting = false;
        this.snackBar.open('SQL backup downloaded', 'Close', { duration: 3000 });
      },
      error: err => {
        this.exporting = false;
        this.showError(err, 'SQL backup failed');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
    input.value = '';
  }

  restore(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Please select a backup file', 'Close', { duration: 3000 });
      return;
    }
    const ext = this.selectedFile.name.toLowerCase().split('.').pop();
    if (this.restoreFormat === 'json' && ext !== 'json') {
      this.snackBar.open('Selected file does not appear to be a JSON backup', 'Close', { duration: 4000 });
      return;
    }
    if (this.restoreFormat === 'sql' && ext !== 'sql') {
      this.snackBar.open('Selected file does not appear to be an SQL backup', 'Close', { duration: 4000 });
      return;
    }

    this.restoring = true;
    this.backupService.restore(this.selectedFile, this.restoreFormat).subscribe({
      next: res => {
        this.restoring = false;
        this.selectedFile = null;
        this.snackBar.open(res.data ?? 'Restore completed', 'Close', { duration: 4000 });
      },
      error: err => {
        this.restoring = false;
        this.showError(err, 'Restore failed');
      }
    });
  }

  clearFile(): void {
    this.selectedFile = null;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private timestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').slice(0, 15);
  }

  private showError(err: { error?: { message?: string; errorCode?: string } }, fallback: string): void {
    const code = err.error?.errorCode;
    const msg = err.error?.message ?? fallback;
    const display = code ? `[${code}] ${msg}` : msg;
    this.snackBar.open(display, 'Close', { duration: 5000 });
  }
}
