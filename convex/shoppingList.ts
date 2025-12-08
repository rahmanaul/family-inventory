import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Get all shopping list items for the current user's household
 */
export const getShoppingListItems = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("shoppingListItems"),
      _creationTime: v.number(),
      householdId: v.id("households"),
      name: v.string(),
      quantity: v.optional(v.number()),
      unit: v.optional(v.string()),
      categoryId: v.optional(v.id("categories")),
      isBought: v.boolean(),
      isAddedToInventory: v.boolean(),
      linkedInventoryItemId: v.optional(v.id("inventoryItems")),
      addedBy: v.id("users"),
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

    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", household._id)
      )
      .collect();

    // Filter out items that are both bought and added to inventory
    return items.filter((item) => !(item.isBought && item.isAddedToInventory));
  },
});

/**
 * Create a new shopping list item
 */
export const createShoppingListItem = mutation({
  args: {
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    linkedInventoryItemId: v.optional(v.id("inventoryItems")),
  },
  returns: v.id("shoppingListItems"),
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

    return await ctx.db.insert("shoppingListItems", {
      householdId: household._id,
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      categoryId: args.categoryId,
      isBought: false,
      isAddedToInventory: false,
      isProcessing: false,
      linkedInventoryItemId: args.linkedInventoryItemId,
      addedBy: userId,
    });
  },
});

/**
 * Update a shopping list item
 */
export const updateShoppingListItem = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    isBought: v.optional(v.boolean()),
    isAddedToInventory: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping list item not found");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;

    if (!household || household._id !== item.householdId) {
      throw new Error("Not authorized for this household");
    }

    const updates: {
      name?: string;
      quantity?: number;
      unit?: string;
      categoryId?: typeof args.categoryId;
      isBought?: boolean;
      isAddedToInventory?: boolean;
    } = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.quantity !== undefined) {
      updates.quantity = args.quantity;
    }
    if (args.unit !== undefined) {
      updates.unit = args.unit;
    }
    if (args.categoryId !== undefined) {
      updates.categoryId = args.categoryId;
    }
    if (args.isBought !== undefined) {
      updates.isBought = args.isBought;
    }
    if (args.isAddedToInventory !== undefined) {
      updates.isAddedToInventory = args.isAddedToInventory;

      // When marked as added to inventory, update the inventory
      if (args.isAddedToInventory && item.isBought) {
        await ctx.runMutation(api.shoppingList.addToInventory, {
          shoppingListItemId: args.itemId,
        });
      }
    }

    await ctx.db.patch(args.itemId, updates);
    return null;
  },
});

/**
 * Mark item as bought
 */
export const markAsBought = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping list item not found");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;

    if (!household || household._id !== item.householdId) {
      throw new Error("Not authorized for this household");
    }

    await ctx.db.patch(args.itemId, { isBought: true });

    // If already added to inventory, trigger the add to inventory logic
    if (item.isAddedToInventory) {
      await ctx.runMutation(api.shoppingList.addToInventory, {
        shoppingListItemId: args.itemId,
      });
    }

    return null;
  },
});

/**
 * Mark item as added to inventory (and update inventory)
 */
export const markAsAddedToInventory = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping list item not found");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;

    if (!household || household._id !== item.householdId) {
      throw new Error("Not authorized for this household");
    }

    await ctx.db.patch(args.itemId, { isAddedToInventory: true });

    // If already bought, trigger the add to inventory logic
    if (item.isBought) {
      await ctx.runMutation(api.shoppingList.addToInventory, {
        shoppingListItemId: args.itemId,
      });
    }

    return null;
  },
});

/**
 * Internal function to add shopping list item to inventory
 */
export const addToInventory = mutation({
  args: {
    shoppingListItemId: v.id("shoppingListItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const shoppingItem = await ctx.db.get(args.shoppingListItemId);
    if (!shoppingItem) {
      throw new Error("Shopping list item not found");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;

    if (!household || household._id !== shoppingItem.householdId) {
      throw new Error("Not authorized for this household");
    }

    // Both checkboxes must be checked
    if (!shoppingItem.isBought || !shoppingItem.isAddedToInventory) {
      return null;
    }

    if (shoppingItem.isProcessing) {
      return null;
    }

    await ctx.db.patch(args.shoppingListItemId, { isProcessing: true });

    // If linked to an existing inventory item, update its quantity
    if (shoppingItem.linkedInventoryItemId) {
      const inventoryItem = await ctx.db.get(shoppingItem.linkedInventoryItemId);
      if (inventoryItem) {
        const newQuantity =
          inventoryItem.quantity + (shoppingItem.quantity ?? 1);
        await ctx.db.patch(shoppingItem.linkedInventoryItemId, {
          quantity: newQuantity,
          lastUpdatedBy: userId,
        });
      }
    } else {
      // Create new inventory item
      await ctx.runMutation(api.inventory.createInventoryItem, {
        categoryId: shoppingItem.categoryId,
        name: shoppingItem.name,
        quantity: shoppingItem.quantity ?? 1,
        unit: shoppingItem.unit ?? "piece",
      });
    }

    // Delete the shopping list item since it's been processed
    await ctx.db.delete(args.shoppingListItemId);

    return null;
  },
});

/**
 * Delete a shopping list item
 */
export const deleteShoppingListItem = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping list item not found");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;

    if (!household || household._id !== item.householdId) {
      throw new Error("Not authorized for this household");
    }

    await ctx.db.delete(args.itemId);
    return null;
  },
});

/**
 * Add low stock item to shopping list
 */
export const addLowStockItemToShoppingList = mutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
  },
  returns: v.id("shoppingListItems"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const inventoryItem = await ctx.db.get(args.inventoryItemId);
    if (!inventoryItem) {
      throw new Error("Inventory item not found");
    }

    const household = await ctx.runQuery(api.households.getCurrentHousehold, {}) as {
      _id: Id<"households">;
      _creationTime: number;
      name: string;
      createdBy: Id<"users">;
    } | null;

    if (!household || household._id !== inventoryItem.householdId) {
      throw new Error("Not authorized for this household");
    }

    const shoppingListItemId: Id<"shoppingListItems"> = await ctx.runMutation(
      api.shoppingList.createShoppingListItem,
      {
        name: inventoryItem.name,
        quantity: inventoryItem.minStock
          ? inventoryItem.minStock - inventoryItem.quantity
          : 1,
        unit: inventoryItem.unit,
        categoryId: inventoryItem.categoryId,
        linkedInventoryItemId: args.inventoryItemId,
      }
    );
    return shoppingListItemId;
  },
});

