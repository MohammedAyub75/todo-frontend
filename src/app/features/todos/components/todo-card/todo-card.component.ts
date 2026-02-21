import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  computed,
} from '@angular/core';
import { Todo } from '../../../../core/models/todo.model';
import { TodoStore } from '../../store/todo.store';

@Component({
  selector: 'app-todo-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="card"
      [class.completed]="todo().completed"
      [class.selected]="isSelected()"
      [class.priority-high]="todo().priority === 'HIGH'"
      [class.priority-med]="todo().priority === 'MEDIUM'"
      [class.priority-low]="todo().priority === 'LOW'">

      <!-- Selection checkbox -->
      <label class="checkbox-wrap" (click)="$event.stopPropagation()">
        <input
          type="checkbox"
          [checked]="isSelected()"
          (change)="store.toggleSelection(todo().id)" />
        <span class="checkbox-custom"></span>
      </label>

      <!-- Complete toggle -->
      <button
        class="complete-btn"
        [class.done]="todo().completed"
        (click)="store.toggleComplete(todo())"
        [title]="todo().completed ? 'Mark incomplete' : 'Mark complete'">
        {{ todo().completed ? '✅' : '⭕' }}
      </button>

      <!-- Content -->
      <div class="card-content">
        <div class="card-top">
          <span class="card-title">{{ todo().title }}</span>
          <span class="priority-badge" [class]="'badge-' + todo().priority.toLowerCase()">
            {{ priorityLabel() }}
          </span>
        </div>
        @if (todo().description) {
          <p class="card-desc">{{ todo().description }}</p>
        }
        <span class="card-date">{{ formattedDate() }}</span>
      </div>

      <!-- Actions -->
      <div class="card-actions">
        <button class="action-btn edit" (click)="store.openEditForm(todo())" title="Edit">✏️</button>
        <button class="action-btn delete" (click)="store.deleteTodo(todo().id)" title="Delete">🗑️</button>
      </div>
    </div>
  `,
  styles: [`
    .card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.1rem;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .card:hover { box-shadow: 0 4px 16px var(--shadow); transform: translateY(-1px); }
    .card.selected { border-color: var(--accent-blue); background: var(--selected-bg); }
    .card.completed { opacity: 0.6; }
    .card.priority-high { border-left-color: #ef4444; }
    .card.priority-med  { border-left-color: #f59e0b; }
    .card.priority-low  { border-left-color: #22c55e; }

    /* Checkbox */
    .checkbox-wrap {
      position: relative;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 2px;
      cursor: pointer;
    }
    .checkbox-wrap input { opacity: 0; position: absolute; inset: 0; cursor: pointer; margin: 0; }
    .checkbox-custom {
      position: absolute;
      inset: 0;
      border: 1.5px solid var(--border);
      border-radius: 5px;
      background: var(--input-bg);
      transition: all 0.15s;
    }
    .checkbox-wrap input:checked + .checkbox-custom {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .checkbox-wrap input:checked + .checkbox-custom::after {
      content: '✓';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }

    .complete-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
      flex-shrink: 0;
      margin-top: -1px;
      transition: transform 0.15s;
    }
    .complete-btn:hover { transform: scale(1.2); }

    .card-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .card-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
      flex: 1;
    }
    .completed .card-title { text-decoration: line-through; }

    .priority-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      flex-shrink: 0;
    }
    .badge-high   { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .badge-medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .badge-low    { background: rgba(34, 197, 94, 0.15);  color: #22c55e; }

    .card-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-date {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .card-actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.15s;
      flex-shrink: 0;
    }
    .card:hover .card-actions { opacity: 1; }

    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.3rem;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .action-btn:hover { background: var(--hover-bg); }
  `],
})
export class TodoCardComponent {
  readonly todo = input.required<Todo>();
  protected readonly store = inject(TodoStore);

  protected isSelected = computed(() => this.store.selectedIds().includes(this.todo().id));

  protected priorityLabel = computed(() => {
    const map: Record<string, string> = { HIGH: '🔴 High', MEDIUM: '🟡 Med', LOW: '🟢 Low' };
    return map[this.todo().priority] ?? this.todo().priority;
  });

  protected formattedDate = computed(() => {
    return new Date(this.todo().createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  });
}
