// dishService.ts는 explore/index/levels/level-progress 등 여러 화면이 공유하는
// 핵심 데이터 함수를 담고 있다. getProgressInLevel의 "completed_dishes 필드가
// 없는 유저 문서에서 undefined.filter()로 죽는" 버그가 화면별 스크린샷으로만
// 발견됐던 전례가 있어, 최소한 이 파일의 로직만이라도 유닛 테스트로 고정해둔다.

import { getDoc, getDocs } from "firebase/firestore";
import {
  Dish,
  getDishesByLevel,
  getProgressInLevel,
  getUser,
  User,
} from "../dishService";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((_db: unknown, ...path: string[]) => ({ __type: "collection", path })),
  doc: jest.fn((_db: unknown, ...path: string[]) => ({ __type: "doc", path })),
  query: jest.fn((base: unknown, ...constraints: unknown[]) => ({ __type: "query", base, constraints })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ __type: "where", field, op, value })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  arrayUnion: jest.fn((v: unknown) => ({ __type: "arrayUnion", v })),
  increment: jest.fn((n: number) => ({ __type: "increment", n })),
  serverTimestamp: jest.fn(() => ({ __type: "serverTimestamp" })),
}));

jest.mock("../firebaseConfig", () => ({ db: {} }));

const mockGetDoc = getDoc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;

function fakeDishSnapshot(dishes: (Pick<Dish, "id"> & Partial<Dish>)[]) {
  return {
    docs: dishes.map((dish) => ({
      id: dish.id,
      data: () => {
        const { id, ...rest } = dish;
        return rest;
      },
    })),
  };
}

function fakeUserDoc(exists: boolean, data?: Partial<User>) {
  return { exists: () => exists, data: () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getUser", () => {
  it("존재하지 않는 유저 문서는 null을 반환한다", async () => {
    mockGetDoc.mockResolvedValueOnce(fakeUserDoc(false));
    await expect(getUser("nobody")).resolves.toBeNull();
  });

  it("존재하는 유저 문서는 데이터를 그대로 반환한다", async () => {
    mockGetDoc.mockResolvedValueOnce(fakeUserDoc(true, { current_level: 3 }));
    await expect(getUser("u1")).resolves.toEqual({ current_level: 3 });
  });
});

describe("getDishesByLevel", () => {
  it("스냅샷의 각 문서를 id + 데이터로 매핑한다", async () => {
    mockGetDocs.mockResolvedValueOnce(
      fakeDishSnapshot([
        { id: "d1", name_kr: "비빔밥", level: 1 },
        { id: "d2", name_kr: "김치찌개", level: 1 },
      ])
    );
    const dishes = await getDishesByLevel(1);
    expect(dishes.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(dishes[0].name_kr).toBe("비빔밥");
  });
});

describe("getProgressInLevel", () => {
  it("유저 문서가 없으면 0을 반환한다", async () => {
    mockGetDoc.mockResolvedValueOnce(fakeUserDoc(false));
    await expect(getProgressInLevel("nobody", 1)).resolves.toBe(0);
    // 유저가 없으면 요리 목록 조회까지 갈 필요가 없다.
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it("completed_dishes 필드가 없는(레거시) 유저 문서에서도 죽지 않고 0을 반환한다", async () => {
    // 이 케이스가 실제로 앱에서 터졌던 회귀: user.completed_dishes.filter(...)가
    // completed_dishes가 undefined일 때 TypeError를 던졌었다.
    mockGetDoc.mockResolvedValueOnce(fakeUserDoc(true, { current_level: 1 }));
    mockGetDocs.mockResolvedValueOnce(fakeDishSnapshot([{ id: "d1" }, { id: "d2" }]));
    await expect(getProgressInLevel("legacy-user", 1)).resolves.toBe(0);
  });

  it("완료한 요리 중 해당 레벨에 속한 것만 센다", async () => {
    mockGetDoc.mockResolvedValueOnce(
      fakeUserDoc(true, { completed_dishes: ["d1", "d3", "other-level-dish"] })
    );
    mockGetDocs.mockResolvedValueOnce(
      fakeDishSnapshot([{ id: "d1" }, { id: "d2" }, { id: "d3" }])
    );
    await expect(getProgressInLevel("u1", 1)).resolves.toBe(2);
  });
});
