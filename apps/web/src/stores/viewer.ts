import { create } from 'zustand';

/**
 * Persists viewer state across route navigation (/files/[fileId] ↔ /files/[fileId]/[frameId]).
 * Keyed by fileId so different files have independent state.
 */

interface ViewerState {
  // Per-file state
  states: Record<string, FileViewerState>;
  get: (fileId: string) => FileViewerState;
  set: (fileId: string, patch: Partial<FileViewerState>) => void;
}

interface FileViewerState {
  /** Canvas transform */
  transform: { x: number; y: number; scale: number } | null;
  /** Selected frame id in layers */
  selectedFrameId: string | null;
  /** Selected node id */
  selectedNodeId: string | null;
  /** Active tab */
  activeTab: 'design' | 'comments';
  /** Canvas background color */
  canvasBg: string | null;
  /** Expanded layer node ids */
  expandedLayers: string[];
}

const defaultState: FileViewerState = {
  transform: null,
  selectedFrameId: null,
  selectedNodeId: null,
  activeTab: 'design',
  canvasBg: null,
  expandedLayers: [],
};

export const useViewerStore = create<ViewerState>((set, get) => ({
  states: {},
  get: (fileId) => get().states[fileId] ?? defaultState,
  set: (fileId, patch) =>
    set((s) => ({
      states: {
        ...s.states,
        [fileId]: { ...(s.states[fileId] ?? defaultState), ...patch },
      },
    })),
}));
