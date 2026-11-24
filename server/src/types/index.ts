import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'staff' | 'alumni' | 'alumni_officer' | 'registrar';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
  token?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
