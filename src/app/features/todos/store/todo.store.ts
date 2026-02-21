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
import { PagedResponse, Todo, TodoFilter, TodoStats } from '../../../core/models/todo.model';
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
    _svc: inject(TodoService),
  })),

  // ── Methods ──────────────────────────────────────────────────────────────────
  withMethods((store) => {

    // Private closures — reusable logic shared across methods
    const svc = store._svc;

    const todosQuery = (filter: TodoFilter) =>
      filter.search
        ? svc.search(filter.search, filter.page, filter.size)
        : svc.getAll(filter);

    const setTodosPage = (page: PagedResponse<Todo>) =>
      patchState(store, {
        todos: page.content,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        loading: false,
      });

    return {

      // ── Load todos ────────────────────────────────────────────────────────
      loadTodos: rxMethod<TodoFilter>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          debounceTime(150),
          switchMap((filter) =>
            todosQuery(filter).pipe(
              tapResponse({
                next: setTodosPage,
                error: (err: Error) => patchState(store, { error: err.message, loading: false }),
              }),
            ),
          ),
        ),
      ),

      // ── Load stats ────────────────────────────────────────────────────────
      loadStats: rxMethod<void>(
        pipe(
          switchMap(() =>
            svc.getStats().pipe(
              tapResponse({
                next: (stats: TodoStats) => patchState(store, { stats }),
                error: () => {},
              }),
            ),
          ),
        ),
      ),

      // ── Create ────────────────────────────────────────────────────────────
      createTodo: rxMethod<{ title: string; description?: string | null; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }>(
        pipe(
          tap(() => patchState(store, { saving: true, error: null })),
          switchMap((request) =>
            svc.create(request).pipe(
              tapResponse({
                next: (todo: Todo) => patchState(store, {
                  todos: [todo, ...store.todos()],
                  totalElements: store.totalElements() + 1,
                  saving: false,
                  showForm: false,
                }),
                error: (err: Error) => patchState(store, { error: err.message, saving: false }),
              }),
            ),
          ),
        ),
      ),

      // ── Patch (partial update) ────────────────────────────────────────────
      patchTodo: rxMethod<{ id: number; changes: Partial<Pick<Todo, 'title' | 'description' | 'completed' | 'priority'>> }>(
        pipe(
          switchMap(({ id, changes }) =>
            svc.patch(id, changes).pipe(
              tapResponse({
                next: (updated: Todo) => patchState(store, {
                  todos: store.todos().map((t) => (t.id === updated.id ? updated : t)),
                  editingTodo: null,
                  saving: false,
                }),
                error: (err: Error) => patchState(store, { error: err.message, saving: false }),
              }),
            ),
          ),
        ),
      ),

      // ── Toggle complete ───────────────────────────────────────────────────
      toggleComplete: rxMethod<Todo>(
        pipe(
          switchMap((todo) =>
            svc.patch(todo.id, { completed: !todo.completed }).pipe(
              tapResponse({
                next: (updated: Todo) => patchState(store, {
                  todos: store.todos().map((t) => (t.id === updated.id ? updated : t)),
                }),
                error: (err: Error) => patchState(store, { error: err.message }),
              }),
            ),
          ),
        ),
      ),

      // ── Delete ────────────────────────────────────────────────────────────
      deleteTodo: rxMethod<number>(
        pipe(
          switchMap((id) =>
            svc.delete(id).pipe(
              tapResponse({
                next: () => patchState(store, {
                  todos: store.todos().filter((t) => t.id !== id),
                  selectedIds: store.selectedIds().filter((sid) => sid !== id),
                  totalElements: store.totalElements() - 1,
                }),
                error: (err: Error) => patchState(store, { error: err.message }),
              }),
            ),
          ),
        ),
      ),

      // ── Bulk complete ─────────────────────────────────────────────────────
      bulkComplete: rxMethod<void>(
        pipe(
          switchMap(() =>
            svc.bulkComplete(store.selectedIds()).pipe(
              tapResponse({
                next: () => patchState(store, {
                  todos: store.todos().map((t) =>
                    store.selectedIds().includes(t.id) ? { ...t, completed: true } : t,
                  ),
                  selectedIds: [],
                }),
                error: (err: Error) => patchState(store, { error: err.message }),
              }),
            ),
          ),
        ),
      ),

      // ── Set filter (status / priority / sort) ─────────────────────────────
      setFilter: rxMethod<Partial<TodoFilter>>(
        pipe(
          tap((partial) => patchState(store, {
            filter: { ...store.filter(), ...partial, page: 0 },
            selectedIds: [],
            loading: true,
          })),
          switchMap(() =>
            todosQuery(store.filter()).pipe(
              tapResponse({
                next: setTodosPage,
                error: (err: Error) => patchState(store, { error: err.message, loading: false }),
              }),
            ),
          ),
        ),
      ),

      // ── Search (debounced) ────────────────────────────────────────────────
      setSearch: rxMethod<string>(
        pipe(
          debounceTime(400),
          distinctUntilChanged(),
          tap((search) => patchState(store, {
            filter: { ...store.filter(), search: search || undefined, page: 0 },
            loading: true,
          })),
          switchMap(() =>
            todosQuery(store.filter()).pipe(
              tapResponse({
                next: setTodosPage,
                error: (err: Error) => patchState(store, { error: err.message, loading: false }),
              }),
            ),
          ),
        ),
      ),

      // ── Pagination ────────────────────────────────────────────────────────
      goToPage: rxMethod<number>(
        pipe(
          tap((page) => patchState(store, {
            filter: { ...store.filter(), page },
            loading: true,
          })),
          switchMap(() =>
            todosQuery(store.filter()).pipe(
              tapResponse({
                next: setTodosPage,
                error: (err: Error) => patchState(store, { error: err.message, loading: false }),
              }),
            ),
          ),
        ),
      ),

      // ── Selection ─────────────────────────────────────────────────────────
      toggleSelection(id: number): void {
        const ids = store.selectedIds();
        patchState(store, {
          selectedIds: ids.includes(id) ? ids.filter((s) => s !== id) : [...ids, id],
        });
      },

      toggleSelectAll(): void {
        patchState(store, {
          selectedIds: store.allSelected() ? [] : store.todos().map((t) => t.id),
        });
      },

      clearSelection(): void {
        patchState(store, { selectedIds: [] });
      },

      // ── UI state ──────────────────────────────────────────────────────────
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

      // ── Bootstrap ─────────────────────────────────────────────────────────
      initialize: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap(() =>
            todosQuery(store.filter()).pipe(
              tapResponse({
                next: setTodosPage,
                error: (err: Error) => patchState(store, { error: err.message, loading: false }),
              }),
            ),
          ),
        ),
      ),

    };
  }),
);