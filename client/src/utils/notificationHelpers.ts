export function resolveNotificationLink(notif: any): string {
  if (!notif) return '/';
  const type = (notif.type || '').toLowerCase();
  const rawLink = typeof notif.link === 'string' ? notif.link.trim() : '';
  const title = (notif.title || '').toLowerCase();

  // 1. If explicit link exists, sanitize/normalize legacy paths
  if (rawLink) {
    if (rawLink === '/mentorship' || rawLink.startsWith('/mentorship?')) {
      return '/connections?tab=received';
    }
    if (rawLink === '/network' || rawLink.startsWith('/network?')) {
      return '/connections';
    }
    if (rawLink === '/forum' || rawLink.startsWith('/forum?')) {
      return '/community';
    }
    // If it's an announcement notification that had generic '/'
    if ((type === 'announcement' || title.includes('announcement')) && rawLink === '/') {
      return '/announcements';
    }
    return rawLink;
  }

  // 2. If survey_id exists
  if (notif.survey_id) {
    return `/surveys/${notif.survey_id}`;
  }

  // 3. Fallbacks based on notification type
  switch (type) {
    case 'post':
      return '/';
    case 'survey':
      return '/tracer-survey';
    case 'job':
      return '/jobs';
    case 'application':
      return '/jobs?tab=applications';
    case 'mentorship':
    case 'connection':
      return '/connections?tab=received';
    case 'announcement':
      return '/announcements';
    case 'event':
      return '/events';
    case 'group_mention':
    case 'message':
      return rawLink || '/';
    case 'security':
    case 'system':
      return '/notifications';
    default:
      break;
  }

  // 4. Fallbacks based on title keywords
  if (title.includes('connection') || title.includes('request') || title.includes('mentor')) {
    return '/connections?tab=received';
  }
  if (title.includes('job') || title.includes('hiring') || title.includes('vacancy')) {
    return '/jobs';
  }
  if (title.includes('application')) {
    return '/jobs?tab=applications';
  }
  if (title.includes('survey')) {
    return '/tracer-survey';
  }
  if (title.includes('announcement')) {
    return '/announcements';
  }
  if (title.includes('event')) {
    return '/events';
  }
  if (title.includes('post') || title.includes('comment') || title.includes('reaction') || title.includes('replied')) {
    return '/';
  }

  return '/';
}

export function getNotificationActionLabel(type?: string): string {
  switch ((type || '').toLowerCase()) {
    case 'post':
      return 'View Post →';
    case 'survey':
      return 'Take Survey →';
    case 'job':
      return 'View Job →';
    case 'application':
      return 'View Application →';
    case 'mentorship':
    case 'connection':
      return 'View Request →';
    case 'announcement':
      return 'Read Announcement →';
    case 'event':
      return 'View Event →';
    case 'group_mention':
    case 'message':
      return 'Open Chat →';
    default:
      return 'View Details →';
  }
}

