"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Card, CardHeader, CardBody, Input, Button } from "@heroui/react";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { updatePassword } from "@/app/actions/auth";
import { validatePassword } from "@/utils/auth/validation";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user has a valid session (from reset link)
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Invalid or expired reset link. Please request a new password reset.");
        setChecking(false);
        return;
      }

      setValidSession(true);
      setChecking(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(newPassword);

      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-teal-300 flex flex-col p-4">
        <Header />
        <div className="flex-grow flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md p-6">
            <CardBody className="text-center">
              <p>Verifying reset link...</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen bg-teal-300 flex flex-col p-4">
        <Header />
        <div className="flex-grow flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md p-6">
            <CardBody>
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Invalid Reset Link</p>
                  <p className="mt-1">{error}</p>
                  <Button
                    color="primary"
                    className="mt-4"
                    onPress={() => router.push("/login")}
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-300 flex flex-col p-4">
      <Header />
      <div className="flex-grow flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-6 md:p-10">
          <CardHeader className="flex gap-2 pb-6">
            <Lock className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Reset Password</h2>
          </CardHeader>
          <CardBody>
            {success ? (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Password Updated!</p>
                  <p className="mt-1">Your password has been successfully reset. Redirecting to home...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  Enter your new password below. Make sure it&apos;s at least 8 characters long.
                </p>

                <Input
                  type="password"
                  label="New Password"
                  placeholder="Enter your new password"
                  variant="bordered"
                  value={newPassword}
                  onValueChange={setNewPassword}
                  isRequired
                />

                <Input
                  type="password"
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  variant="bordered"
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  fullWidth
                  startContent={<Lock className="w-4 h-4" />}
                  isLoading={loading}
                  isDisabled={loading}
                >
                  {loading ? "Updating Password..." : "Update Password"}
                </Button>

                <Button
                  variant="light"
                  size="sm"
                  onPress={() => router.push("/login")}
                  isDisabled={loading}
                >
                  Back to Login
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
