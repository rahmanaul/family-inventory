"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set. Please set it in your Convex dashboard.");
  }
  return new Resend(apiKey);
}

const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:5173";

export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const verificationUrl = `${siteUrl}/verify-email?token=${args.token}`;
    const resend = getResend();

    await resend.emails.send({
      from: fromEmail,
      to: args.email,
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Verify your email address</h1>
          <p style="color: #666; line-height: 1.6;">
            Thank you for signing up! Please click the button below to verify your email address.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 12px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${verificationUrl}" style="color: #0070f3;">${verificationUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
    });

    return null;
  },
});

export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const resetUrl = `${siteUrl}/reset-password?token=${args.token}`;
    const resend = getResend();

    await resend.emails.send({
      from: fromEmail,
      to: args.email,
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reset your password</h1>
          <p style="color: #666; line-height: 1.6;">
            You requested to reset your password. Click the button below to set a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 12px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #0070f3;">${resetUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
          </p>
        </div>
      `,
    });

    return null;
  },
});

