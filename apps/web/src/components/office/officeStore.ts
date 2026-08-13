import { create } from "zustand";

interface OfficeState {
  selectedEmployeeId: string | null;
  selectedZone: string | null;
  cameraTarget: [number, number, number] | null;

  selectEmployee: (id: string | null) => void;
  selectZone: (zone: string | null) => void;
  focusCamera: (target: [number, number, number]) => void;
  resetCamera: () => void;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  selectedEmployeeId: null,
  selectedZone: null,
  cameraTarget: null,

  selectEmployee: (id) => set({ selectedEmployeeId: id }),
  selectZone: (zone) => set({ selectedZone: zone }),
  focusCamera: (target) => set({ cameraTarget: target }),
  resetCamera: () => set({ cameraTarget: [0, 6, 12] }),
}));
