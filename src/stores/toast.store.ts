import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = `toast-${Date.now()}-${++toastIdCounter}`;
    const newToast: ToastItem = { id, message, type, duration };

    set((state) => ({
      // Keep up to 5 most recent toasts
      toasts: [...state.toasts.slice(-4), newToast]
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  success: (message: string, duration?: number) => {
    return get().addToast(message, 'success', duration);
  },

  error: (message: string, duration?: number) => {
    return get().addToast(message, 'error', duration);
  },

  info: (message: string, duration?: number) => {
    return get().addToast(message, 'info', duration);
  },

  warning: (message: string, duration?: number) => {
    return get().addToast(message, 'warning', duration);
  }
}));

export const toast = {
  success: (message: string, duration?: number) => useToastStore.getState().success(message, duration),
  error: (message: string, duration?: number) => useToastStore.getState().error(message, duration),
  info: (message: string, duration?: number) => useToastStore.getState().info(message, duration),
  warning: (message: string, duration?: number) => useToastStore.getState().warning(message, duration),
  remove: (id: string) => useToastStore.getState().removeToast(id)
};
