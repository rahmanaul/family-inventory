import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  households: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
  })
    .index("by_createdBy", ["createdBy"]),

  householdMembers: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
  })
    .index("by_householdId", ["householdId"])
    .index("by_userId", ["userId"])
    .index("by_householdId_and_userId", ["householdId", "userId"]),

  categories: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  })
    .index("by_householdId", ["householdId"]),

  inventoryItems: defineTable({
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
    .index("by_householdId", ["householdId"])
    .index("by_householdId_and_categoryId", ["householdId", "categoryId"]),

  shoppingListItems: defineTable({
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
    .index("by_householdId", ["householdId"])
    .index("by_householdId_and_isBought", ["householdId", "isBought"])
    .index("by_householdId_and_isAddedToInventory", ["householdId", "isAddedToInventory"]),

  householdInvites: defineTable({
    householdId: v.id("households"),
    inviteCode: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_householdId", ["householdId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    emailVerified: v.boolean(),
  })
    .index("by_userId", ["userId"]),

  emailVerificationTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    email: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),

  passwordResetTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    email: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),
});
