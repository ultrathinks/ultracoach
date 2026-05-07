import Dexie, { type EntityTable } from "dexie";

interface Recording {
  id?: number;
  sessionId: string;
  type: "video" | "audio";
  blob: Blob;
}

class UltraCoachDb extends Dexie {
  recordings!: EntityTable<Recording, "id">;

  constructor() {
    super("ultracoach");
    this.version(1).stores({
      recordings: "++id, sessionId, type",
    });
  }
}

const db = new UltraCoachDb();

export { db };
export type { Recording };
