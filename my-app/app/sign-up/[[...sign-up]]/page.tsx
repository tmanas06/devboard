import { SignUp } from '@clerk/nextjs';
import { Terminal } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-10 w-10 text-pink-500" />
          <span className="text-3xl font-bold tracking-tighter text-gray-900">DEVBOARD</span>
        </div>
        <p className="text-lg text-gray-600">Create your account</p>
      </div>

      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50',
              formButtonPrimary:
                'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
              formFieldInput:
                'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
              footerActionLink: 'text-blue-600 hover:text-blue-700',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
        />
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Already have an account?{' '}
          <a
            href="/sign-in"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

