import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TodoStore } from '../../store/todo.store';

@Component({
  selector: 'app-todo-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stats-grid">
      <div class="stat-card stat-total">
        <div class="stat-icon">📋</div>
        <div class="stat-body">
          <span class="stat-value">{{ store.stats().total }}</span>
          <span class="stat-label">Total Tasks</span>
        </div>
      </div>

      <div class="stat-card stat-pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-body">
          <span class="stat-value">{{ store.stats().pending }}</span>
          <span class="stat-label">Pending</span>
        </div>
      </div>

      <div class="stat-card stat-done">
        <div class="stat-icon">✅</div>
        <div class="stat-body">
          <span class="stat-value">{{ store.stats().completed }}</span>
          <span class="stat-label">Completed</span>
        </div>
      </div>

      <div class="stat-card stat-progress">
        <div class="stat-icon">📈</div>
        <div class="stat-body">
          <span class="stat-value">{{ store.completionPercent() }}%</span>
          <span class="stat-label">Progress</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="store.completionPercent()"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px var(--shadow);
    }

    .stat-icon {
      font-size: 1.5rem;
      line-height: 1;
    }

    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .stat-total { border-left: 3px solid var(--accent-blue); }
    .stat-pending { border-left: 3px solid var(--accent-amber); }
    .stat-done { border-left: 3px solid var(--accent-green); }
    .stat-progress { border-left: 3px solid var(--accent-purple); }

    .progress-bar {
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.25rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-purple), var(--accent-blue));
      border-radius: 2px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `],
})
export class TodoStatsComponent {
  protected readonly store = inject(TodoStore);
}
