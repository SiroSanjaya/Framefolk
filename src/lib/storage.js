const DB_NAME = "framefolk-assets";
const STORE_NAME = "assets";
const DB_VERSION = 1;

const getDatabaseName = (userId) => {
  if (!userId) return DB_NAME;
  if (!/^[a-z0-9-]{1,80}$/i.test(userId)) {
    throw new Error("Invalid account identifier for local asset storage.");
  }
  return `${DB_NAME}-${userId}`;
};

const openScopedDatabase = (userId) =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(getDatabaseName(userId), DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const getAssets = async (userId) => {
  const database = await openScopedDatabase(userId);
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveAsset = async (asset, userId) => {
  const database = await openScopedDatabase(userId);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(asset);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const deleteAsset = async (id, userId) => {
  const database = await openScopedDatabase(userId);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
