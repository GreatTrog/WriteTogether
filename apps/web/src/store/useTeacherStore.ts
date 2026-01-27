import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Assignment, WordBank } from "@writetogether/schema";
import { modeTwoBanks, type ModeTwoBank } from "../sections/mode-two/data";
import type { WordBankSnapshot } from "../services/wordBankCatalog";
import { createId } from "../utils/createId";
import { generateJoinCode } from "../utils/generateJoinCode";

export type PupilProfile = {
  id: string;
  displayName: string;
  needs: string[];
  currentMode: "mode1" | "mode2";
};

export type ClassGroup = {
  id: string;
  name: string;
  phase: "KS1" | "LKS2" | "UKS2";
  joinCode: string;
  pupils: PupilProfile[];
};

export type TeacherAssignment = Assignment & {
  title: string;
  status: "draft" | "published";
  catalogWordBanks?: Record<string, WordBankSnapshot>;
};

export type SharedFileRecord = {
  id: string;
  filename: string;
  username: string;
  savedAt: string;
  location: string;
  sizeBytes: number;
  wordCount: number;
  dataUrl: string;
};

type TeacherStore = {
  classes: ClassGroup[];
  wordBanks: ModeTwoBank[];
  assignments: TeacherAssignment[];
  sharedFiles: SharedFileRecord[];
  createClass: (name: string, phase: ClassGroup["phase"]) => void;
  addPupil: (classId: string, displayName: string, needs: string[]) => void;
  createAssignment: (
    payload: Omit<TeacherAssignment, "id" | "status"> & {
      status?: TeacherAssignment["status"];
    },
  ) => void;
  addWordBank: (
    bank: Omit<WordBank, "id"> & { category: ModeTwoBank["category"]; topic: ModeTwoBank["topic"] },
  ) => void;
  addSharedFile: (
    file: Omit<SharedFileRecord, "id">,
  ) => void;
};

// Seed the preview with scaffolding so the UI has meaningful sample data.
const defaultStore: Pick<
  TeacherStore,
  "classes" | "wordBanks" | "assignments" | "sharedFiles"
> = {
  classes: [
    {
      id: "class-innovation",
      name: "Year 4 Innovation Lab",
      phase: "LKS2",
      joinCode: generateJoinCode(),
      pupils: [
        {
          id: createId(),
          displayName: "Pupil A",
          needs: ["Colourful Semantics", "Picture cues"],
          currentMode: "mode1",
        },
        {
          id: createId(),
          displayName: "Pupil B",
          needs: ["Click-to-compose", "Short read back"],
          currentMode: "mode2",
        },
        {
          id: createId(),
          displayName: "Pupil C",
          needs: ["Chunked tasks", "Success criteria"],
          currentMode: "mode2",
        },
      ],
    },
  ],
  wordBanks: modeTwoBanks,
  assignments: [
    {
      id: "assignment-innovation",
      title: "Innovation Journal - Design Sprint",
      classId: "class-innovation",
      modeLock: "mode2",
      wordBankIds: pinnedBankIds(),
      templateId: null,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      settings: {
        enableTTS: true,
        slotsEnabled: ["who", "doing", "what", "where"],
        wordLimit: 180,
      },
      status: "published",
      catalogWordBanks: {},
    },
  ],
  sharedFiles: [],
};

function pinnedBankIds() {
  return modeTwoBanks.slice(0, 4).map((bank) => bank.id);
}

export const useTeacherStore = create<TeacherStore>()(
  persist(
    (set) => ({
      ...defaultStore,

      // Create a new class shell with a generated join code.
      createClass: (name, phase) => {
        set((state) => ({
          classes: [
            ...state.classes,
            {
              id: createId(),
              name,
              phase,
              joinCode: generateJoinCode(),
              pupils: [],
            },
          ],
        }));
      },

      // Append a pupil profile to the selected class, persisting their support needs.
      addPupil: (classId, displayName, needs) => {
        set((state) => ({
          classes: state.classes.map((classGroup) =>
            classGroup.id === classId
              ? {
                  ...classGroup,
                  pupils: [
                    ...classGroup.pupils,
                    {
                      id: createId(),
                      displayName,
                      needs,
                      currentMode: "mode1",
                    },
                  ],
                }
              : classGroup,
          ),
        }));
      },

      // Normalise values then add the assignment to the top of the list for quick access.
      createAssignment: (payload) => {
        const assignment: TeacherAssignment = {
          ...payload,
          dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
          id: createId(),
          status: payload.status ?? "published",
          catalogWordBanks: payload.catalogWordBanks ?? {},
        };
        set((state) => ({
          assignments: [assignment, ...state.assignments],
        }));
      },

      // Store teacher-authored banks locally so they surface in the assignment builder.
      addWordBank: (bank) => {
        set((state) => ({
          wordBanks: [
            {
              ...bank,
              id: createId(),
            },
            ...state.wordBanks,
          ],
        }));
      },

      addSharedFile: (file) => {
        const record: SharedFileRecord = {
          ...file,
          id: createId(),
        };
        set((state) => ({
          sharedFiles: [
            record,
            ...state.sharedFiles.filter((existing) => {
              const sameIdentity =
                existing.filename === record.filename &&
                existing.username === record.username &&
                (existing.savedAt === record.savedAt || existing.dataUrl === record.dataUrl);
              return !sameIdentity;
            }),
          ],
        }));
      },
    }),
    {
      name: "writetogether-teacher-store",
      // Persist only user-generated data so derived helpers don't bloat storage.
      partialize: (state) => ({
        classes: state.classes,
        assignments: state.assignments,
        wordBanks: state.wordBanks,
        sharedFiles: state.sharedFiles,
      }),
      version: 1,
      // Convert serialized dates back into Date instances once hydration finishes.
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        set((existing) => ({
          ...existing,
          assignments: state.assignments.map((assignment) => ({
            ...assignment,
            dueAt: assignment.dueAt ? new Date(assignment.dueAt) : null,
          })),
          sharedFiles: state.sharedFiles ?? existing.sharedFiles,
        }));
      },
    },
  ),
);
