import path from "path";
import * as fs from "fs";
import * as JSON5 from "json5";
import { merge } from "lodash/merge";
import getLog from "./lib/log";

export type Identifiable = { id: string };
export type AnyObject = { [key: string]: any };
export type ConfigEntityStore<T extends Identifiable = Identifiable & AnyObject> = {
  get: (id: string) => Promise<T | undefined>;
  remove: (id: string) => Promise<T | undefined>;
  listIds: () => Promise<string[]>;
  list: () => Promise<T[]>;
  patch: (id: string, patch: Partial<T>) => Promise<T>;
  create: (entity: Omit<T, "id">) => Promise<T>;
};

export type EntityStoreFactory<T extends Identifiable = Identifiable & AnyObject> = (
  projectId: string,
  entityType: string
) => ConfigEntityStore<T>;

export function directoryBackedFactory<T extends Identifiable = Identifiable & AnyObject>(
  directory: string
): EntityStoreFactory<T> {
  const factory = (projectId: string, entityType: string) => {
    const entityFile = path.join(directory, projectId, entityType + ".json");
    const getObjects = (): any[] | undefined => {
      if (!fs.existsSync(entityFile)) {
        return undefined;
      }
      return JSON5.parse(fs.readFileSync(entityFile, "utf8")).objects as any[];
    };
    const saveObjects = (objects: any[]) => {
      const dir = path.dirname(entityFile);
      if (!fs.existsSync(dir)) {
        return fs.mkdirSync(dir, { recursive: true });
      }
      getLog().debug(`Saving ${entityType} to ${entityFile}`);
      fs.writeFileSync(entityFile, JSON5.stringify({ objects }, null, 2));
      return JSON5.parse(fs.readFileSync(entityFile, "utf8")).objects as any[];
    };
    return {
      get: async (id: string) => {
        return getObjects()?.find(e => e.id === id);
      },
      listIds: async () => {
        const objects = getObjects();
        return objects ? objects.map(e => e.id) : [];
      },
      remove: async (id: string) => {
        const objects = getObjects() ?? [];
        const index = objects.findIndex(e => e.id === id);
        if (index < 0) {
          return undefined;
        } else {
          const returnVal = objects.splice(index, 1)[0];
          saveObjects(objects);
          return returnVal;
        }
      },
      list: async () => {
        const objects = getObjects();
        return objects ? objects : [];
      },
      patch: async (id: string, patch: any) => {
        const objects = getObjects() || [];
        const index = objects.findIndex(e => e.id === id);
        if (index < 0) {
          throw new Error(`${id} not found`);
        }
        const original = objects[index];
        objects[index] = merge(original, patch);
        saveObjects(objects);
      },
      create: (entity: any) => {
        const objects = getObjects() || [];

        const newEntity = { id: Math.random().toString(36).substring(2), ...entity };
        saveObjects([...objects, newEntity]);
        return newEntity;
      },
    };
  };
  return factory as any;
}
