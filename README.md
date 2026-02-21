# TaskFlow — Angular 19 Frontend

A modern, production-grade Todo frontend built with **Angular 19** and **NgRx Signal Store**, connected to your Spring Boot REST API.

---

## Quick Start

```bash
# 1. Install dependencies
cd todo-frontend
npm install

# 2. Make sure Spring Boot is running on :8080 first
#    (run .\run.cmd in your todo-app folder)

# 3. Start the dev server
npm start
# → App opens at http://localhost:4200
```

> All `/api/*` requests are automatically proxied to `localhost:8080` — no CORS issues.

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Angular | 19.2 | Framework |
| NgRx Signals | 19.0 | State management |
| TypeScript | 5.7 | Type safety |
| RxJS | 7.8 | Async in the store |
| SCSS | — | Styling + CSS variables |
| Angular CLI | 19.2 | Build tooling |

---

## Project Structure

```
src/app/
├── core/
│   ├── models/
│   │   └── todo.model.ts          # TypeScript interfaces (Todo, PagedResponse, etc.)
│   └── services/
│       └── todo.service.ts        # HTTP calls — thin wrapper over the REST API
│
├── features/
│   └── todos/
│       ├── store/
│       │   └── todo.store.ts      # ★ NgRx Signal Store — all state lives here
│       └── components/
│           ├── todo-list/         # Main page container
│           ├── todo-card/         # Single task row
│           ├── todo-form/         # Create / edit modal
│           ├── todo-filters/      # Search + filter bar
│           └── todo-stats/        # 4 stat cards at the top
│
├── app.component.ts               # Root shell + dark/light theme toggle
├── app.config.ts                  # Angular providers (HttpClient, Router, etc.)
└── main.ts                        # Bootstrap entry point
```

---

## NgRx Signal Store — Core Concepts

The Signal Store is the heart of the app. It replaces Redux's actions/reducers/effects boilerplate with a clean, signal-based API in a single file.

### Store Structure

```typescript
export const TodoStore = signalStore(
  { providedIn: 'root' },    // singleton service, inject anywhere

  withState(initialState),   // every property becomes a signal
  withComputed((store) => ({ /* derived/memoized signals */ })),
  withProps(() => ({ todoService: inject(TodoService) })),
  withMethods((store) => ({ /* actions + async effects */ })),
);
```

### withState — Reactive State

Each property in `withState` automatically becomes a **signal** you read with `()`:

```typescript
withState({
  todos: [],        // → store.todos()
  loading: false,   // → store.loading()
  selectedIds: [],  // → store.selectedIds()
  filter: { ... },  // → store.filter()
})
```

Angular re-renders only the components that read a signal that changed. No manual `markForCheck()` needed.

To update state, use `patchState` — it merges partial updates:

```typescript
patchState(store, { loading: true });
patchState(store, { todos: page.content, loading: false });
```

### withComputed — Derived Signals (Memoized)

Computed signals recalculate **only when their dependencies change**, like a spreadsheet formula:

```typescript
withComputed((store) => ({
  completionPercent: computed(() => {
    const total = store.stats().total;
    return total === 0 ? 0 : Math.round((store.stats().completed / total) * 100);
  }),
  isEmpty: computed(() => !store.loading() && store.todos().length === 0),
  hasSelection: computed(() => store.selectedIds().length > 0),
  allSelected: computed(() =>
    store.todos().length > 0 && store.selectedIds().length === store.todos().length
  ),
}))
```

### withMethods — Actions

Two kinds of methods live here:

**1. Synchronous — use `patchState` directly:**
```typescript
toggleSelection(id: number): void {
  const current = store.selectedIds();
  const updated = current.includes(id)
    ? current.filter(sid => sid !== id)
    : [...current, id];
  patchState(store, { selectedIds: updated });
},
```

**2. Async HTTP — use `rxMethod`:**
```typescript
loadTodos: rxMethod<TodoFilter>(
  pipe(
    tap(() => patchState(store, { loading: true })),
    debounceTime(150),          // wait 150ms before firing
    switchMap((filter) =>       // cancel previous request if filter changes
      todoService.getAll(filter).pipe(
        tapResponse({
          next: (page) => patchState(store, { todos: page.content, loading: false }),
          error: (err: Error) => patchState(store, { error: err.message, loading: false }),
        })
      )
    )
  )
),
```

**Why `rxMethod` instead of `async/await`?**
- `switchMap` automatically cancels stale HTTP requests (race-condition safe)
- Subscriptions are cleaned up automatically when the store is destroyed
- `debounceTime` prevents hammering the API on rapid filter changes
- `tapResponse` always handles both success and error paths

---

## Component Patterns

### Standalone Components (no NgModules)

Every component is standalone — Angular 19 fully embraces this model:

```typescript
@Component({
  selector: 'app-todo-card',
  standalone: true,
  imports: [FormsModule],                          // import only what you need
  changeDetection: ChangeDetectionStrategy.OnPush, // only re-render when signals change
})
```

`OnPush` + signals = near-zero unnecessary renders.

### Injecting the Store

```typescript
export class TodoListComponent {
  protected readonly store = inject(TodoStore); // inject() instead of constructor
}
```

In the template, just call signals as functions:
```html
@if (store.loading()) { ... }
@for (todo of store.todos(); track todo.id) { ... }
{{ store.completionPercent() }}%
```

### Input Signals (Angular 19)

```typescript
// Modern signal-based input — replaces @Input() decorator
readonly todo = input.required<Todo>();

// Computed from that input
protected isSelected = computed(() =>
  this.store.selectedIds().includes(this.todo().id)
);
```

### Built-in Control Flow

Angular 19 uses `@if` / `@for` / `@else` instead of `*ngIf` and `*ngFor`:

```html
@if (store.loading()) {
  <div class="skeleton"></div>
} @else if (store.isEmpty()) {
  <div class="empty-state">No tasks yet</div>
} @else {
  @for (todo of store.todos(); track todo.id) {
    <app-todo-card [todo]="todo" />
  }
}
```

`track todo.id` tells Angular how to identity items — enables efficient DOM patching instead of re-rendering the whole list.

---

## Features

| Feature | How to use |
|---|---|
| Create task | "New Task" button → modal form |
| Edit task | ✏️ icon on a card → same modal pre-filled |
| Delete task | 🗑️ icon on a card |
| Toggle complete | ⭕/✅ button on a card |
| Bulk complete | Check multiple cards → "Complete X selected" |
| Select all | Indeterminate checkbox in the select bar |
| Filter by status | All / Active / Done filter buttons |
| Filter by priority | Any / High / Med / Low filter buttons |
| Search | Debounced search box (400ms) |
| Sort | Dropdown: newest, updated, title, priority |
| Pagination | Page buttons at the bottom |
| Stats | Live stat cards with animated progress bar |
| Dark / Light theme | 🌙 / ☀️ toggle in the nav (saved to localStorage) |
| Skeleton loading | Shimmer placeholders while fetching |
| Error handling | Dismissable error banner |

---

## API Mapping

| UI Action | HTTP Call |
|---|---|
| Load todo list | `GET /api/v1/todos?page=&size=&sortBy=&direction=&completed=&priority=` |
| Search | `GET /api/v1/todos/search?q=` |
| Stats cards | `GET /api/v1/todos/stats` |
| Create task | `POST /api/v1/todos` |
| Edit task (full replace) | `PUT /api/v1/todos/{id}` |
| Toggle / partial edit | `PATCH /api/v1/todos/{id}` |
| Delete task | `DELETE /api/v1/todos/{id}` |
| Bulk complete | `POST /api/v1/todos/bulk-complete` |

---

## Proxy Configuration

`proxy.conf.json` tells the Angular dev server to forward API requests to Spring Boot:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

When your code calls `/api/v1/todos`, the dev server rewrites it to `http://localhost:8080/api/v1/todos`. In production, configure Nginx or Apache to do the same, or serve the Angular build directly from Spring Boot's `static/` folder.

---

## Theme System

Themes are driven by a `data-theme` attribute on the root element and CSS custom properties:

```scss
[data-theme="dark"]  { --bg: #0d0f14; --card-bg: #161a23; ... }
[data-theme="light"] { --bg: #f4f6fb; --card-bg: #ffffff; ... }
```

`AppComponent` toggles the attribute and persists the choice to `localStorage`. Every component automatically gets the right colors without any extra work.

---

## Build for Production

```bash
npm run build:prod
# Output → dist/todo-frontend/
```

To serve from Spring Boot, copy the contents of `dist/todo-frontend/browser/` into `src/main/resources/static/` and rebuild the JAR. Spring Boot will serve the Angular app alongside the API.

---

## Angular 19 Best Practices Applied

- ✅ Standalone components — no NgModules anywhere
- ✅ `OnPush` change detection on every component
- ✅ NgRx Signal Store — replaces services-with-subjects entirely
- ✅ `input()` signal API instead of `@Input()` decorator
- ✅ `inject()` function instead of constructor injection
- ✅ `@if` / `@for` built-in control flow
- ✅ `rxMethod` for HTTP — auto subscription cleanup + race-condition safety
- ✅ `tapResponse` for safe error handling in async methods
- ✅ `debounceTime` + `switchMap` for search
- ✅ `computed()` signals for all derived state
- ✅ `track` in `@for` loops for efficient DOM reconciliation
- ✅ Proxy config — no CORS configuration needed