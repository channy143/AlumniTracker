import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'staff' | 'alumni';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
