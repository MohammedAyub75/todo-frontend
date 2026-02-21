import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateTodoRequest,
  PagedResponse,
  Todo,
  TodoFilter,
  TodoStats,
  UpdateTodoRequest,
} from '../models/todo.model';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/todos';

  getAll(filter: TodoFilter): Observable<PagedResponse<Todo>> {
    let params = new HttpParams()
      .set('page', filter.page)
      .set('size', filter.size)
      .set('sortBy', filter.sortBy)
      .set('direction', filter.direction);

    if (filter.completed !== undefined) params = params.set('completed', filter.completed);
    if (filter.priority) params = params.set('priority', filter.priority);

    return this.http.get<PagedResponse<Todo>>(this.baseUrl, { params });
  }

  search(q: string, page = 0, size = 20): Observable<PagedResponse<Todo>> {
    const params = new HttpParams().set('q', q).set('page', page).set('size', size);
    return this.http.get<PagedResponse<Todo>>(`${this.baseUrl}/search`, { params });
  }

  getById(id: number): Observable<Todo> {
    return this.http.get<Todo>(`${this.baseUrl}/${id}`);
  }

  getStats(): Observable<TodoStats> {
    return this.http.get<TodoStats>(`${this.baseUrl}/stats`);
  }

  create(request: CreateTodoRequest): Observable<Todo> {
    return this.http.post<Todo>(this.baseUrl, request);
  }

  patch(id: number, request: UpdateTodoRequest): Observable<Todo> {
    return this.http.patch<Todo>(`${this.baseUrl}/${id}`, request);
  }

  replace(id: number, request: CreateTodoRequest): Observable<Todo> {
    return this.http.put<Todo>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  bulkComplete(ids: number[]): Observable<string> {
    return this.http.post(`${this.baseUrl}/bulk-complete`, ids, { responseType: 'text' });
  }
}
