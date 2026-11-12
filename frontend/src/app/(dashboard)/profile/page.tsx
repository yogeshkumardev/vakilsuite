"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/lib/api/auth";
import { DeviceSessions } from "@/components/auth/DeviceSessions";
import { useAuthStore } from "@/store/auth.store";
import { ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/shared/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CONTROL_CLASS } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

// ── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
    full_name: z.string().min(1, "Full name is required").max(200),
    enrollment_number: z.string().min(1, "Enrollment number is required").max(100),
    designation: z.enum(["advocate", "aor", "senior_advocate"]),
    chamber_number: z.string().min(1, "Chamber number is required").max(100),
    court_name: z.string().min(1, "Court name is required").max(300),
    office_address_line1: z.string().min(1, "Address is required").max(300),
    office_address_line2: z.string().max(300).optional(),
    city: z.string().min(1, "City is required").max(100),
    district: z.string().min(1, "District is required").max(100),
    state: z.string().min(1, "State is required").max(100),
    mobile_number: z.string().min(10, "Valid mobile number required").max(20),
    alternate_mobile: z.string().max(20).optional(),
    default_district: z.string().max(100).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z
    .object({
        current_password: z.string().min(1, "Current password is required"),
        new_password: z.string().min(15, "Password must be at least 15 characters"),
        confirm_password: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    });

type PasswordFormData = z.infer<typeof passwordSchema>;

// ── Components ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
    const { user, setAuth } = useAuthStore();

    const [profileMessage, setProfileMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const [passwordMessage, setPasswordMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // Profile Form
    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: user?.full_name ?? "",
            enrollment_number: user?.enrollment_number ?? "",
            designation: user?.designation ?? "advocate",
            chamber_number: user?.chamber_number ?? "",
            court_name: user?.court_name ?? "High Court of Judicature at Allahabad",
            office_address_line1: user?.office_address_line1 ?? "",
            office_address_line2: user?.office_address_line2 ?? "",
            city: user?.city ?? "",
            district: user?.district ?? "",
            state: user?.state ?? "",
            mobile_number: user?.mobile_number ?? "",
            alternate_mobile: user?.alternate_mobile ?? "",
            default_district: user?.default_district ?? "",
        },
    });

    // Password Form
    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPassword,
        formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
    });

    const onProfileSubmit = async (data: ProfileFormData) => {
        setProfileMessage(null);
        try {
            const res = await authApi.updateProfile(data);
            if (user) {
                // Update local auth store with new user data
                setAuth(res, useAuthStore.getState().accessToken!);
            }
            setProfileMessage({ type: "success", text: "Profile updated successfully." });
        } catch (e) {
            if (e instanceof ApiClientError) {
                setProfileMessage({ type: "error", text: e.message });
            } else {
                setProfileMessage({ type: "error", text: "Failed to update profile." });
            }
        }
    };

    const onPasswordSubmit = async (data: PasswordFormData) => {
        setPasswordMessage(null);
        try {
            await authApi.changePassword(data.current_password, data.new_password);
            setPasswordMessage({ type: "success", text: "Password changed successfully." });
            resetPassword();
        } catch (e) {
            if (e instanceof ApiClientError) {
                setPasswordMessage({ type: "error", text: e.message });
            } else {
                setPasswordMessage({ type: "error", text: "Failed to change password." });
            }
        }
    };

    const inputClass = `${CONTROL_CLASS} h-10`;

    return (
        <WorkspacePage variant="form" className="space-y-6">
            <PageHeader
                title="Profile Settings"
                description="Manage your personal information and security preferences."
            />

            <Surface className="flex flex-wrap items-center gap-3 p-4" aria-label="Account identity">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                    {user?.full_name?.trim().charAt(0).toUpperCase() || "U"}
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{user?.full_name || "Your account"}</span>
                    <span className="block truncate text-xs text-slate-500">{user?.email}</span>
                </span>
                <Badge tone={user?.is_profile_complete ? "success" : "warning"} className="ml-auto">
                    {user?.is_profile_complete ? "Profile ready" : "Profile needs completion"}
                </Badge>
            </Surface>

            {/* Profile Section */}
            <Surface as="section" className="p-6">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">
                        Personal Information
                    </h2>
                    {!user?.is_profile_complete && (
                        <Badge tone="warning">
                            Profile Incomplete
                        </Badge>
                    )}
                </div>

                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                            <input value={user?.email ?? ""} readOnly className={inputClass} aria-describedby="email-readonly-hint" />
                            <p id="email-readonly-hint" className="mt-1 text-xs text-slate-500">Email changes require account support for security.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input {...registerProfile("full_name")} className={inputClass} />
                            {profileErrors.full_name && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.full_name.message}</p>
                            )}
                        </div>

                        {/* Designation */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Designation
                            </label>
                            <select {...registerProfile("designation")} className={inputClass}>
                                <option value="advocate">Advocate</option>
                                <option value="aor">Advocate-on-Record (AoR)</option>
                                <option value="senior_advocate">Senior Advocate</option>
                            </select>
                            {profileErrors.designation && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.designation.message}</p>
                            )}
                        </div>

                        {/* Enrollment */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Enrollment Number
                            </label>
                            <input {...registerProfile("enrollment_number")} className={inputClass} />
                            {profileErrors.enrollment_number && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.enrollment_number.message}</p>
                            )}
                        </div>

                        {/* Mobile */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mobile Number
                            </label>
                            <input {...registerProfile("mobile_number")} className={inputClass} />
                            {profileErrors.mobile_number && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.mobile_number.message}</p>
                            )}
                        </div>

                        {/* Chamber */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Chamber Number
                            </label>
                            <input {...registerProfile("chamber_number")} className={inputClass} />
                            {profileErrors.chamber_number && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.chamber_number.message}</p>
                            )}
                        </div>

                        {/* Court Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Court Name
                            </label>
                            <input {...registerProfile("court_name")} className={inputClass} />
                            {profileErrors.court_name && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.court_name.message}</p>
                            )}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Office Address Line 1
                            </label>
                            <input {...registerProfile("office_address_line1")} className={inputClass} />
                            {profileErrors.office_address_line1 && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.office_address_line1.message}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Office Address Line 2 (Optional)
                            </label>
                            <input {...registerProfile("office_address_line2")} className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                City
                            </label>
                            <input {...registerProfile("city")} className={inputClass} />
                            {profileErrors.city && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.city.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                District
                            </label>
                            <input {...registerProfile("district")} className={inputClass} />
                            {profileErrors.district && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.district.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                State
                            </label>
                            <input {...registerProfile("state")} className={inputClass} />
                            {profileErrors.state && (
                                <p className="mt-1 text-xs text-red-600">{profileErrors.state.message}</p>
                            )}
                        </div>
                    </div>

                    {profileMessage && (
                        <Alert tone={profileMessage.type === "error" ? "danger" : "success"}>
                            {profileMessage.text}
                        </Alert>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            loading={isProfileSubmitting}
                        >
                            Save Profile
                        </Button>
                    </div>
                </form>
            </Surface>

            {/* Password Section */}
            {user?.auth_provider === "email" && (
                <Surface as="section" className="p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-5">
                        Change Password
                    </h2>

                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Current Password
                            </label>
                            <input
                                type="password"
                                {...registerPassword("current_password")}
                                className={inputClass}
                            />
                            {passwordErrors.current_password && (
                                <p className="mt-1 text-xs text-red-600">{passwordErrors.current_password.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                minLength={15}
                                autoComplete="new-password"
                                {...registerPassword("new_password")}
                                className={inputClass}
                            />
                            <p className="mt-1 text-xs text-slate-500">Use at least 15 characters. Changing it signs out your other devices.</p>
                            {passwordErrors.new_password && (
                                <p className="mt-1 text-xs text-red-600">{passwordErrors.new_password.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                {...registerPassword("confirm_password")}
                                className={inputClass}
                            />
                            {passwordErrors.confirm_password && (
                                <p className="mt-1 text-xs text-red-600">{passwordErrors.confirm_password.message}</p>
                            )}
                        </div>

                        {passwordMessage && (
                            <Alert tone={passwordMessage.type === "error" ? "danger" : "success"}>
                                {passwordMessage.text}
                            </Alert>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                loading={isPasswordSubmitting}
                            >
                                Update Password
                            </Button>
                        </div>
                    </form>
                </Surface>
            )}
            <DeviceSessions />
        </WorkspacePage>
    );
}
