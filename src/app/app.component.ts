import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TodoListComponent } from './features/todos/components/todo-list/todo-list.component';
import { TodoStore } from './features/todos/store/todo.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell" [attr.data-theme]="theme()">
      <!-- Top nav -->
      <nav class="nav">
        <div class="nav-inner">
          <div class="nav-brand">
            <span class="brand-icon">✦</span>
            <span class="brand-name">TaskFlow</span>
          </div>
          <div class="nav-actions">
            <button class="theme-toggle" (click)="toggleTheme()" [title]="theme() === 'dark' ? 'Light mode' : 'Dark mode'">
              {{ theme() === 'dark' ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>
      </nav>

      <!-- Main content -->
      <main class="main-content">
        <app-todo-list />
      </main>

      <!-- Footer -->
      <footer class="footer">
        <span>TaskFlow · Built with Angular 19 + NgRx Signal Store</span>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      color: var(--text-primary);
      transition: background 0.3s, color 0.3s;
    }

    .nav {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--nav-bg);
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(12px);
    }

    .nav-inner {
      max-width: 860px;
      margin: 0 auto;
      padding: 0.9rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-brand { display: flex; align-items: center; gap: 0.5rem; }

    .brand-icon {
      color: var(--accent-blue);
      font-size: 1.1rem;
    }

    .brand-name {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .nav-actions { display: flex; align-items: center; gap: 0.75rem; }

    .theme-toggle {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 36px; height: 36px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.15s;
    }
    .theme-toggle:hover { background: var(--hover-bg); }

    .main-content {
      flex: 1;
    }

    .footer {
      text-align: center;
      padding: 1.5rem;
      font-size: 0.78rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }
  `],
})
export class AppComponent implements OnInit {
  private readonly store = inject(TodoStore);
  protected theme = signal<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  );

  ngOnInit(): void {
    this.store.initialize();
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem('theme', next);
  }
}
