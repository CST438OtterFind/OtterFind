const mockSecureStore = { getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() };
jest.mock("expo-secure-store", () => mockSecureStore);

/** Loads the module fresh for one platform, because it picks its storage when it's first imported. */
function loadStore(os: string) {
  jest.doMock("react-native", () => ({ Platform: { OS: os } }));
  let store: typeof import("./tokenStore");
  jest.isolateModules(() => {
    store = require("./tokenStore");
  });
  return store!.tokenStore;
}

afterEach(() => jest.dontMock("react-native"));

describe("on Android", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps the token in SecureStore", async () => {
    mockSecureStore.getItemAsync.mockResolvedValue("token");
    const store = loadStore("android");

    await store.set("token");
    await expect(store.get()).resolves.toBe("token");
    await store.clear();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith("app_jwt", "token");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("app_jwt");
  });
});

describe("on web", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    };
  });

  afterEach(() => delete (globalThis as { localStorage?: unknown }).localStorage);

  it("keeps the token in localStorage", async () => {
    const store = loadStore("web");

    await store.set("token");
    expect(memory.get("app_jwt")).toBe("token");
    await expect(store.get()).resolves.toBe("token");

    await store.clear();
    await expect(store.get()).resolves.toBeNull();
  });

  it("reads as signed out when storage is blocked", async () => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    await expect(loadStore("web").get()).resolves.toBeNull();
  });
});
