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
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { catchError, EMPTY } from 'rxjs';
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

    // Private helpers (not exposed on store, just closures)
    const refreshStats = () =>
      store._svc.getStats().pipe(catchError(() => EMPTY)).subscribe(
        (stats: TodoStats) => patchState(store, { stats }),
      );

    const fetchTodos = (filter: TodoFilter) => {
      const obs = filter.search
        ? store._svc.search(filter.search, filter.page, filter.size)
        : store._svc.getAll(filter);
      return obs;
    };

    return {

      // ── Load todos (reactive to filter) ───────────────────────────────────
      loadTodos: rxMethod<TodoFilter>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          debounceTime(150),
          switchMap((filter) =>
            fetchTodos(filter).pipe(
              tap((page: PagedResponse<Todo>) =>
                patchState(store, {
                  todos: page.content,
                  totalElements: page.totalElements,
                  totalPages: page.totalPages,
                  loading: false,
                }),
              ),
              catchError((err: Error) => {
                patchState(store, { error: err.message, loading: false });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // ── Load stats ────────────────────────────────────────────────────────
      loadStats: rxMethod<void>(
        pipe(
          switchMap(() =>
            store._svc.getStats().pipe(
              tap((stats: TodoStats) => patchState(store, { stats })),
              catchError(() => EMPTY),
            ),
          ),
        ),
      ),

      // ── Create ────────────────────────────────────────────────────────────
      createTodo: rxMethod<{ title: string; description?: string | null; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }>(
        pipe(
          tap(() => patchState(store, { saving: true, error: null })),
          switchMap((request) =>
            store._svc.create(request).pipe(
              tap((todo: Todo) => {
                patchState(store, {
                  todos: [todo, ...store.todos()],
                  saving: false,
                  showForm: false,
                  totalElements: store.totalElements() + 1,
                });
                refreshStats();
              }),
              catchError((err: Error) => {
                patchState(store, { error: err.message, saving: false });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // ── Patch (partial update) ────────────────────────────────────────────
      patchTodo: rxMethod<{ id: number; changes: Partial<Pick<Todo, 'title' | 'description' | 'completed' | 'priority'>> }>(
        pipe(
          switchMap(({ id, changes }) =>
            store._svc.patch(id, changes).pipe(
              tap((updated: Todo) => {
                patchState(store, {
                  todos: store.todos().map((t) => (t.id === updated.id ? updated : t)),
                  editingTodo: null,
                  saving: false,
                });
                refreshStats();
              }),
              catchError((err: Error) => {
                patchState(store, { error: err.message, saving: false });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // ── Toggle complete ───────────────────────────────────────────────────
      toggleComplete(todo: Todo): void {
        store._svc.patch(todo.id, { completed: !todo.completed }).pipe(
          catchError(() => EMPTY),
        ).subscribe((updated: Todo) => {
          patchState(store, {
            todos: store.todos().map((t) => (t.id === updated.id ? updated : t)),
          });
          refreshStats();
        });
      },

      // ── Delete ────────────────────────────────────────────────────────────
      deleteTodo: rxMethod<number>(
        pipe(
          switchMap((id) =>
            store._svc.delete(id).pipe(
              tap(() => {
                patchState(store, {
                  todos: store.todos().filter((t) => t.id !== id),
                  selectedIds: store.selectedIds().filter((sid) => sid !== id),
                  totalElements: store.totalElements() - 1,
                });
                refreshStats();
              }),
              catchError((err: Error) => {
                patchState(store, { error: err.message });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // ── Bulk complete ─────────────────────────────────────────────────────
      bulkComplete: rxMethod<void>(
        pipe(
          switchMap(() =>
            store._svc.bulkComplete(store.selectedIds()).pipe(
              tap(() => {
                const ids = store.selectedIds();
                patchState(store, {
                  todos: store.todos().map((t) =>
                    ids.includes(t.id) ? { ...t, completed: true } : t,
                  ),
                  selectedIds: [],
                });
                refreshStats();
              }),
              catchError((err: Error) => {
                patchState(store, { error: err.message });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // ── Filter methods ────────────────────────────────────────────────────
      setFilter(partial: Partial<TodoFilter>): void {
        const updated = { ...store.filter(), ...partial, page: 0 };
        patchState(store, { filter: updated, selectedIds: [] });
        // Trigger load via rxMethod by calling it directly
        store._svc.getAll(updated).pipe(
          catchError(() => EMPTY),
        ).subscribe((page: PagedResponse<Todo>) => {
          patchState(store, {
            todos: page.content,
            totalElements: page.totalElements,
            totalPages: page.totalPages,
          });
        });
      },

      setSearch: rxMethod<string>(
        pipe(
          debounceTime(400),
          distinctUntilChanged(),
          tap((search: string) => {
            const updated = { ...store.filter(), search: search || undefined, page: 0 };
            patchState(store, { filter: updated, loading: true });
            const obs = search
              ? store._svc.search(search, 0, store.filter().size)
              : store._svc.getAll(updated);
            obs.pipe(catchError(() => EMPTY)).subscribe((page: PagedResponse<Todo>) => {
              patchState(store, {
                todos: page.content,
                totalElements: page.totalElements,
                totalPages: page.totalPages,
                loading: false,
              });
            });
          }),
        ),
      ),

      goToPage(page: number): void {
        const updated = { ...store.filter(), page };
        patchState(store, { filter: updated, loading: true });
        fetchTodos(updated).pipe(catchError(() => EMPTY)).subscribe((p: PagedResponse<Todo>) => {
          patchState(store, {
            todos: p.content,
            totalElements: p.totalElements,
            totalPages: p.totalPages,
            loading: false,
          });
        });
      },

      // ── Selection ─────────────────────────────────────────────────────────
      toggleSelection(id: number): void {
        const current = store.selectedIds();
        const updated = current.includes(id)
          ? current.filter((sid) => sid !== id)
          : [...current, id];
        patchState(store, { selectedIds: updated });
      },

      toggleSelectAll(): void {
        const allIds = store.todos().map((t) => t.id);
        patchState(store, { selectedIds: store.allSelected() ? [] : allIds });
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
      initialize(): void {
        const filter = store.filter();
        patchState(store, { loading: true });
        fetchTodos(filter).pipe(catchError(() => EMPTY)).subscribe((page: PagedResponse<Todo>) => {
          patchState(store, {
            todos: page.content,
            totalElements: page.totalElements,
            totalPages: page.totalPages,
            loading: false,
          });
        });
        refreshStats();
      },
    };
  }),
);