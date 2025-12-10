import { Outlet, createRootRoute, Link, useLocation } from '@tanstack/react-router'
import { ConvexReactClient, Authenticated, Unauthenticated } from 'convex/react'
import { ConvexAuthProvider, useAuthActions } from '@convex-dev/auth/react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'

const convexUrl = import.meta.env.VITE_CONVEX_URL
if (!convexUrl) {
  throw new Error(
    "Missing VITE_CONVEX_URL environment variable. " +
    "Set it in deployment to the production Convex URL, " +
    "or make sure you're running `npx convex dev`."
  );
}

const convex = new ConvexReactClient(convexUrl);

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ConvexAuthProvider client={convex}>
      <Authenticated>
        <div className="min-h-screen">
          <Toaster position="top-right" richColors />
          <Header />
          <main className="container mx-auto p-4">
            <Outlet />
          </main>
        </div>
      </Authenticated>
      <Unauthenticated>
        <Toaster position="top-right" richColors />
        <UnauthenticatedContent />
      </Unauthenticated>
    </ConvexAuthProvider>
  )
}

function UnauthenticatedContent() {
  const location = useLocation()
  const publicRoutes = ['/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.includes(location.pathname)

  if (isPublicRoute) {
    return <Outlet />
  }

  return <SignInPage />
}

function Header() {
  const { signOut } = useAuthActions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          Family Inventory
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Link to="/inventory" className="text-sm hover:underline">
            Inventory
          </Link>
          <Link to="/shopping-list" className="text-sm hover:underline">
            Shopping List
          </Link>
          <Link to="/settings" className="text-sm hover:underline">
            Settings
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signOut()}
          >
            Sign Out
          </Button>
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Side Menu */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Side Menu */}
          <div className="fixed top-0 right-0 h-full w-64 bg-background border-l shadow-lg z-50 md:hidden animate-in slide-in-from-right duration-200">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="text-lg font-semibold">Menu</span>
                <button
                  className="p-2 rounded-md hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col flex-1 p-4 gap-2">
                <Link
                  to="/inventory"
                  className="px-4 py-3 rounded-md hover:bg-accent text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Inventory
                </Link>
                <Link
                  to="/shopping-list"
                  className="px-4 py-3 rounded-md hover:bg-accent text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Shopping List
                </Link>
                <Link
                  to="/settings"
                  className="px-4 py-3 rounded-md hover:bg-accent text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <div className="mt-auto pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void signOut();
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function SignInPage() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccess('Email verified successfully! You can now sign in.');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col gap-8 w-full max-w-md p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Family Inventory</h1>
          <p className="text-muted-foreground mt-2">
            {flow === "signIn" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">
              {success}
            </p>
          </div>
        )}
        
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            formData.set("flow", flow);
            void signIn("password", formData).catch((error) => {
              setError(error.message);
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          
          {flow === "signIn" && (
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
          )}
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}
          
          <Button type="submit" className="w-full">
            {flow === "signIn" ? "Sign in" : "Sign up"}
          </Button>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {flow === "signIn"
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError(null);
                setSuccess(null);
              }}
              className="text-primary hover:underline font-medium"
            >
              {flow === "signIn" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
