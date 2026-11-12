"use client";

import { authApi } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/shared/Button";
import { CONTROL_CLASS } from "@/components/ui/Field";
import { zodResolver } from "@hookform/resolvers/zod";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email("Valid email required"),
    password: z.string().min(1, "Password required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { setAuth } = useAuthStore();

    const [serverError, setServerError] = useState<string | null>(null);

    // 🔒 Prevent double login (VERY IMPORTANT)
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // 🧼 Prevent state update after unmount
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    // ------------------------------------------------------------
    // EMAIL LOGIN
    // ------------------------------------------------------------

  const onSubmit = async (data: LoginFormData) => {
    if (isAuthenticating) return;

    setServerError(null);
    setIsAuthenticating(true);

    try {
        const res = await authApi.login(data.email, data.password);

        setAuth(res.user, res.access_token);
        router.push("/dashboard");
    } catch (e) {
        if (!isMountedRef.current) return;

        if (e instanceof ApiClientError) {
            if (e.code === "EMAIL_VERIFICATION_REQUIRED") {
                router.push("/verify-email");
                return;
            }
            setServerError(
                e.status === 401
                    ? "Invalid email or password"
                    : e.message,
            );
        } else {
            setServerError("Something went wrong. Please try again.");
        }
    } finally {
        setIsAuthenticating(false);
    }
};

    // ------------------------------------------------------------
    // GOOGLE LOGIN
    // ------------------------------------------------------------

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (isAuthenticating) return;

    setServerError(null);
    setIsAuthenticating(true);

    try {
        if (!credentialResponse.credential) {
            throw new Error("No credential received");
        }

        const res = await authApi.loginWithGoogle(
            credentialResponse.credential,
        );

        setAuth(res.user, res.access_token);
        router.push("/dashboard");
    } catch (e) {
        if (!isMountedRef.current) return;

        if (e instanceof ApiClientError) {
            setServerError(e.message);
        } else {
            setServerError("Google sign in failed.");
        }
    } finally {
        setIsAuthenticating(false);
    }
};

    const inputClass = `${CONTROL_CLASS} h-10`;

    return (
        <div className='auth-page min-h-screen bg-slate-50 flex items-center justify-center p-4'>
            <div className='w-full max-w-sm'>
                {/* Logo */}
                <div className='text-center mb-8'>
                    <h1 className='text-2xl font-bold tracking-tight text-slate-900'>
                        VakilSuite
                    </h1>
                    <p className='text-sm text-slate-500 mt-1'>
                        Allahabad High Court
                    </p>
                </div>

                {/* Card */}
                <div className='rounded-lg border border-slate-200 bg-white p-6 shadow-sm'>
                    <h2 className='text-base font-semibold text-slate-800 mb-5 text-center'>
                        Sign in to your account
                    </h2>

                    {/* Google Login */}
                    {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <div className='flex justify-center mb-5'>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() =>
                                setServerError(
                                    "Google Login failed.",
                                )
                            }
                            // ❌ Removed useOneTap (major fix)
                            theme='outline'
                            size='large'
                            width={230}
                            text='continue_with'
                        />
                    </div>}

                    {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <div className='relative mb-5'>
                        <div className='absolute inset-0 flex items-center'>
                            <span className='w-full border-t border-slate-200' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                            <span className='bg-white px-2 text-slate-500'>
                                Or continue with
                            </span>
                        </div>
                    </div>}

                    <form
                        // eslint-disable-next-line react-hooks/refs
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                        className='space-y-4'
                    >
                        <div>
                            <label className='block text-sm font-medium text-slate-700 mb-1'>
                                Email
                            </label>
                            <input
                                {...register("email")}
                                type='email'
                                autoComplete='email'
                                placeholder='adv.sharma@example.com'
                                className={inputClass}
                            />
                            {errors.email && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-slate-700 mb-1'>
                                Password
                            </label>
                            <input
                                {...register("password")}
                                type='password'
                                autoComplete='current-password'
                                placeholder='••••••••'
                                className={inputClass}
                            />
                            {errors.password && (
                                <p className='mt-1 text-xs text-red-600'>
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <Link href="/forgot-password" className="block text-sm font-medium text-indigo-600 hover:underline">Forgot password?</Link>

                        {serverError && (
                            <div className='rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700'>
                                {serverError}
                            </div>
                        )}

                        <Button
                            type='submit'
                            variant='primary'
                            size='md'
                            fullWidth
                            loading={isSubmitting || isAuthenticating}
                        >
                            {isSubmitting || isAuthenticating
                                ? "Signing in…"
                                : "Sign in"}
                        </Button>
                    </form>

                    <p className='text-center text-sm text-slate-500 mt-5'>
                        Don&apos;t have an account?{" "}
                        <Link
                            href='/register'
                            className='text-indigo-600 font-medium hover:underline'
                        >
                            Sign up
                        </Link>
                    </p>
                </div>

                <p className='text-center text-xs text-slate-400 mt-6'>
                    VakilSuite — For lawyers only. Contact your administrator
                    for access.
                </p>
            </div>
        </div>
    );
}
