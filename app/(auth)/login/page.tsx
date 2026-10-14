"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { loginSchema, zodFieldErrors } from "@/lib/validation";

export default function LoginPage() {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.flattenErrors());
        setFormError(error.firstError());
      } else {
        setFormError("Tidak dapat terhubung ke server. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Masuk
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Masuk untuk melanjutkan ke dashboard.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {formError ? <ErrorBanner message={formError} /> : null}

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={values.email}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, email: event.target.value }))
            }
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={values.password}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, password: event.target.value }))
            }
          />
        </Field>

        <Button type="submit" className="w-full" loading={submitting}>
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Daftar
        </Link>
      </p>
    </Card>
  );
}
