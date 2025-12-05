import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// This will be called after user signup to send verification email
export const onUserCreated = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Create user profile with unverified status
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingProfile) {
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        emailVerified: false,
      });
    }

    // Create and send verification token
    const token = await ctx.runMutation(internal.authFunctions.createVerificationToken, {
      userId: args.userId,
      email: args.email,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendVerificationEmail, {
      email: args.email,
      token,
    });

    return null;
  },
});


