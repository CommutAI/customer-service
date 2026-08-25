import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { StaffNotification } from '../types';
import { Bell, CreditCard, RefreshCw, AlertCircle, Info, DollarSign } from 'lucide-react';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['staffNotifications'],
    queryFn: apiCalls.getStaffNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: apiCalls.getUnreadNotificationCount,
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: apiCalls.markStaffNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: apiCalls.markAllStaffNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  const getNotificationIcon = (type: StaffNotification['type']) => {
    switch (type) {
      case 'transaction':
        return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'card_issuance':
        return <CreditCard className="w-4 h-4 text-blue-400" />;
      case 'card_replacement':
        return <RefreshCw className="w-4 h-4 text-orange-400" />;
      case 'card_reload':
        return <RefreshCw className="w-4 h-4 text-purple-400" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-white/60" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-white hover:text-orange-400 cursor-pointer transition-colors"
      >
        <Bell size={20} />
        {unreadCount && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-96 glass-card border border-white/20 rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-white/20 flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>
              {unreadCount && unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-80">
              {notifications && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-white/5' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsReadMutation.mutate(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white font-medium text-sm">{notification.title}</p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-white/70 text-sm mt-1">{notification.message}</p>
                        <p className="text-white/50 text-xs mt-2">{formatTime(notification.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-white/30 mb-3" />
                  <p className="text-white/50">No notifications</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
