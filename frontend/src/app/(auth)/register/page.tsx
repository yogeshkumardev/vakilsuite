"use client";

import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth.store";
import { ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/shared/Button";
import { CONTROL_CLASS } from "@/components/ui/Field";

const registerSchema = z
    .object({
        full_name: z.string().min(1, "Full name required").max(200),
        email: z.string().email("Valid email required"),
        password: z.string().min(15, "Password must be at least 15 characters"),
        confirm_password: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const { setAuth } = useAuthStore();
    const [serverError, setServerError] = useState<string | null>(null);
    const [googlePending, setGooglePending] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        if (googlePending) return;
        setServerError(null);
        try {
            await authApi.register(data.email, data.password, data.full_name);
            router.push("/verify-email");
        } catch (e) {
            if (e instanceof ApiClientError) {
                if (e.status === 409) {
                    setServerError("This email is already registered. Please sign in.");
                } else {
                    setServerError(e.message);
                }
            } else {
                setServerError("Something went wrong. Please try again.");
            }
        }
    };

    const handleGoogleSuccess = async ({ credential }: CredentialResponse) => {
        if (googlePending || isSubmitting) return;
        if (!credential) { setServerError("Google did not return a credential. Please try again."); return; }
        setGooglePending(true);
        setServerError(null);
        try {
            const res = await authApi.loginWithGoogle(credential);
            setAuth(res.user, res.access_token);
            router.push("/dashboard");
        } catch (error) {
            setServerError(error instanceof ApiClientError ? error.message : "Google sign-up failed. Please try again.");
        } finally {
            setGooglePending(false);
        }
    };

    const inputClass = `${CONTROL_CLASS} h-10`;

    return (
        <div className="auth-page min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        VakilSuite
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Allahabad High Court</p>
                </div>

                {/* Card */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-800 mb-5 text-center">
                        Create your account
                    </h2>

                    {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <>
                        <div className="flex justify-center mb-5" inert={googlePending || isSubmitting}>
                            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setServerError("Google sign-up failed. Please try again.")} theme="outline" size="large" text="signup_with" width={230} />
                        </div>
                        <p className="text-center text-xs text-slate-500 mb-5">Or create an account with email</p>
                    </>}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input
                                {...register("full_name")}
                                type="text"
                                autoComplete="name"
                                placeholder="Adv. Ramesh Sharma"
                                className={inputClass}
                            />
                            {errors.full_name && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.full_name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                {...register("email")}
                                type="email"
                                autoComplete="email"
                                placeholder="adv.sharma@example.com"
                                className={inputClass}
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <input
                                {...register("password")}
                                type="password"
                                autoComplete="new-password"
                                placeholder="Min. 8 characters"
                                className={inputClass}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                {...register("confirm_password")}
                                type="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                className={inputClass}
                            />
                            {errors.confirm_password && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.confirm_password.message}
                                </p>
                            )}
                        </div>

                        {serverError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                                {serverError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            fullWidth
                            loading={isSubmitting || googlePending}
                        >
                            {isSubmitting ? "Creating account…" : "Create account"}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-5">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-indigo-600 font-medium hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    VakilSuite — For lawyers only. Contact your administrator for access.
                </p>
            </div>
        </div>
    );
}
