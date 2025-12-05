import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Get all categories for the current user's household
 */
export const getCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      householdId: v.id("households"),
      name: v.string(),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
    })
  ),
  handler: async (ctx): Promise<Array<{
    _id: Id<"categories">;
    _creationTime: number;
    householdId: Id<"households">;
    name: string;
    icon?: string;
    color?: string;
  }>> => {
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

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", household._id)
      )
      .collect();

    return categories;
  },
});

/**
 * Create a new category
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.id("categories"),
  handler: async (ctx, args): Promise<Id<"categories">> => {
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

    return await ctx.db.insert("categories", {
      householdId: household._id,
      name: args.name,
      icon: args.icon,
      color: args.color,
    });
  },
});

/**
 * Update a category
 */
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const updates: {
      name?: string;
      icon?: string;
      color?: string;
    } = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.icon !== undefined) {
      updates.icon = args.icon;
    }
    if (args.color !== undefined) {
      updates.color = args.color;
    }

    await ctx.db.patch(args.categoryId, updates);
    return null;
  },
});

/**
 * Delete a category
 */
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.db.delete(args.categoryId);
    return null;
  },
});

/**
 * Seed default categories for a household
 */
export const seedDefaultCategories = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
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

    // Check if categories already exist
    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", household._id)
      )
      .collect();

    if (existingCategories.length > 0) {
      // Categories already exist, skip seeding
      return null;
    }

    const defaultCategories = [
      { name: "Pantry", icon: "🍞", color: "#f59e0b" },
      { name: "Fridge", icon: "🧊", color: "#3b82f6" },
      { name: "Freezer", icon: "❄️", color: "#60a5fa" },
      { name: "Bathroom", icon: "🚿", color: "#8b5cf6" },
      { name: "Cleaning Supplies", icon: "🧹", color: "#10b981" },
      { name: "Other", icon: "📦", color: "#6b7280" },
    ];

    for (const category of defaultCategories) {
      await ctx.db.insert("categories", {
        householdId: household._id,
        name: category.name,
        icon: category.icon,
        color: category.color,
      });
    }

    return null;
  },
});

