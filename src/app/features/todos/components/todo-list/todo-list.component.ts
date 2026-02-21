import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TodoStore } from '../../store/todo.store';
import { TodoCardComponent } from '../todo-card/todo-card.component';
import { TodoFormComponent } from '../todo-form/todo-form.component';
import { TodoFiltersComponent } from '../todo-filters/todo-filters.component';
import { TodoStatsComponent } from '../todo-stats/todo-stats.component';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [TodoCardComponent, TodoFormComponent, TodoFiltersComponent, TodoStatsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">✦</span> My Tasks
          </h1>
          <span class="task-count">{{ store.totalElements() }} tasks</span>
        </div>
        <div class="header-right">
          @if (store.hasSelection()) {
            <button class="btn btn-bulk" (click)="store.bulkComplete(undefined)">
              ✅ Complete {{ store.selectedIds().length }} selected
            </button>
            <button class="btn btn-ghost-sm" (click)="store.clearSelection()">Clear</button>
          }
          <button class="btn btn-new" (click)="store.openCreateForm()">
            <span>+</span> New Task
          </button>
        </div>
      </header>

      <!-- Stats -->
      <app-todo-stats />

      <!-- Filters -->
      <app-todo-filters />

      <!-- Error banner -->
      @if (store.error()) {
        <div class="error-banner">
          ⚠️ {{ store.error() }}
          <button class="error-close" (click)="store.clearError()">✕</button>
        </div>
      }

      <!-- Bulk select bar -->
      @if (store.todos().length > 0) {
        <div class="select-bar">
          <label class="select-all">
            <input
              type="checkbox"
              [checked]="store.allSelected()"
              [indeterminate]="store.hasSelection() && !store.allSelected()"
              (change)="store.toggleSelectAll()" />
            Select all
          </label>
          @if (store.hasSelection()) {
            <span class="selection-count">{{ store.selectedIds().length }} selected</span>
          }
        </div>
      }

      <!-- Todo list -->
      <div class="todo-list" [class.loading]="store.loading()">
        @if (store.loading()) {
          @for (i of skeletons; track i) {
            <div class="skeleton-card"></div>
          }
        } @else if (store.isEmpty()) {
          <div class="empty-state">
            <div class="empty-icon">🎯</div>
            <h3 class="empty-title">
              {{ store.isSearching() ? 'No results found' : 'All clear!' }}
            </h3>
            <p class="empty-desc">
              {{ store.isSearching()
                ? 'Try a different search term or clear filters'
                : 'Add your first task to get started' }}
            </p>
            @if (!store.isSearching()) {
              <button class="btn btn-new" (click)="store.openCreateForm()">
                + Add your first task
              </button>
            }
          </div>
        } @else {
          @for (todo of store.todos(); track todo.id) {
            <app-todo-card [todo]="todo" />
          }
        }
      </div>

      <!-- Pagination -->
      @if (store.totalPages() > 1) {
        <div class="pagination">
          <button
            class="page-btn"
            [disabled]="!store.hasPrevPage()"
            (click)="store.goToPage(store.currentPage() - 1)">
            ← Prev
          </button>
          @for (page of pageRange(); track page) {
            <button
              class="page-btn"
              [class.active]="page === store.currentPage()"
              (click)="store.goToPage(page)">
              {{ page + 1 }}
            </button>
          }
          <button
            class="page-btn"
            [disabled]="!store.hasNextPage()"
            (click)="store.goToPage(store.currentPage() + 1)">
            Next →
          </button>
        </div>
      }

    </div>

    <!-- Form Modal -->
    @if (store.showForm()) {
      <app-todo-form />
    }
  `,
  styles: [`
    .page {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-left { display: flex; align-items: baseline; gap: 0.75rem; }
    .header-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

    .page-title {
      font-size: 2rem;
      font-weight: 900;
      color: var(--text-primary);
      margin: 0;
      letter-spacing: -0.03em;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .title-icon {
      color: var(--accent-blue);
      font-size: 1.4rem;
    }

    .task-count {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .btn {
      padding: 0.55rem 1.2rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .btn-new {
      background: var(--accent-blue);
      color: white;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-new:hover { filter: brightness(1.1); }

    .btn-bulk {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .btn-bulk:hover { background: rgba(34, 197, 94, 0.25); }

    .btn-ghost-sm {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    .btn-ghost-sm:hover { background: var(--hover-bg); }

    .error-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      color: #ef4444;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .error-close {
      background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.85rem;
    }

    .select-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
      margin-bottom: 0.5rem;
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .select-all { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
    .selection-count { color: var(--accent-blue); font-weight: 600; }

    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      min-height: 200px;
      transition: opacity 0.2s;
    }
    .todo-list.loading { opacity: 0.5; pointer-events: none; }

    /* Skeleton loaders */
    .skeleton-card {
      height: 72px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      animation: shimmer 1.5s infinite;
      background: linear-gradient(
        90deg,
        var(--card-bg) 0%,
        var(--hover-bg) 50%,
        var(--card-bg) 100%
      );
      background-size: 200% 100%;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 4rem 2rem;
      text-align: center;
    }
    .empty-icon { font-size: 3rem; }
    .empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .empty-desc { color: var(--text-muted); margin: 0; font-size: 0.9rem; }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      gap: 0.4rem;
      margin-top: 1.5rem;
    }

    .page-btn {
      min-width: 36px;
      padding: 0.4rem 0.6rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .page-btn:hover:not(:disabled) { border-color: var(--accent-blue); color: var(--text-primary); }
    .page-btn.active { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  `],
})
export class TodoListComponent {
  protected readonly store = inject(TodoStore);
  protected readonly skeletons = [1, 2, 3, 4, 5];

  protected pageRange(): number[] {
    const total = this.store.totalPages();
    const current = this.store.currentPage();
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(0, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    return range;
  }
}
