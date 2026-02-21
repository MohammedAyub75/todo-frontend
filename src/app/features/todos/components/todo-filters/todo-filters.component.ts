import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Priority } from '../../../../core/models/todo.model';
import { TodoStore } from '../../store/todo.store';

@Component({
  selector: 'app-todo-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters-bar">

      <!-- Search -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          type="text"
          placeholder="Search tasks..."
          [value]="searchValue()"
          (input)="onSearch($event)" />
        @if (searchValue()) {
          <button class="clear-btn" (click)="clearSearch()">✕</button>
        }
      </div>

      <!-- Status filter -->
      <div class="filter-group">
        <button
          class="filter-btn"
          [class.active]="store.filter().completed === undefined"
          (click)="setCompleted(undefined)">All</button>
        <button
          class="filter-btn"
          [class.active]="store.filter().completed === false"
          (click)="setCompleted(false)">Active</button>
        <button
          class="filter-btn"
          [class.active]="store.filter().completed === true"
          (click)="setCompleted(true)">Done</button>
      </div>

      <!-- Priority filter -->
      <div class="filter-group">
        <button
          class="filter-btn"
          [class.active]="!store.filter().priority"
          (click)="setPriority(undefined)">Any</button>
        <button
          class="filter-btn priority-high"
          [class.active]="store.filter().priority === 'HIGH'"
          (click)="setPriority('HIGH')">🔴 High</button>
        <button
          class="filter-btn priority-med"
          [class.active]="store.filter().priority === 'MEDIUM'"
          (click)="setPriority('MEDIUM')">🟡 Med</button>
        <button
          class="filter-btn priority-low"
          [class.active]="store.filter().priority === 'LOW'"
          (click)="setPriority('LOW')">🟢 Low</button>
      </div>

      <!-- Sort -->
      <div class="sort-group">
        <select class="sort-select" [value]="store.filter().sortBy" (change)="onSortChange($event)">
          <option value="createdAt">Newest first</option>
          <option value="updatedAt">Recently updated</option>
          <option value="title">Title A–Z</option>
          <option value="priority">Priority</option>
        </select>
      </div>

    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 1rem;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.9rem;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.5rem 2.5rem 0.5rem 2.25rem;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 0.9rem;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent-blue);
    }

    .clear-btn {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.2rem;
    }

    .filter-group, .sort-group {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }

    .filter-btn {
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .filter-btn:hover {
      border-color: var(--accent-blue);
      color: var(--text-primary);
    }

    .filter-btn.active {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: #fff;
    }

    .filter-btn.priority-high.active { background: #ef4444; border-color: #ef4444; }
    .filter-btn.priority-med.active  { background: #f59e0b; border-color: #f59e0b; }
    .filter-btn.priority-low.active  { background: #22c55e; border-color: #22c55e; }

    .sort-select {
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--input-bg);
      color: var(--text-secondary);
      font-size: 0.8rem;
      cursor: pointer;
    }

    .sort-select:focus { outline: none; border-color: var(--accent-blue); }
  `],
})
export class TodoFiltersComponent {
  protected readonly store = inject(TodoStore);
  protected searchValue = signal('');

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
    this.store.setSearch(value);
  }

  clearSearch(): void {
    this.searchValue.set('');
    this.store.setSearch('');
  }

  setCompleted(value: boolean | undefined): void {
    this.store.setFilter({ completed: value, priority: this.store.filter().priority });
  }

  setPriority(value: Priority | undefined): void {
    this.store.setFilter({ priority: value, completed: this.store.filter().completed });
  }

  onSortChange(event: Event): void {
    const sortBy = (event.target as HTMLSelectElement).value;
    this.store.setFilter({ sortBy });
  }
}
