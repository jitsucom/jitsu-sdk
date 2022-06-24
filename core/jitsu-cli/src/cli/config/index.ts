export type ConfigStore = {
  create: <T>(storeName: string, projectId: string, obj: T) => Promise<T & { id: string }>;
  update: <T>(storeName: string, projectId: string, id: string, obj: Partial<T>) => Promise<T & { id: string }>;
  delete: (storeName: string, projectId: string, id: string) => Promise<any>;
  get: (storeName: string, projectId: string) => Promise<(any & { id: string })[]>;
};
