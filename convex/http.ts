import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

auth.addHttpRoutes(http);

// Email verification endpoint
http.route({
  path: "/verify-email",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing verification token", { status: 400 });
    }

    try {
      const result = await ctx.runMutation(internal.authFunctions.verifyEmailToken, {
        token,
      });

      if (!result) {
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head><title>Verification Failed</title></head>
            <body>
              <h1>Email Verification Failed</h1>
              <p>The verification link is invalid or has expired.</p>
              <p><a href="${process.env.CONVEX_SITE_URL || "http://localhost:5173"}">Return to app</a></p>
            </body>
          </html>`,
          {
            status: 400,
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      // Redirect to app with success message
      const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:5173";
      return Response.redirect(`${siteUrl}?verified=true`, 302);
    } catch (error: any) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Verification Error</title></head>
          <body>
            <h1>Verification Error</h1>
            <p>${error.message || "An error occurred during verification."}</p>
            <p><a href="${process.env.CONVEX_SITE_URL || "http://localhost:5173"}">Return to app</a></p>
          </body>
        </html>`,
        {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  }),
});

// Password reset page (GET) - serves the reset form
http.route({
  path: "/reset-password",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Reset Password</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
              button { width: 100%; padding: 10px; background: #0070f3; color: white; border: none; cursor: pointer; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1>Reset Password</h1>
            <p class="error">Missing reset token</p>
            <p><a href="${process.env.CONVEX_SITE_URL || "http://localhost:5173"}">Return to app</a></p>
          </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Validate token
    const tokenData = await ctx.runQuery(internal.authFunctions.getPasswordResetToken, {
      token,
    });

    if (!tokenData) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Reset Password</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
              button { width: 100%; padding: 10px; background: #0070f3; color: white; border: none; cursor: pointer; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1>Reset Password</h1>
            <p class="error">Invalid or expired reset token</p>
            <p><a href="${process.env.CONVEX_SITE_URL || "http://localhost:5173"}">Return to app</a></p>
          </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Serve reset password form
    const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:5173";
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Reset Password</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
            input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
            button { width: 100%; padding: 10px; background: #0070f3; color: white; border: none; cursor: pointer; }
            .error { color: red; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <h1>Reset Password</h1>
          <form id="resetForm">
            <input type="password" id="password" placeholder="New Password" required minlength="8">
            <input type="password" id="confirmPassword" placeholder="Confirm Password" required>
            <button type="submit">Reset Password</button>
          </form>
          <p id="message"></p>
          <script>
            document.getElementById('resetForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const password = document.getElementById('password').value;
              const confirmPassword = document.getElementById('confirmPassword').value;
              const messageEl = document.getElementById('message');
              
              if (password !== confirmPassword) {
                messageEl.textContent = 'Passwords do not match';
                messageEl.className = 'error';
                return;
              }
              
              if (password.length < 8) {
                messageEl.textContent = 'Password must be at least 8 characters';
                messageEl.className = 'error';
                return;
              }
              
              try {
                const response = await fetch('${siteUrl}/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token: '${token}', password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  messageEl.textContent = 'Password reset successfully! Redirecting...';
                  messageEl.className = 'success';
                  setTimeout(() => {
                    window.location.href = '${siteUrl}';
                  }, 2000);
                } else {
                  messageEl.textContent = data.error || 'Failed to reset password';
                  messageEl.className = 'error';
                }
              } catch (error) {
                messageEl.textContent = 'An error occurred. Please try again.';
                messageEl.className = 'error';
              }
            });
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }),
});

// Password reset submission (POST)
http.route({
  path: "/reset-password",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { token, password } = body;

      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: "Missing token or password" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate token
      const tokenData = await ctx.runQuery(internal.authFunctions.getPasswordResetToken, {
        token,
      });

      if (!tokenData) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired reset token" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Update password using the auth system
      // We'll use the Password provider's update method via HTTP
      const userId = tokenData.userId;
      const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:5173";
      
      // The password update will be handled by calling the auth API
      // For now, we'll redirect to frontend which will complete the reset
      // Delete token after successful update
      await ctx.runMutation(internal.authFunctions.updatePasswordWithToken, {
        userId,
        newPassword: password,
        token,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to reset password" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Change password endpoint (for authenticated users)
http.route({
  path: "/change-password",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = await request.json();
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return new Response(
          JSON.stringify({ error: "Missing current password or new password" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Verify current password and update to new password
      // @convex-dev/auth manages passwords, so we need to use their API
      // For now, we'll schedule a mutation to handle this
      await ctx.scheduler.runAfter(0, internal.authFunctions.updatePassword, {
        userId: identity.subject as any,
        currentPassword,
        newPassword,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to change password" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
