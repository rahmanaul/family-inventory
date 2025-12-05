import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current user's household
 */
export const getCurrentHousehold = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("households"),
      _creationTime: v.number(),
      name: v.string(),
      createdBy: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Find household membership for current user
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!membership) {
      return null;
    }

    const household = await ctx.db.get(membership.householdId);
    return household;
  },
});

/**
 * Create a new household
 */
export const createHousehold = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("households"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already has a household
    const existingMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingMembership) {
      throw new Error("User already belongs to a household");
    }

    // Create household
    const householdId = await ctx.db.insert("households", {
      name: args.name,
      createdBy: userId,
    });

    // Add creator as member
    await ctx.db.insert("householdMembers", {
      householdId,
      userId,
    });

    return householdId;
  },
});

/**
 * Get household members
 */
export const getHouseholdMembers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("householdMembers"),
      userId: v.id("users"),
      householdId: v.id("households"),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!membership) {
      return [];
    }

    const members = await ctx.db
      .query("householdMembers")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", membership.householdId)
      )
      .collect();

    return members;
  },
});

/**
 * Get household members with user details (email)
 */
export const getHouseholdMembersWithDetails = query({
  args: {},
  returns: v.object({
    members: v.array(
      v.object({
        _id: v.id("householdMembers"),
        userId: v.id("users"),
        householdId: v.id("households"),
        email: v.optional(v.string()),
        isCreator: v.boolean(),
      })
    ),
    currentUserIsCreator: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { members: [], currentUserIsCreator: false };
    }

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!membership) {
      return { members: [], currentUserIsCreator: false };
    }

    const household = await ctx.db.get(membership.householdId);
    if (!household) {
      return { members: [], currentUserIsCreator: false };
    }

    const members = await ctx.db
      .query("householdMembers")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", membership.householdId)
      )
      .collect();

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          _id: member._id,
          userId: member.userId,
          householdId: member.householdId,
          email: user?.email,
          isCreator: household.createdBy === member.userId,
        };
      })
    );

    return {
      members: membersWithDetails,
      currentUserIsCreator: household.createdBy === userId,
    };
  },
});

/**
 * Generate or get existing invite code for a household
 */
export const generateInviteCode = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!membership) {
      throw new Error("User does not belong to a household");
    }

    // Check if there's an existing valid invite code
    const existingInvites = await ctx.db
      .query("householdInvites")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", membership.householdId)
      )
      .collect();

    // Filter out expired invites
    const now = Date.now();
    const validInvites = existingInvites.filter(
      (invite) => !invite.expiresAt || invite.expiresAt > now
    );

    // If there's a valid invite code, return it
    if (validInvites.length > 0) {
      return validInvites[0].inviteCode;
    }

    // Generate a new invite code (8 characters, alphanumeric)
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let inviteCode = generateCode();
    // Ensure uniqueness (simple check)
    let existing = await ctx.db
      .query("householdInvites")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
      .first();

    while (existing) {
      inviteCode = generateCode();
      existing = await ctx.db
        .query("householdInvites")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
        .first();
    }

    // Create invite code that expires in 30 days
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("householdInvites", {
      householdId: membership.householdId,
      inviteCode,
      createdBy: userId,
      expiresAt,
    });

    return inviteCode;
  },
});

/**
 * Get the current invite code for a household
 */
export const getHouseholdInviteCode = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!membership) {
      return null;
    }

    const invites = await ctx.db
      .query("householdInvites")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", membership.householdId)
      )
      .collect();

    const now = Date.now();
    const validInvite = invites.find(
      (invite) => !invite.expiresAt || invite.expiresAt > now
    );

    return validInvite?.inviteCode ?? null;
  },
});

/**
 * Join a household using an invite code
 */
export const joinHouseholdByCode = mutation({
  args: {
    inviteCode: v.string(),
  },
  returns: v.id("households"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already belongs to a household
    const existingMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingMembership) {
      throw new Error("User already belongs to a household");
    }

    // Find the invite code
    const invite = await ctx.db
      .query("householdInvites")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      throw new Error("Invite code has expired");
    }

    // Verify household exists
    const household = await ctx.db.get(invite.householdId);
    if (!household) {
      throw new Error("Household not found");
    }

    // Check if user is already a member (shouldn't happen, but double-check)
    const existingMember = await ctx.db
      .query("householdMembers")
      .withIndex("by_householdId_and_userId", (q) =>
        q.eq("householdId", invite.householdId).eq("userId", userId)
      )
      .first();

    if (existingMember) {
      throw new Error("User is already a member of this household");
    }

    // Add user to household
    await ctx.db.insert("householdMembers", {
      householdId: invite.householdId,
      userId,
    });

    return invite.householdId;
  },
});

/**
 * Remove a member from the household (only creator can do this)
 */
export const removeHouseholdMember = mutation({
  args: {
    memberId: v.id("householdMembers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db.get(args.memberId);
    if (!membership) {
      throw new Error("Member not found");
    }

    const household = await ctx.db.get(membership.householdId);
    if (!household) {
      throw new Error("Household not found");
    }

    // Only the creator can remove members
    if (household.createdBy !== userId) {
      throw new Error("Only the household creator can remove members");
    }

    // Cannot remove yourself
    if (membership.userId === userId) {
      throw new Error("Cannot remove yourself from the household");
    }

    await ctx.db.delete(args.memberId);
    return null;
  },
});

