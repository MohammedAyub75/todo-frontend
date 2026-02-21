import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Priority, Todo } from '../../../../core/models/todo.model';
import { TodoStore } from '../../store/todo.store';

@Component({
  selector: 'app-todo-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop -->
    <div class="backdrop" (click)="store.closeForm()"></div>

    <!-- Modal -->
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEditing() ? 'Edit Task' : 'New Task' }}</h2>
        <button class="close-btn" (click)="store.closeForm()" aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        <!-- Title -->
        <div class="field">
          <label class="field-label" for="title">Title *</label>
          <input
            id="title"
            class="field-input"
            type="text"
            placeholder="What needs to be done?"
            [(ngModel)]="title"
            maxlength="255"
            autofocus />
          @if (titleError()) {
            <span class="field-error">{{ titleError() }}</span>
          }
        </div>

        <!-- Description -->
        <div class="field">
          <label class="field-label" for="description">Description</label>
          <textarea
            id="description"
            class="field-input field-textarea"
            placeholder="Add more details (optional)..."
            [(ngModel)]="description"
            rows="3"
            maxlength="2000"></textarea>
        </div>

        <!-- Priority -->
        <div class="field">
          <label class="field-label">Priority</label>
          <div class="priority-group">
            @for (p of priorities; track p.value) {
              <button
                type="button"
                class="priority-btn"
                [class]="'priority-' + p.value.toLowerCase()"
                [class.selected]="priority() === p.value"
                (click)="priority.set(p.value)">
                {{ p.icon }} {{ p.label }}
              </button>
            }
          </div>
        </div>

        <!-- Completed toggle (edit only) -->
        @if (isEditing()) {
          <div class="field field-row">
            <label class="field-label" for="completed">Mark as completed</label>
            <label class="toggle">
              <input id="completed" type="checkbox" [(ngModel)]="completed" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        }
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" (click)="store.closeForm()">Cancel</button>
        <button
          class="btn btn-primary"
          [disabled]="store.saving()"
          (click)="submit()">
          @if (store.saving()) { Saving... }
          @else { {{ isEditing() ? 'Save Changes' : 'Create Task' }} }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 100;
      animation: fadeIn 0.2s ease;
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 101;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp {
      from { opacity: 0; transform: translate(-50%, -44%); }
      to   { opacity: 1; transform: translate(-50%, -50%); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .close-btn:hover { background: var(--hover-bg); }

    .modal-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-row { flex-direction: row; justify-content: space-between; align-items: center; }

    .field-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .field-input {
      padding: 0.65rem 0.9rem;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-primary);
      font-size: 0.95rem;
      transition: border-color 0.2s;
      font-family: inherit;
    }

    .field-input:focus { outline: none; border-color: var(--accent-blue); }

    .field-textarea { resize: vertical; min-height: 80px; }

    .field-error { font-size: 0.78rem; color: #ef4444; }

    .priority-group { display: flex; gap: 0.5rem; }

    .priority-btn {
      flex: 1;
      padding: 0.5rem 0;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .priority-btn:hover { border-color: currentColor; }
    .priority-btn.priority-high.selected { background: #ef4444; border-color: #ef4444; color: #fff; }
    .priority-btn.priority-medium.selected { background: #f59e0b; border-color: #f59e0b; color: #fff; }
    .priority-btn.priority-low.selected { background: #22c55e; border-color: #22c55e; color: #fff; }
    .priority-btn.priority-high:hover { border-color: #ef4444; color: #ef4444; }
    .priority-btn.priority-medium:hover { border-color: #f59e0b; color: #f59e0b; }
    .priority-btn.priority-low:hover { border-color: #22c55e; color: #22c55e; }

    /* Toggle switch */
    .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--border);
      border-radius: 24px;
      transition: background 0.2s;
    }
    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 18px; height: 18px;
      left: 3px; bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .toggle input:checked + .toggle-slider { background: var(--accent-blue); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem 1.5rem;
      border-top: 1px solid var(--border);
    }

    .btn {
      padding: 0.6rem 1.4rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }
    .btn-ghost:hover { background: var(--hover-bg); }

    .btn-primary {
      background: var(--accent-blue);
      color: white;
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class TodoFormComponent implements OnInit {
  protected readonly store = inject(TodoStore);

  protected title = '';
  protected description = '';
  protected priority = signal<Priority>('MEDIUM');
  protected completed = false;
  protected titleError = signal('');

  protected readonly priorities = [
    { value: 'HIGH' as Priority, label: 'High', icon: '🔴' },
    { value: 'MEDIUM' as Priority, label: 'Medium', icon: '🟡' },
    { value: 'LOW' as Priority, label: 'Low', icon: '🟢' },
  ];

  protected isEditing = () => !!this.store.editingTodo();

  ngOnInit(): void {
    const editing = this.store.editingTodo();
    if (editing) {
      this.title = editing.title;
      this.description = editing.description ?? '';
      this.priority.set(editing.priority);
      this.completed = editing.completed;
    }
  }

  submit(): void {
    if (!this.title.trim()) {
      this.titleError.set('Title is required');
      return;
    }
    this.titleError.set('');
    const editing = this.store.editingTodo();

    if (editing) {
      this.store.patchTodo({
        id: editing.id,
        changes: {
          title: this.title.trim(),
          description: this.description.trim() || null,
          priority: this.priority(),
          completed: this.completed,
        },
      });
    } else {
      this.store.createTodo({
        title: this.title.trim(),
        description: this.description.trim() || null,
        priority: this.priority(),
      });
    }
  }
}
