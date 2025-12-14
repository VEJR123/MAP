import { create } from 'zustand';
import * as api from '@/services/api';

type SwimTime = {
  id: string;
  event: string;
  personalBestMs?: number;
  expectedTimeMs?: number | null;
  swimmerId: string;
};

type Swimmer = {
  id: string;
  firstName: string;
  lastName: string;
  newLastName?: string;
  yearOfBirth?: number;
  gender?: string;
  category?: string;
  times?: SwimTime[];
};

type State = {
  poolSize: number;
  loading: boolean;
  error: string | null;
  fetch: (since?: number) => Promise<void>;
  fetchOne: (id: string, poolSize?: number) => Promise<any>;
  setPoolSize: (size: number) => void;
  updateTime: (swimmerId: string, timeId: string, patch: any) => Promise<void>;
  clearError: () => void;
};

export const useSwimmersStore = create<State>((set, get) => ({
  swimmers: [],
  poolSize: 50,
  loading: false,
  error: null,
  setPoolSize: (size: number) => set({ poolSize: size }),
  fetch: async (since?: number) => {
    set({ loading: true, error: null });
    try {
      const swimmers = await api.getSwimmers(since);
      set({ swimmers, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  fetchOne: async (id: string, poolSize?: number) => {
    try {
      const swimmer = await api.getSwimmer(id, poolSize);
      set((s) => {
        const exists = s.swimmers.some((w) => w.id === id || String(w.id) === String(id));
        return {
          swimmers: exists
            ? s.swimmers.map((w) => (String(w.id) === String(id) ? swimmer : w))
            : [...s.swimmers, swimmer],
        };
      });
      return swimmer;
    } catch (e: any) {
      set({ error: e.message });
      return null;
    }
  },
  updateTime: async (swimmerId: string, timeId: string, patch: any) => {
    await api.updateTime(swimmerId, timeId, patch);
    // refetch that swimmer
    await get().fetchOne(swimmerId);
  },
  clearError: () => set({ error: null }),
}));


