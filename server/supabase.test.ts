import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the supabaseDb module
vi.mock("./supabaseDb", () => ({
  getSupabaseDb: vi.fn(() => null),
  searchPlaces: vi.fn(),
  getPlaceById: vi.fn(),
  getAllSignalDefinitions: vi.fn(),
  getPlaceSignalAggregates: vi.fn(),
  upsertPlaceSignalAggregate: vi.fn(),
  getRepStats: vi.fn(),
  logRepActivity: vi.fn(),
  getRecentRepActivity: vi.fn(),
}));

import {
  searchPlaces,
  getPlaceById,
  getAllSignalDefinitions,
  getPlaceSignalAggregates,
  getRepStats,
} from "./supabaseDb";

describe("Supabase Database Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchPlaces", () => {
    it("should return empty array when no connection", async () => {
      vi.mocked(searchPlaces).mockResolvedValue([]);
      const result = await searchPlaces("test");
      expect(result).toEqual([]);
    });

    it("should return places matching search query", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "Test Cafe",
          address_line1: "123 Main St",
          city: "New York",
          country: "USA",
          category: "cafe",
          latitude: 40.7128,
          longitude: -74.006,
          created_at: new Date(),
        },
      ];
      vi.mocked(searchPlaces).mockResolvedValue(mockPlaces);
      
      const result = await searchPlaces("cafe");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Cafe");
    });
  });

  describe("getPlaceById", () => {
    it("should return null when place not found", async () => {
      vi.mocked(getPlaceById).mockResolvedValue(null);
      const result = await getPlaceById("non-existent-id");
      expect(result).toBeNull();
    });

    it("should return place when found", async () => {
      const mockPlace = {
        id: "place-1",
        name: "Test Cafe",
        address_line1: "123 Main St",
        city: "New York",
        country: "USA",
        category: "cafe",
        latitude: 40.7128,
        longitude: -74.006,
        created_at: new Date(),
      };
      vi.mocked(getPlaceById).mockResolvedValue(mockPlace);
      
      const result = await getPlaceById("place-1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("place-1");
    });
  });

  describe("getAllSignalDefinitions", () => {
    it("should return empty array when no signals", async () => {
      vi.mocked(getAllSignalDefinitions).mockResolvedValue([]);
      const result = await getAllSignalDefinitions();
      expect(result).toEqual([]);
    });

    it("should return signal definitions", async () => {
      const mockSignals = [
        {
          id: "sig-1",
          slug: "great_coffee",
          label: "Great Coffee",
          signal_type: "best_for",
          icon: "coffee",
          is_active: true,
          created_at: new Date(),
        },
        {
          id: "sig-2",
          slug: "cozy_atmosphere",
          label: "Cozy Atmosphere",
          signal_type: "vibe",
          icon: "home",
          is_active: true,
          created_at: new Date(),
        },
      ];
      vi.mocked(getAllSignalDefinitions).mockResolvedValue(mockSignals);
      
      const result = await getAllSignalDefinitions();
      expect(result).toHaveLength(2);
      expect(result[0].signal_type).toBe("best_for");
      expect(result[1].signal_type).toBe("vibe");
    });
  });

  describe("getPlaceSignalAggregates", () => {
    it("should return empty array when no aggregates", async () => {
      vi.mocked(getPlaceSignalAggregates).mockResolvedValue([]);
      const result = await getPlaceSignalAggregates("place-1");
      expect(result).toEqual([]);
    });

    it("should return signal aggregates for a place", async () => {
      const mockAggregates = [
        {
          place_id: "place-1",
          signal_id: "sig-1",
          signal_slug: "great_coffee",
          signal_type: "best_for",
          bucket: "default",
          tap_total: 15,
          review_count: 5,
          last_tap_at: new Date(),
        },
      ];
      vi.mocked(getPlaceSignalAggregates).mockResolvedValue(mockAggregates);
      
      const result = await getPlaceSignalAggregates("place-1");
      expect(result).toHaveLength(1);
      expect(result[0].tap_total).toBe(15);
    });
  });

  describe("getRepStats", () => {
    it("should return default stats when no data", async () => {
      const mockStats = {
        total_reviews: 0,
        reviews_today: 0,
        places_reviewed: 0,
      };
      vi.mocked(getRepStats).mockResolvedValue(mockStats);
      
      const result = await getRepStats("rep-1");
      expect(result.total_reviews).toBe(0);
    });

    it("should return rep statistics", async () => {
      const mockStats = {
        total_reviews: 50,
        reviews_today: 5,
        places_reviewed: 20,
      };
      vi.mocked(getRepStats).mockResolvedValue(mockStats);
      
      const result = await getRepStats("rep-1");
      expect(result.total_reviews).toBe(50);
      expect(result.reviews_today).toBe(5);
      expect(result.places_reviewed).toBe(20);
    });
  });
});
