export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
}

export interface CreateTodoRequest {
  title: string;
  description?: string | null;
  priority?: Priority;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: Priority;
}

export interface TodoFilter {
  completed?: boolean;
  priority?: Priority;
  search?: string;
  page: number;
  size: number;
  sortBy: string;
  direction: 'ASC' | 'DESC';
}
