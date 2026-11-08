/**
 * Error Mapping & UX Resilience Architecture
 * Translates low-level technical exceptions, network drops, and raw API errors
 * into clear, actionable, user-friendly messages for alumni and administrators.
 */

export interface MappedError {
  title: string;
  message: string;
  actionText?: string;
  category: 'network' | 'auth' | 'permission' | 'notFound' | 'conflict' | 'fileSize' | 'validation' | 'server' | 'unknown';
  isRetryable: boolean;
}

export function mapErrorToUserFriendly(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): MappedError {
  if (!error) {
    return {
      title: 'Unexpected Error',
      message: fallbackMessage,
      actionText: 'Retry',
      category: 'unknown',
      isRetryable: true,
    };
  }

  const rawMessage = typeof error === 'string'
    ? error
    : (error as any)?.message || (error as any)?.error || '';
  
  const status = (error as any)?.status || (error as any)?.statusCode;
  const msgLower = String(rawMessage).toLowerCase();

  // 1. Network Drops & Connectivity Errors
  if (
    msgLower.includes('failed to fetch') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('load failed') ||
    msgLower.includes('net::err_') ||
    msgLower.includes('timeout') ||
    !navigator.onLine
  ) {
    return {
      title: 'Connection Lost',
      message: 'Unable to reach the CTU-Naga servers. Please check your internet connection and try again.',
      actionText: 'Retry Connection',
      category: 'network',
      isRetryable: true,
    };
  }

  // 2. Authentication & Session Expiration (401)
  if (status === 401 || msgLower.includes('jwt expired') || msgLower.includes('unauthorized') || msgLower.includes('token expired')) {
    return {
      title: 'Session Expired',
      message: 'Your session has timed out for your account security. Please sign in again to continue.',
      actionText: 'Sign In Again',
      category: 'auth',
      isRetryable: false,
    };
  }

  // 3. Permission & Access Control (403)
  if (status === 403 || msgLower.includes('forbidden') || msgLower.includes('permission denied') || msgLower.includes('unauthorized access')) {
    return {
      title: 'Access Restricted',
      message: 'You do not have administrative permission to view or modify this record.',
      actionText: 'Return to Dashboard',
      category: 'permission',
      isRetryable: false,
    };
  }

  // 4. File Size & Storage Limits (413)
  if (
    status === 413 ||
    msgLower.includes('too large') ||
    msgLower.includes('limit_file_size') ||
    msgLower.includes('payloadtoolarge') ||
    msgLower.includes('413')
  ) {
    return {
      title: 'File Too Large',
      message: 'The file you attached exceeds our maximum upload limit of 10MB. Please compress the document or choose a smaller file.',
      actionText: 'Choose Smaller File',
      category: 'fileSize',
      isRetryable: true,
    };
  }

  // 5. Not Found (404)
  if (status === 404 || msgLower.includes('not found')) {
    return {
      title: 'Record Not Found',
      message: 'The requested job posting, alumni profile, or document may have been deleted or moved.',
      actionText: 'Go Back',
      category: 'notFound',
      isRetryable: false,
    };
  }

  // 6. Conflicts / Duplicate Records (409)
  if (
    status === 409 ||
    msgLower.includes('duplicate key') ||
    msgLower.includes('already exists') ||
    msgLower.includes('23505') ||
    msgLower.includes('already registered')
  ) {
    return {
      title: 'Already Exists',
      message: 'A record with this information (e.g. Student ID or Email) already exists in the system.',
      actionText: 'Check Existing Record',
      category: 'conflict',
      isRetryable: false,
    };
  }

  // 7. Rate Limiting (429)
  if (status === 429 || msgLower.includes('too many requests') || msgLower.includes('rate limit')) {
    return {
      title: 'Too Many Attempts',
      message: 'You have made too many requests in a short period. Please wait a minute before trying again.',
      actionText: 'Wait & Retry',
      category: 'validation',
      isRetryable: true,
    };
  }

  // 8. Database Internals / Foreign Key & Embedding Errors
  if (
    msgLower.includes('foreign key') ||
    msgLower.includes('could not embed') ||
    msgLower.includes('pgrst') ||
    msgLower.includes('relation') ||
    msgLower.includes('syntax error')
  ) {
    return {
      title: 'Sync Error',
      message: 'We encountered a momentary database sync issue. Our administrators have been logged of the event. Please refresh the page.',
      actionText: 'Refresh Page',
      category: 'server',
      isRetryable: true,
    };
  }

  // 9. Server 500s
  if (status >= 500) {
    return {
      title: 'Service Temporarily Unavailable',
      message: 'The server encountered an unexpected situation. Please try again shortly.',
      actionText: 'Try Again',
      category: 'server',
      isRetryable: true,
    };
  }

  // Fallback for user-facing validation messages
  return {
    title: 'Action Needed',
    message: rawMessage || fallbackMessage,
    actionText: 'Try Again',
    category: 'unknown',
    isRetryable: true,
  };
}

/**
 * Convenience helper returning just the human-friendly string message.
 */
export function getHumanErrorMessage(error: unknown, fallbackMessage?: string): string {
  return mapErrorToUserFriendly(error, fallbackMessage).message;
}

