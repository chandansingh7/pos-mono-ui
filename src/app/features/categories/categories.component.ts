import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { CategoryService } from '../../core/services/category.service';
import { AuthService } from '../../core/services/auth.service';
import { CategoryResponse } from '../../core/models/category.models';
import { CategoryDialogComponent } from './category-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  dataSource = new MatTableDataSource<CategoryResponse>();
  displayedColumns = ['name', 'description', 'updatedAt', 'actions'];
  totalElements = 0;
  pageSize = 20;
  loading = false;
  stats: { total: number } | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  filters = new FormGroup({
    name:        new FormControl(''),
    description: new FormControl(''),
    updatedAt:   new FormControl(''),
  });

  sortCol = '';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private categoryService: CategoryService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Default: newest categories first
    this.sortCol = 'updatedAt';
    this.sortDir = 'desc';
    this.setupFilterPredicate();
    this.load();
    this.loadStats();
    this.filters.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyColumnFilters());
  }

  loadStats(): void {
    this.categoryService.getStats().subscribe({ next: res => { this.stats = res.data ?? null; } });
  }

  sortBy(col: string): void {
    this.sortDir = this.sortCol === col && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortCol = col;
    this.load(0);
  }

  sortIcon(col: string): string {
    if (this.sortCol !== col) return 'swap_vert';
    return this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (row: CategoryResponse, filter: string) => {
      const f = JSON.parse(filter);
      return [
        this.contains(row.name, f.name),
        this.contains(row.description, f.description),
        this.contains(row.updatedAt, f.updatedAt),
      ].every(Boolean);
    };
  }

  private contains(value: string | null | undefined, filter: string): boolean {
    if (!filter) return true;
    return (value ?? '').toString().toLowerCase().includes(filter.toLowerCase());
  }

  private applyColumnFilters(): void {
    const v = this.filters.value;
    this.dataSource.filter = JSON.stringify({
      name:        v.name        || '',
      description: v.description || '',
      updatedAt:   v.updatedAt   || '',
    });
  }

  load(page = 0): void {
    this.loading = true;
    const sort = this.sortCol ? `${this.sortCol},${this.sortDir}` : 'updatedAt,desc';
    this.categoryService.getAll(page, this.pageSize, sort).subscribe({
      next: res => {
        this.dataSource.data = res.data?.content || [];
        this.totalElements = res.data?.totalElements ?? 0;
        this.loading = false;
        this.applyColumnFilters();
      },
      error: () => { this.loading = false; }
    });
  }

  onPage(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.load(e.pageIndex);
  }

  openDialog(category?: CategoryResponse): void {
    const ref = this.dialog.open(CategoryDialogComponent, { data: category || null, width: '420px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const call = category
        ? this.categoryService.update(category.id, result)
        : this.categoryService.create(result);
      call.subscribe({
        next: () => { this.snackBar.open('Category saved!', 'Close', { duration: 3000 }); this.load(0); this.loadStats(); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  delete(category: CategoryResponse): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Category', message: `Delete "${category.name}"?`, confirmText: 'Delete' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.categoryService.delete(category.id).subscribe({
        next: () => { this.snackBar.open('Deleted', 'Close', { duration: 3000 }); this.load(0); this.loadStats(); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  clearFilters(): void { this.filters.reset(); }

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isAdminOrManager(): boolean { return this.authService.isAdminOrManager(); }
  get hasActiveFilters(): boolean { return Object.values(this.filters.value).some(v => !!v); }

}
