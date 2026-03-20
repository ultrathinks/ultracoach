import Dexie, { type EntityTable } from "dexie";

interface Recording {
  id?: number;
  sessionId: string;
  type: "video" | "audio";
  blob: Blob;
}

const db = new Dexie("ultracoach") as Dexie & {
  recordings: EntityTable<Recording, "id">;
};

db.version(1).stores({
  recordings: "++id, sessionId, type",
});

export { db };
export type { Recording };
