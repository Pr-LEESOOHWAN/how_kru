// dishService.ts는 explore/index/levels/level-progress 등 여러 화면이 공유하는
// 핵심 데이터 함수를 담고 있다. getProgressInLevel의 "completed_dishes 필드가
// 없는 유저 문서에서 undefined.filter()로 죽는" 버그가 화면별 스크린샷으로만
// 발견됐던 전례가 있어, 최소한 이 파일의 로직만이라도 유닛 테스트로 고정해둔다.

import { addDoc, getDoc, getDocs, setDoc } from "firebase/firestore";
import {
  addReview,
  Dish,
  getDishesByLevel,
  getFallbackDishPhoto,
  getProgressInLevel,
  getRestaurantThumbnail,
  getUser,
  markDishCompleted,
  Review,
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

// firebase/storage의 실제 ESM 빌드는 jest의 CJS 트랜스폼으로 파싱이 안 되기 때문에
// (uploadReviewPhoto가 이걸 import함) firestore와 마찬가지로 통째로 mock한다.
jest.mock("firebase/storage", () => ({
  ref: jest.fn((_storage: unknown, path: string) => ({ __type: "storageRef", path })),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({ db: {}, storage: {} }));

const mockGetDoc = getDoc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

function fakeReviewSnapshot(reviews: (Partial<Review> & { id?: string })[]) {
  return {
    docs: reviews.map((review, i) => ({
      id: review.id ?? `r${i}`,
      data: () => review,
    })),
  };
}

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

// 공식 사진(dish.image)이 없는 요리/식당을 유저 리뷰 사진으로 보완하는 기능
// (explore.tsx 요리 썸네일, mission/choose-restaurant.tsx 식당 썸네일이 사용).
describe("getFallbackDishPhoto", () => {
  it("사진이 첨부된 가장 최근 리뷰의 imageUrl을 반환한다", async () => {
    mockGetDocs.mockResolvedValueOnce(
      fakeReviewSnapshot([
        { dishId: "d1", imageUrl: "old.jpg", createdAt: { seconds: 100, nanoseconds: 0 } },
        { dishId: "d1", createdAt: { seconds: 300, nanoseconds: 0 } }, // 사진 없는 최신 리뷰
        { dishId: "d1", imageUrl: "new.jpg", createdAt: { seconds: 200, nanoseconds: 0 } },
      ])
    );
    await expect(getFallbackDishPhoto("d1")).resolves.toBe("new.jpg");
  });

  it("사진 첨부된 리뷰가 하나도 없으면 null을 반환한다", async () => {
    mockGetDocs.mockResolvedValueOnce(
      fakeReviewSnapshot([{ dishId: "d1", createdAt: { seconds: 100, nanoseconds: 0 } }])
    );
    await expect(getFallbackDishPhoto("d1")).resolves.toBeNull();
  });
});

describe("getRestaurantThumbnail", () => {
  it("해당 식당(restaurantId)에서 사진이 첨부된 가장 최근 리뷰를 반환한다", async () => {
    mockGetDocs.mockResolvedValueOnce(
      fakeReviewSnapshot([
        { restaurantId: "place1", imageUrl: "old.jpg", createdAt: { seconds: 100, nanoseconds: 0 } },
        { restaurantId: "place1", imageUrl: "new.jpg", createdAt: { seconds: 500, nanoseconds: 0 } },
      ])
    );
    await expect(getRestaurantThumbnail("place1")).resolves.toBe("new.jpg");
  });

  it("사진이 없으면 null을 반환한다", async () => {
    mockGetDocs.mockResolvedValueOnce(fakeReviewSnapshot([]));
    await expect(getRestaurantThumbnail("place1")).resolves.toBeNull();
  });
});

describe("addReview", () => {
  it("restaurant을 넘기면 restaurantId/restaurantName이 함께 저장된다", async () => {
    mockAddDoc.mockResolvedValueOnce({ id: "new-review" });
    await addReview("d1", "u1", "닉네임", "맛있어요", "photo.jpg", {
      id: "place1",
      name: "숙성회 맛집",
    });
    const savedData = mockAddDoc.mock.calls[0][1];
    expect(savedData.restaurantId).toBe("place1");
    expect(savedData.restaurantName).toBe("숙성회 맛집");
  });

  it("restaurant을 안 넘기면 restaurantId/restaurantName 필드 자체가 없다", async () => {
    mockAddDoc.mockResolvedValueOnce({ id: "new-review" });
    await addReview("d1", "u1", "닉네임", "맛있어요");
    const savedData = mockAddDoc.mock.calls[0][1];
    expect(savedData).not.toHaveProperty("restaurantId");
    expect(savedData).not.toHaveProperty("restaurantName");
  });
});

describe("markDishCompleted", () => {
  it("처음 완료하는 요리는 completed_dishes에 추가하고 XP를 지급한다", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ completed_dishes: ["d1"] }),
    });
    await expect(markDishCompleted("u1", "d2")).resolves.toEqual({ alreadyCompleted: false });
    const savedData = mockSetDoc.mock.calls[mockSetDoc.mock.calls.length - 1][1];
    expect(savedData.completed_dishes).toEqual({ __type: "arrayUnion", v: "d2" });
    expect(savedData.xp).toEqual({ __type: "increment", n: 50 });
  });

  it("이미 완료한 요리를 다시 완료하면 XP를 중복 지급하지 않는다", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ completed_dishes: ["d1", "d2"] }),
    });
    await expect(markDishCompleted("u1", "d2")).resolves.toEqual({ alreadyCompleted: true });
    const savedData = mockSetDoc.mock.calls[mockSetDoc.mock.calls.length - 1][1];
    expect(savedData).not.toHaveProperty("xp");
  });

  it("유저 문서가 없어도(첫 완료) XP를 지급한다", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(markDishCompleted("u1", "d1")).resolves.toEqual({ alreadyCompleted: false });
    const savedData = mockSetDoc.mock.calls[mockSetDoc.mock.calls.length - 1][1];
    expect(savedData.xp).toEqual({ __type: "increment", n: 50 });
  });
});
