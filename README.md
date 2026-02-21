# TaskFlow — Angular 19 Frontend

A modern, production-grade Todo frontend application built with **Angular 19** and **NgRx Signal Store**, connected to your Spring Boot REST API.

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Angular | 19.2 | Framework (standalone components, signals) |
| NgRx Signals | 19.0 | Signal Store for state management |
| TypeScript | 5.7 | Type safety |
| RxJS | 7.8 | Async operations inside the store |
| SCSS | — | Styling with CSS custom properties |
| Angular CLI | 19.2 | Build tooling |

---

## Quick Start

```bash
# 1. Go into the project
cd todo-frontend

# 2. Install dependencies
npm install

# 3. Make sure your Spring Boot backend is running on :8080
# .\run.cmd   (in your todo-app folder)

# 4. Start the Angular dev server
npm start
# → App opens at http://localhost:4200
```

The `--proxy-config proxy.conf.json` flag in the start script forwards all `/api/*` requests from port 4200 to your Spring Boot server at `localhost:8080`, avoiding CORS issues entirely.

---

## Project Structure

```
src/app/
├── core/
│   ├── models/
│   │   └── todo.model.ts          # TypeScript interfaces for all API types
│   └── services/
│       └── todo.service.ts        # HTTP service — thin wrapper over the REST API
│
├── features/
│   └── todos/
│       ├── store/
│       │   └── todo.store.ts      # ★ NgRx Signal Store — all state lives here
│       └── components/
│           ├── todo-list/         # Main page container
│           ├── todo-card/         # Single task card (input signals)
│           ├── todo-form/         # Create/edit modal
│           ├── todo-filters/      # Search + filter bar
│           └── todo-stats/        # Stats summary cards
│
└── app.component.ts               # Root shell with theme toggle
```

---

## NgRx Signal Store — Explained

This is the core architectural concept. The store replaces Redux boilerplate with a clean, signal-based API.

### What is a Signal Store?

```typescript
export const TodoStore = signalStore(
  { providedIn: 'root' },   // Injectable as a singleton service

  withState(initialState),   // State becomes individual signals
  withComputed((store) => ({ /* derived signals */ })),
  withProps(() => ({ /* injected services */ })),
  withMethods((store) => ({ /* actions + side effects */ })),
);
```

Every piece of state automatically becomes a **signal** you can read in templates:
```typescript
store.todos()          // Signal<Todo[]>
store.loading()        // Signal<boolean>
store.stats()          // Signal<TodoStats>
store.completionPercent() // computed Signal<number>
```

### withState — Reactive State

```typescript
withState({
  todos: [],
  loading: false,
  filter: { page: 0, size: 10, ... },
  selectedIds: [],
  // ...
})
```

Angular automatically re-renders only the components that read a signal that changed. No manual `markForCheck()` needed.

### withComputed — Derived Signals

Computed signals are memoized — they only recalculate when their dependencies change:

```typescript
withComputed((store) => ({
  completionPercent: computed(() =>
    store.stats().total === 0 ? 0
    : Math.round((store.stats().completed / store.stats().total) * 100)
  ),
  isEmpty: computed(() => !store.loading() && store.todos().length === 0),
}))
```

### withMethods — Actions

Methods are how you change state. Simple mutations use `patchState`:

```typescript
toggleComplete(todo: Todo): void {
  store.patchTodo({ id: todo.id, changes: { completed: !todo.completed } });
}
```

### rxMethod — Async Operations

For HTTP calls, `rxMethod` bridges RxJS into the signal world. It handles subscriptions automatically:

```typescript
loadTodos: rxMethod<TodoFilter>(
  pipe(
    tap(() => patchState(store, { loading: true })),
    debounceTime(150),
    switchMap((filter) =>
      todoService.getAll(filter).pipe(
        tapResponse({
          next: (page) => patchState(store, { todos: page.content, loading: false }),
          error: (err) => patchState(store, { error: err.message, loading: false }),
        })
      )
    )
  )
)
```

Key points:
- `switchMap` cancels the previous request if a new filter arrives (handles race conditions)
- `debounceTime` prevents hitting the API on every keystroke
- `tapResponse` is NgRx's safe version of `tap` that always handles both success and error
- The subscription is **automatically cleaned up** when the store is destroyed

### withProps — Dependency Injection

Services are injected cleanly using `withProps`:

```typescript
withProps(() => ({
  todoService: inject(TodoService),  // injected once, reused in all methods
}))
```

---

## Component Architecture

### Standalone Components (no NgModules)

Every component is standalone — Angular 19 fully embraces this:

```typescript
@Component({
  selector: 'app-todo-card',
  standalone: true,           // no NgModule needed
  imports: [FormsModule],     // import only what you need
  changeDetection: ChangeDetectionStrategy.OnPush, // best practice
})
```

`OnPush` means Angular only re-renders a component when:
1. An `@Input` signal/reference changes
2. An event fires inside the component
3. A signal it reads changes

This gives excellent performance.

### Input Signals (Angular 19)

```typescript
// Modern way — input signals replace @Input() decorator
readonly todo = input.required<Todo>();

// In template
{{ todo().title }}
```

### Control Flow Syntax (@if, @for)

Angular 19 uses built-in control flow instead of `*ngIf` and `*ngFor`:

```html
@if (store.loading()) {
  <div class="skeleton"></div>
} @else if (store.isEmpty()) {
  <div class="empty-state">No tasks</div>
} @else {
  @for (todo of store.todos(); track todo.id) {
    <app-todo-card [todo]="todo" />
  }
}
```

`track todo.id` tells Angular how to identify items for efficient DOM updates.

---

## Features

| Feature | Where |
|---|---|
| Create task | "New Task" button → form modal |
| Edit task | ✏️ button on any card → same form modal pre-filled |
| Delete task | 🗑️ button on any card |
| Toggle complete | ⭕/✅ button on any card |
| Bulk complete | Select multiple → "Complete X selected" |
| Select all | Checkbox in the select bar |
| Filter by status | All / Active / Done buttons |
| Filter by priority | Any / High / Med / Low buttons |
| Search | Debounced 400ms search box |
| Sort | Dropdown: newest, updated, title, priority |
| Pagination | Bottom page buttons |
| Stats | 4 stat cards at the top with live progress bar |
| Dark/Light theme | 🌙/☀️ toggle in nav, persisted to localStorage |
| Skeleton loading | Animated skeletons while fetching |
| Error handling | Error banner with dismiss button |

---

## API Mapping

| UI Action | API Call |
|---|---|
| Load list | `GET /api/v1/todos?page=&size=&sortBy=&direction=&completed=&priority=` |
| Search | `GET /api/v1/todos/search?q=` |
| Load stats | `GET /api/v1/todos/stats` |
| Create | `POST /api/v1/todos` |
| Edit (full) | `PUT /api/v1/todos/{id}` |
| Toggle / partial edit | `PATCH /api/v1/todos/{id}` |
| Delete | `DELETE /api/v1/todos/{id}` |
| Bulk complete | `POST /api/v1/todos/bulk-complete` |

---

## Proxy Configuration

`proxy.conf.json` tells the Angular dev server to forward API requests:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

When you call `/api/v1/todos` from Angular, it goes to `http://localhost:8080/api/v1/todos`. In production, configure your web server (Nginx, etc.) to do the same.

---

## Theme System

Themes use CSS custom properties toggled via a `data-theme` attribute:

```scss
[data-theme="dark"]  { --bg: #0d0f14; --card-bg: #161a23; ... }
[data-theme="light"] { --bg: #f4f6fb; --card-bg: #ffffff; ... }
```

The `AppComponent` reads from `localStorage` and toggles the attribute. Every component inherits the right colors automatically.

---

## Build for Production

```bash
npm run build:prod
```

Output goes to `dist/todo-frontend/`. Serve it with any static file server or copy it into your Spring Boot `src/main/resources/static/` folder to serve the whole app from one process.

---

## Angular 19 Best Practices Used

- ✅ Standalone components everywhere (no NgModules)
- ✅ `OnPush` change detection on every component
- ✅ Signal Store for all state (no subjects/BehaviorSubjects)
- ✅ `input()` signal API instead of `@Input()` decorator
- ✅ `@if` / `@for` built-in control flow instead of structural directives
- ✅ `inject()` function instead of constructor injection
- ✅ `rxMethod` for HTTP with automatic subscription cleanup
- ✅ `tapResponse` for safe error handling in effects
- ✅ `debounceTime` + `switchMap` for search (cancels stale requests)
- ✅ `computed()` signals for derived state (memoized)
- ✅ `track` in `@for` loops for efficient DOM reconciliation
- ✅ Proxy config to avoid CORS in development
