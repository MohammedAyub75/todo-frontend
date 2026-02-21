import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { Todo, TodoFilter, TodoStats } from '../../../core/models/todo.model';
import { TodoService } from '../../../core/services/todo.service';

// ── State shape ────────────────────────────────────────────────────────────────
interface TodoState {
  todos: Todo[];
  stats: TodoStats;
  filter: TodoFilter;
  totalElements: number;
  totalPages: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  selectedIds: number[];
  editingTodo: Todo | null;
  showForm: boolean;
}

const initialState: TodoState = {
  todos: [],
  stats: { total: 0, completed: 0, pending: 0 },
  filter: {
    page: 0,
    size: 10,
    sortBy: 'createdAt',
    direction: 'DESC',
  },
  totalElements: 0,
  totalPages: 0,
  loading: false,
  saving: false,
  error: null,
  selectedIds: [],
  editingTodo: null,
  showForm: false,
};

// ── Signal Store ───────────────────────────────────────────────────────────────
export const TodoStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  // ── Computed signals ─────────────────────────────────────────────────────────
  withComputed((store) => ({
    completedCount: computed(() => store.todos().filter((t) => t.completed).length),
    pendingCount: computed(() => store.todos().filter((t) => !t.completed).length),
    hasSelection: computed(() => store.selectedIds().length > 0),
    allSelected: computed(
      () => store.todos().length > 0 && store.selectedIds().length === store.todos().length,
    ),
    isEmpty: computed(() => !store.loading() && store.todos().length === 0),
    completionPercent: computed(() => {
      const total = store.stats().total;
      return total === 0 ? 0 : Math.round((store.stats().completed / total) * 100);
    }),
    isSearching: computed(() => !!store.filter().search),
    currentPage: computed(() => store.filter().page),
    hasNextPage: computed(() => store.filter().page < store.totalPages() - 1),
    hasPrevPage: computed(() => store.filter().page > 0),
  })),

  // ── Inject services ──────────────────────────────────────────────────────────
  withProps(() => ({
    todoService: inject(TodoService),
  })),

  // ── Methods ──────────────────────────────────────────────────────────────────
  withMethods((store) => ({

    // Load todos (reactive to filter changes)
    loadTodos: rxMethod<TodoFilter>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        debounceTime(150),
        switchMap((filter) => {
          const obs = filter.search
            ? store.todoService.search(filter.search, filter.page, filter.size)
            : store.todoService.getAll(filter);

          return obs.pipe(
            tapResponse({
              next: (page) =>
                patchState(store, {
                  todos: page.content,
                  totalElements: page.totalElements,
                  totalPages: page.totalPages,
                  loading: false,
                }),
              error: (err: Error) =>
                patchState(store, { error: err.message, loading: false }),
            }),
          );
        }),
      ),
    ),

    // Load stats
    loadStats: rxMethod<void>(
      pipe(
        switchMap(() =>
          store.todoService.getStats().pipe(
            tapResponse({
              next: (stats) => patchState(store, { stats }),
              error: () => {},
            }),
          ),
        ),
      ),
    ),

    // Create a new todo
    createTodo: rxMethod<{ title: string; description?: string | null; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }>(
      pipe(
        tap(() => patchState(store, { saving: true, error: null })),
        switchMap((request) =>
          store.todoService.create(request).pipe(
            tapResponse({
              next: (todo) => {
                patchState(store, {
                  todos: [todo, ...store.todos()],
                  saving: false,
                  showForm: false,
                  totalElements: store.totalElements() + 1,
                });
                store.loadStats(undefined);
              },
              error: (err: Error) =>
                patchState(store, { error: err.message, saving: false }),
            }),
          ),
        ),
      ),
    ),

    // Patch (partial update)
    patchTodo: rxMethod<{ id: number; changes: Partial<Pick<Todo, 'title' | 'description' | 'completed' | 'priority'>> }>(
      pipe(
        switchMap(({ id, changes }) =>
          store.todoService.patch(id, changes).pipe(
            tapResponse({
              next: (updated) => {
                patchState(store, {
                  todos: store.todos().map((t) => (t.id === updated.id ? updated : t)),
                  editingTodo: null,
                  saving: false,
                });
                store.loadStats(undefined);
              },
              error: (err: Error) =>
                patchState(store, { error: err.message, saving: false }),
            }),
          ),
        ),
      ),
    ),

    // Toggle completed
    toggleComplete(todo: Todo): void {
      store.patchTodo({ id: todo.id, changes: { completed: !todo.completed } });
    },

    // Delete todo
    deleteTodo: rxMethod<number>(
      pipe(
        switchMap((id) =>
          store.todoService.delete(id).pipe(
            tapResponse({
              next: () => {
                patchState(store, {
                  todos: store.todos().filter((t) => t.id !== id),
                  selectedIds: store.selectedIds().filter((sid) => sid !== id),
                  totalElements: store.totalElements() - 1,
                });
                store.loadStats(undefined);
              },
              error: (err: Error) => patchState(store, { error: err.message }),
            }),
          ),
        ),
      ),
    ),

    // Bulk complete selected
    bulkComplete: rxMethod<void>(
      pipe(
        switchMap(() =>
          store.todoService.bulkComplete(store.selectedIds()).pipe(
            tapResponse({
              next: () => {
                patchState(store, {
                  todos: store.todos().map((t) =>
                    store.selectedIds().includes(t.id) ? { ...t, completed: true } : t,
                  ),
                  selectedIds: [],
                });
                store.loadStats(undefined);
              },
              error: (err: Error) => patchState(store, { error: err.message }),
            }),
          ),
        ),
      ),
    ),

    // ── Filter/pagination methods ───────────────────────────────────────────────
    setFilter(partial: Partial<TodoFilter>): void {
      const updated = { ...store.filter(), ...partial, page: 0 };
      patchState(store, { filter: updated, selectedIds: [] });
      store.loadTodos(updated);
    },

    setSearch: rxMethod<string>(
      pipe(
        debounceTime(400),
        distinctUntilChanged(),
        tap((search) => {
          const updated = { ...store.filter(), search: search || undefined, page: 0 };
          patchState(store, { filter: updated });
          store.loadTodos(updated);
        }),
      ),
    ),

    goToPage(page: number): void {
      const updated = { ...store.filter(), page };
      patchState(store, { filter: updated });
      store.loadTodos(updated);
    },

    // ── Selection methods ──────────────────────────────────────────────────────
    toggleSelection(id: number): void {
      const current = store.selectedIds();
      const updated = current.includes(id)
        ? current.filter((sid) => sid !== id)
        : [...current, id];
      patchState(store, { selectedIds: updated });
    },

    toggleSelectAll(): void {
      const allIds = store.todos().map((t) => t.id);
      const newIds = store.allSelected() ? [] : allIds;
      patchState(store, { selectedIds: newIds });
    },

    clearSelection(): void {
      patchState(store, { selectedIds: [] });
    },

    // ── UI state methods ───────────────────────────────────────────────────────
    openCreateForm(): void {
      patchState(store, { showForm: true, editingTodo: null });
    },

    openEditForm(todo: Todo): void {
      patchState(store, { editingTodo: todo, showForm: true });
    },

    closeForm(): void {
      patchState(store, { showForm: false, editingTodo: null });
    },

    clearError(): void {
      patchState(store, { error: null });
    },

    // Bootstrap - called once on app init
    initialize(): void {
      store.loadTodos(store.filter());
      store.loadStats(undefined);
    },
  })),
);
