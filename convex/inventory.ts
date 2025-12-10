import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Get all inventory items for the current user's household
 */
export const getInventoryItems = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("inventoryItems"),
        _creationTime: v.number(),
        householdId: v.id("households"),
        categoryId: v.optional(v.id("categories")),
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
        minStock: v.optional(v.number()),
        expirationDate: v.optional(v.number()),
        notes: v.optional(v.string()),
        lastUpdatedBy: v.id("users"),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(v.union(v.string(), v.null())),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const queryBuilder = args.categoryId
      ? ctx.db
          .query("inventoryItems")
          .withIndex("by_householdId_and_categoryId", (q) =>
            q.eq("householdId", household._id).eq("categoryId", args.categoryId)
          )
      : ctx.db
          .query("inventoryItems")
          .withIndex("by_householdId", (q) =>
            q.eq("householdId", household._id)
          );

    const page = await queryBuilder
      .order("desc")
      .paginate(args.paginationOpts);

    return page;
  },
});

/**
 * Get a single inventory item
 */
export const getInventoryItem = query({
  args: {
    itemId: v.id("inventoryItems"),
  },
  returns: v.union(
    v.object({
      _id: v.id("inventoryItems"),
      _creationTime: v.number(),
      householdId: v.id("households"),
      categoryId: v.optional(v.id("categories")),
      name: v.string(),
      quantity: v.number(),
      unit: v.string(),
      minStock: v.optional(v.number()),
      expirationDate: v.optional(v.number()),
      notes: v.optional(v.string()),
      lastUpdatedBy: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return null;
    }

    // Verify user belongs to the household that owns this item
    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household || household._id !== item.householdId) {
      return null;
    }

    return item;
  },
});

/**
 * Create a new inventory item
 */
export const createInventoryItem = mutation({
  args: {
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    minStock: v.optional(v.number()),
    expirationDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("inventoryItems"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household) {
      throw new Error("No household found");
    }

    return await ctx.db.insert("inventoryItems", {
      householdId: household._id,
      categoryId: args.categoryId,
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      minStock: args.minStock,
      expirationDate: args.expirationDate,
      notes: args.notes,
      lastUpdatedBy: userId,
    });
  },
});

/**
 * Update an inventory item
 */
export const updateInventoryItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    categoryId: v.optional(v.id("categories")),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    minStock: v.optional(v.number()),
    expirationDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user belongs to the household that owns this item
    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household || household._id !== item.householdId) {
      throw new Error("Not authorized to update this item");
    }

    const updates: {
      categoryId?: typeof args.categoryId;
      name?: string;
      quantity?: number;
      unit?: string;
      minStock?: typeof args.minStock;
      expirationDate?: typeof args.expirationDate;
      notes?: string;
      lastUpdatedBy: typeof userId;
    } = {
      lastUpdatedBy: userId,
    };

    if (args.categoryId !== undefined) {
      updates.categoryId = args.categoryId;
    }
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.quantity !== undefined) {
      updates.quantity = args.quantity;
    }
    if (args.unit !== undefined) {
      updates.unit = args.unit;
    }
    if (args.minStock !== undefined) {
      updates.minStock = args.minStock;
    }
    if (args.expirationDate !== undefined) {
      updates.expirationDate = args.expirationDate;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.itemId, updates);
    return null;
  },
});

/**
 * Delete an inventory item
 */
export const deleteInventoryItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify user belongs to the household that owns this item
    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household || household._id !== item.householdId) {
      throw new Error("Not authorized to delete this item");
    }

    await ctx.db.delete(args.itemId);
    return null;
  },
});

/**
 * Get low stock items (quantity below minStock threshold)
 */
export const getLowStockItems = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("inventoryItems"),
      _creationTime: v.number(),
      householdId: v.id("households"),
      categoryId: v.optional(v.id("categories")),
      name: v.string(),
      quantity: v.number(),
      unit: v.string(),
      minStock: v.optional(v.number()),
      expirationDate: v.optional(v.number()),
      notes: v.optional(v.string()),
      lastUpdatedBy: v.id("users"),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household) {
      return [];
    }

    const allItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", household._id)
      )
      .collect();

    // Filter items where quantity is below minStock threshold
    const lowStockItems = allItems.filter((item) => {
      if (item.minStock === undefined) {
        return false;
      }
      return item.quantity < item.minStock;
    });

    return lowStockItems;
  },
});

/**
 * Get items expiring soon (within 7 days)
 */
export const getExpiringSoonItems = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("inventoryItems"),
      _creationTime: v.number(),
      householdId: v.id("households"),
      categoryId: v.optional(v.id("categories")),
      name: v.string(),
      quantity: v.number(),
      unit: v.string(),
      minStock: v.optional(v.number()),
      expirationDate: v.optional(v.number()),
      notes: v.optional(v.string()),
      lastUpdatedBy: v.id("users"),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;
    if (!household) {
      return [];
    }

    const allItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", household._id)
      )
      .collect();

    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expirationThreshold = now + sevenDaysInMs;

    // Filter items expiring within 7 days
    const expiringItems = allItems.filter((item) => {
      if (!item.expirationDate) {
        return false;
      }
      return item.expirationDate <= expirationThreshold && item.expirationDate >= now;
    });

    // Sort by expiration date (soonest first)
    expiringItems.sort((a, b) => {
      if (!a.expirationDate || !b.expirationDate) {
        return 0;
      }
      return a.expirationDate - b.expirationDate;
    });

    return expiringItems;
  },
});

