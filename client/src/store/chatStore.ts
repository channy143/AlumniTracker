import { create } from 'zustand';

export interface GroupMember {
  id?: string;
  profile_id: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'member';
}

export interface ChatContact {
  profileId: string;
  name: string;
  avatar?: string;
  headline?: string;
  isOnline?: boolean;
  lastActiveAt?: string | null;
  unread?: number;
  isGroup?: boolean;
  creator_id?: string;
  admin_id?: string;
  isAdmin?: boolean;
  myRole?: 'admin' | 'member';
  members?: GroupMember[];
  muted?: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
}

export interface ReplyTarget {
  id: string;
  senderName: string;
  body: string;
}

interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  activeChat: ChatContact | null;
  minimizedChats: ChatContact[];
  groups: ChatContact[];
  unreadCount: number;
  isHeaderDropdownOpen: boolean;
  replyingTo: ReplyTarget | null;

  // Contact / Direct Chat Actions
  openChat: (contact: ChatContact) => void;
  minimizeChat: (contact?: ChatContact) => void;
  restoreChat: (contact?: ChatContact) => void;
  closeChat: () => void;
  dismissMinimizedChat: (profileId: string) => void;
  dismissAllMinimized: () => void;
  toggleChat: (contact: ChatContact) => void;
  updatePresence: (presenceMap: Record<string, { is_online: boolean; last_active_at: string | null }>) => void;
  setUnreadCount: (count: number) => void;
  setHeaderDropdownOpen: (open: boolean) => void;
  toggleHeaderDropdown: () => void;
  closeHeaderDropdown: () => void;

  // Group Conversation Actions
  setGroups: (groups: ChatContact[]) => void;
  updateGroupMembers: (groupId: string, members: GroupMember[]) => void;
  removeMemberFromGroup: (groupId: string, profileId: string) => void;
  addMemberToGroup: (groupId: string, member: GroupMember) => void;
  leaveGroup: (groupId: string) => void;
  toggleMuteGroup: (groupId: string) => void;

  // Message Actions (Reply)
  setReplyingTo: (reply: ReplyTarget | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  activeChat: null,
  minimizedChats: [],
  groups: [],
  unreadCount: 0,
  isHeaderDropdownOpen: false,
  replyingTo: null,

  openChat: (contact) =>
    set((state) => {
      // Remove contact from minimized list if present
      const filtered = state.minimizedChats.filter((c) => c.profileId !== contact.profileId);
      let updatedMinimized = filtered;

      // If there was an active open chat different from target, auto-minimize previous
      if (state.isOpen && state.activeChat && state.activeChat.profileId !== contact.profileId) {
        if (!updatedMinimized.some((c) => c.profileId === state.activeChat!.profileId)) {
          updatedMinimized = [...updatedMinimized, state.activeChat];
        }
      }

      return {
        activeChat: contact,
        isOpen: true,
        isMinimized: updatedMinimized.length > 0,
        minimizedChats: updatedMinimized,
        isHeaderDropdownOpen: false,
        replyingTo: null,
      };
    }),

  minimizeChat: (targetContact) =>
    set((state) => {
      const toMinimize = targetContact || state.activeChat;
      if (!toMinimize) {
        return { isOpen: false, activeChat: null, replyingTo: null };
      }

      const alreadyInList = state.minimizedChats.some((c) => c.profileId === toMinimize.profileId);
      const updatedMinimized = alreadyInList
        ? state.minimizedChats
        : [...state.minimizedChats, toMinimize];

      return {
        isOpen: false,
        activeChat: null,
        isMinimized: true,
        minimizedChats: updatedMinimized,
        replyingTo: null,
      };
    }),

  restoreChat: (targetContact) =>
    set((state) => {
      const toRestore = targetContact || state.minimizedChats[0] || state.activeChat;
      if (!toRestore) return state;

      const filtered = state.minimizedChats.filter((c) => c.profileId !== toRestore.profileId);
      let updatedMinimized = filtered;

      // If another chat was actively open, minimize it
      if (state.isOpen && state.activeChat && state.activeChat.profileId !== toRestore.profileId) {
        if (!updatedMinimized.some((c) => c.profileId === state.activeChat!.profileId)) {
          updatedMinimized = [...updatedMinimized, state.activeChat];
        }
      }

      return {
        activeChat: toRestore,
        isOpen: true,
        isMinimized: updatedMinimized.length > 0,
        minimizedChats: updatedMinimized,
        isHeaderDropdownOpen: false,
      };
    }),

  closeChat: () =>
    set((state) => ({
      isOpen: false,
      activeChat: null,
      isMinimized: state.minimizedChats.length > 0,
      replyingTo: null,
    })),

  dismissMinimizedChat: (profileId: string) =>
    set((state) => {
      const updated = state.minimizedChats.filter((c) => c.profileId !== profileId);
      return {
        minimizedChats: updated,
        isMinimized: updated.length > 0,
      };
    }),

  dismissAllMinimized: () =>
    set({
      minimizedChats: [],
      isMinimized: false,
    }),

  toggleChat: (contact) =>
    set((state) => {
      if (state.activeChat?.profileId === contact.profileId) {
        if (state.isOpen) {
          // Minimize it
          const already = state.minimizedChats.some((c) => c.profileId === contact.profileId);
          const updated = already ? state.minimizedChats : [...state.minimizedChats, contact];
          return {
            isOpen: false,
            activeChat: null,
            isMinimized: updated.length > 0,
            minimizedChats: updated,
            replyingTo: null,
          };
        } else {
          return { isOpen: true };
        }
      }

      // Switching to a different chat
      const filtered = state.minimizedChats.filter((c) => c.profileId !== contact.profileId);
      let updated = filtered;
      if (state.isOpen && state.activeChat) {
        if (!updated.some((c) => c.profileId === state.activeChat!.profileId)) {
          updated = [...updated, state.activeChat];
        }
      }
      return {
        activeChat: contact,
        isOpen: true,
        isMinimized: updated.length > 0,
        minimizedChats: updated,
        replyingTo: null,
      };
    }),

  updatePresence: (presenceMap) =>
    set((state) => {
      let activeChat = state.activeChat;
      if (activeChat && !activeChat.isGroup && presenceMap[activeChat.profileId]) {
        const p = presenceMap[activeChat.profileId];
        activeChat = {
          ...activeChat,
          isOnline: p.is_online,
          lastActiveAt: p.last_active_at !== undefined ? p.last_active_at : activeChat.lastActiveAt,
        };
      }

      const minimizedChats = state.minimizedChats.map((c) => {
        if (c.isGroup || !presenceMap[c.profileId]) return c;
        const p = presenceMap[c.profileId];
        return {
          ...c,
          isOnline: p.is_online,
          lastActiveAt: p.last_active_at !== undefined ? p.last_active_at : c.lastActiveAt,
        };
      });

      return { activeChat, minimizedChats };
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),
  setHeaderDropdownOpen: (open) => set({ isHeaderDropdownOpen: open }),
  toggleHeaderDropdown: () => set((state) => ({ isHeaderDropdownOpen: !state.isHeaderDropdownOpen })),
  closeHeaderDropdown: () => set({ isHeaderDropdownOpen: false }),

  // Group Conversation Handlers
  setGroups: (groups) => set({ groups }),

  updateGroupMembers: (groupId, members) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.profileId === groupId ? { ...g, members } : g
      ),
      activeChat:
        state.activeChat?.profileId === groupId
          ? { ...state.activeChat, members }
          : state.activeChat,
    })),

  removeMemberFromGroup: (groupId, profileId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.profileId === groupId
          ? {
              ...g,
              members: (g.members || []).filter(
                (m) => m.profile_id !== profileId && m.id !== profileId
              ),
            }
          : g
      ),
      activeChat:
        state.activeChat?.profileId === groupId
          ? {
              ...state.activeChat,
              members: (state.activeChat.members || []).filter(
                (m) => m.profile_id !== profileId && m.id !== profileId
              ),
            }
          : state.activeChat,
    })),

  addMemberToGroup: (groupId, member) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.profileId === groupId
          ? {
              ...g,
              members: g.members?.some((m) => m.profile_id === member.profile_id || m.id === member.id)
                ? g.members
                : [...(g.members || []), member],
            }
          : g
      ),
      activeChat:
        state.activeChat?.profileId === groupId
          ? {
              ...state.activeChat,
              members: state.activeChat.members?.some((m) => m.profile_id === member.profile_id || m.id === member.id)
                ? state.activeChat.members
                : [...(state.activeChat.members || []), member],
            }
          : state.activeChat,
    })),

  leaveGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.profileId !== groupId),
      activeChat: state.activeChat?.profileId === groupId ? null : state.activeChat,
      isOpen: state.activeChat?.profileId === groupId ? false : state.isOpen,
      minimizedChats: state.minimizedChats.filter((c) => c.profileId !== groupId),
    })),

  toggleMuteGroup: (groupId) =>
    set((state) => {
      const updateGroup = (g: ChatContact) => (g.profileId === groupId ? { ...g, muted: !g.muted } : g);
      return {
        groups: state.groups.map(updateGroup),
        activeChat: state.activeChat?.profileId === groupId ? { ...state.activeChat, muted: !state.activeChat.muted } : state.activeChat,
      };
    }),

  // Message Actions
  setReplyingTo: (reply) => set({ replyingTo: reply }),
}));
