export function resolveNotificationLink(notif: any, userRole?: string): string {
  if (!notif) return userRole === 'admin' ? '/admin' : '/';
  const type = (notif.type || '').toLowerCase();
  const rawLink = typeof notif.link === 'string' ? notif.link.trim() : '';
  const title = (notif.title || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  // 1. If explicit link exists
  if (rawLink) {
    if (isAdmin) {
      if (rawLink === '/tracer-survey' || rawLink === '/surveys' || rawLink.startsWith('/surveys/')) {
        return '/admin/surveys';
      }
      if (rawLink === '/jobs' || rawLink.startsWith('/jobs?')) {
        return '/admin/jobs';
      }
      if (rawLink === '/directory' || rawLink.startsWith('/directory/')) {
        return '/admin/alumni';
      }
      if (rawLink === '/announcements') {
        return '/admin/announcements';
      }
      if (rawLink === '/events') {
        return '/admin/events';
      }
      return rawLink;
    }

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
    return isAdmin ? '/admin/surveys' : `/surveys/${notif.survey_id}`;
  }

  // 3. Fallbacks based on notification type for admin vs alumni
  if (isAdmin) {
    switch (type) {
      case 'alumni':
      case 'registration':
      case 'verification':
        return '/admin/alumni';
      case 'survey':
      case 'survey_response':
        return '/admin/surveys';
      case 'job':
      case 'application':
      case 'job_application':
        return '/admin/jobs';
      case 'employment':
      case 'career':
        return '/admin/alumni';
      case 'security':
      case 'incident':
      case 'moderation':
        return '/admin/activity';
      case 'company':
        return '/admin/companies';
      case 'announcement':
        return '/admin/announcements';
      case 'event':
        return '/admin/events';
      case 'analytics':
        return '/admin/analytics';
      case 'system':
      case 'settings':
        return '/admin/settings';
      default:
        break;
    }
  } else {
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
  }

  // 4. Fallbacks based on title keywords
  if (isAdmin) {
    if (title.includes('survey')) return '/admin/surveys';
    if (title.includes('job') || title.includes('application')) return '/admin/jobs';
    if (title.includes('security') || title.includes('incident') || title.includes('moderation') || title.includes('report')) return '/admin/activity';
    if (title.includes('alumni') || title.includes('register') || title.includes('employment') || title.includes('career')) return '/admin/alumni';
    if (title.includes('company')) return '/admin/companies';
    if (title.includes('announcement')) return '/admin/announcements';
    if (title.includes('event')) return '/admin/events';
    return '/admin/notifications';
  }

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

export function getNotificationActionLabel(type?: string, userRole?: string): string {
  const t = (type || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  if (isAdmin) {
    switch (t) {
      case 'alumni':
      case 'registration':
        return 'Review Alumni →';
      case 'survey':
      case 'survey_response':
        return 'View Survey Responses →';
      case 'application':
      case 'job_application':
        return 'Review Application →';
      case 'job':
        return 'Manage Job Postings →';
      case 'employment':
      case 'career':
        return 'View Alumni Career →';
      case 'security':
      case 'incident':
        return 'Inspect Security →';
      case 'moderation':
        return 'Review Report →';
      case 'company':
        return 'View Partner Companies →';
      case 'announcement':
        return 'Manage Announcements →';
      case 'event':
        return 'Manage Events →';
      case 'system':
        return 'System Settings →';
      default:
        return 'Inspect Details →';
    }
  }

  switch (t) {
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
