import { useEffect } from 'react';
import { useUIStore, Notification as Notif } from '@/store/uiStore';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
};

const colorMap = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
};

function NotificationItem({ notif }: { notif: Notif }) {
  const { removeNotification } = useUIStore();
  const Icon = iconMap[notif.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotification(notif.id);
    }, notif.duration || 5000);
    return () => clearTimeout(timer);
  }, [notif.id, notif.duration, removeNotification]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colorMap[notif.type]}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium">{notif.message}</p>
      <button
        onClick={() => removeNotification(notif.id)}
        className="ml-auto shrink-0"
      >
        <XCircleIcon className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}

export default function NotificationContainer() {
  const { notifications } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notif) => (
        <NotificationItem key={notif.id} notif={notif} />
      ))}
    </div>
  );
}
