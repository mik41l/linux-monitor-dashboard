import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getJson, postJson, putJson } from "../../api/client.js";
import { changeOwnPassword, type AuthUser, useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatTimestamp } from "../../lib/format.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";

interface LoginLog {
  id: number;
  userId: number | null;
  email: string;
  status: "success" | "failure";
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface UserFormState {
  id?: number;
  email: string;
  username: string;
  fullName: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "disabled";
  password: string;
  mustChangePassword: boolean;
}

const emptyUserForm: UserFormState = {
  email: "",
  username: "",
  fullName: "",
  role: "operator",
  status: "active",
  password: "",
  mustChangePassword: false
};

function roleLabel(role: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (role === "admin") return t("roleAdmin");
  if (role === "operator") return t("roleOperator");
  if (role === "viewer") return t("roleViewer");
  return role;
}

function statusLabel(status: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (status === "active") return t("active");
  if (status === "disabled") return t("disabledStatus");
  if (status === "success") return t("successStatus");
  if (status === "failure") return t("failureStatus");
  return status;
}

export function UsersPage() {
  const { user, refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
  const [passwordReset, setPasswordReset] = useState({ userId: "", password: "", mustChangePassword: true });
  const [ownPassword, setOwnPassword] = useState({ currentPassword: "", newPassword: "" });
  const isAdmin = user?.role === "admin";

  const usersQuery = useQuery({
    enabled: isAdmin,
    queryKey: ["users"],
    queryFn: () => getJson<AuthUser[]>("/api/users")
  });
  const loginLogsQuery = useQuery({
    enabled: isAdmin,
    queryKey: ["login-logs"],
    queryFn: () => getJson<LoginLog[]>("/api/auth/login-logs", { limit: 50 })
  });

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (form.id) {
        return putJson<AuthUser, Omit<UserFormState, "id" | "password">>(`/api/users/${form.id}`, {
          email: form.email,
          username: form.username,
          fullName: form.fullName,
          role: form.role,
          status: form.status,
          mustChangePassword: form.mustChangePassword
        });
      }

      return postJson<AuthUser, UserFormState>("/api/users", form);
    },
    onSuccess: () => {
      toast.success(t("userSaved"));
      setForm(emptyUserForm);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      putJson<AuthUser, { password: string; mustChangePassword: boolean }>(
        `/api/users/${passwordReset.userId}/password`,
        {
          password: passwordReset.password,
          mustChangePassword: passwordReset.mustChangePassword
        }
      ),
    onSuccess: () => {
      toast.success(t("passwordUpdated"));
      setPasswordReset({ userId: "", password: "", mustChangePassword: true });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const changeOwnPasswordMutation = useMutation({
    mutationFn: () => changeOwnPassword(ownPassword),
    onSuccess: async () => {
      toast.success(t("passwordUpdated"));
      setOwnPassword({ currentPassword: "", newPassword: "" });
      await refreshUser();
    }
  });

  const submitUser = (event: FormEvent) => {
    event.preventDefault();
    saveUserMutation.mutate();
  };

  const submitPasswordReset = (event: FormEvent) => {
    event.preventDefault();
    resetPasswordMutation.mutate();
  };

  const submitOwnPassword = (event: FormEvent) => {
    event.preventDefault();
    changeOwnPasswordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("navUsers")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{t("usersTitle")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{t("usersSubtitle")}</p>
      </section>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("ownPasswordTitle")}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{t("changePassword")}</h3>
            <p className="mt-2 text-sm text-slate-400">{t("ownPasswordHint")}</p>
          </div>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submitOwnPassword}>
            <Input
              autoComplete="current-password"
              onChange={(event) => setOwnPassword((current) => ({ ...current, currentPassword: event.target.value }))}
              placeholder={t("currentPassword")}
              type="password"
              value={ownPassword.currentPassword}
            />
            <Input
              autoComplete="new-password"
              onChange={(event) => setOwnPassword((current) => ({ ...current, newPassword: event.target.value }))}
              placeholder={t("newPassword")}
              type="password"
              value={ownPassword.newPassword}
            />
            <Button disabled={changeOwnPasswordMutation.isPending} type="submit">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isAdmin ? (
        <div className="rounded-[32px] border border-amber-300/20 bg-amber-300/10 p-6 text-sm text-amber-100">
          {t("adminOnly")}
        </div>
      ) : (
        <>
          <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="text-xl font-semibold text-white">
                  {form.id ? t("updateUser") : t("createUser")}
                </h3>
                <form className="space-y-3" onSubmit={submitUser}>
                  <Input
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t("email")}
                    type="email"
                    value={form.email}
                  />
                  <Input
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder={t("username")}
                    value={form.username}
                  />
                  <Input
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder={t("fullName")}
                    value={form.fullName}
                  />
                  {!form.id ? (
                    <Input
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder={t("password")}
                      type="password"
                      value={form.password}
                    />
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select
                      onChange={(event) =>
                        setForm((current) => ({ ...current, role: event.target.value as UserFormState["role"] }))
                      }
                      value={form.role}
                    >
                      <option value="admin">{t("roleAdmin")}</option>
                      <option value="operator">{t("roleOperator")}</option>
                      <option value="viewer">{t("roleViewer")}</option>
                    </Select>
                    <Select
                      onChange={(event) =>
                        setForm((current) => ({ ...current, status: event.target.value as UserFormState["status"] }))
                      }
                      value={form.status}
                    >
                      <option value="active">{t("active")}</option>
                      <option value="disabled">{t("disabledStatus")}</option>
                    </Select>
                  </div>
                  <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <input
                      checked={form.mustChangePassword}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, mustChangePassword: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    {t("mustChangePassword")}
                  </label>
                  <div className="flex gap-3">
                    <Button disabled={saveUserMutation.isPending} type="submit">
                      {t("save")}
                    </Button>
                    {form.id ? (
                      <Button onClick={() => setForm(emptyUserForm)} type="button" variant="outline">
                        {t("close")}
                      </Button>
                    ) : null}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h3 className="text-xl font-semibold text-white">{t("resetPassword")}</h3>
                <form className="space-y-3" onSubmit={submitPasswordReset}>
                  <Select
                    onChange={(event) => setPasswordReset((current) => ({ ...current, userId: event.target.value }))}
                    value={passwordReset.userId}
                  >
                    <option value="">{t("allAgentsOption")}</option>
                    {(usersQuery.data?.data ?? []).map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.fullName} ({record.email})
                      </option>
                    ))}
                  </Select>
                  <Input
                    onChange={(event) => setPasswordReset((current) => ({ ...current, password: event.target.value }))}
                    placeholder={t("newPassword")}
                    type="password"
                    value={passwordReset.password}
                  />
                  <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <input
                      checked={passwordReset.mustChangePassword}
                      onChange={(event) =>
                        setPasswordReset((current) => ({
                          ...current,
                          mustChangePassword: event.target.checked
                        }))
                      }
                      type="checkbox"
                    />
                    {t("mustChangePassword")}
                  </label>
                  <Button disabled={resetPasswordMutation.isPending || !passwordReset.userId} type="submit">
                    {t("resetPassword")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h3 className="text-xl font-semibold text-white">{t("usersTitle")}</h3>
              <div className="space-y-3">
                {(usersQuery.data?.data ?? []).map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{record.fullName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {record.email} · {record.username}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={record.status === "active" ? "success" : "muted"}>
                        {statusLabel(record.status, t)}
                      </Badge>
                      <Badge variant={record.role === "admin" ? "warning" : "muted"}>
                        {roleLabel(record.role, t)}
                      </Badge>
                      <Button
                        onClick={() =>
                          setForm({
                            id: record.id,
                            email: record.email,
                            username: record.username,
                            fullName: record.fullName,
                            role: record.role,
                            status: record.status,
                            password: "",
                            mustChangePassword: record.mustChangePassword
                          })
                        }
                        type="button"
                        variant="outline"
                      >
                        {t("updateUser")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("loginLogs")}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{t("loginLogsHint")}</h3>
              </div>
              <div className="space-y-3">
                {(loginLogsQuery.data?.data ?? []).map((log) => (
                  <div key={log.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{log.email}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {log.ipAddress ?? "n/a"} · {formatTimestamp(log.createdAt, language)}
                        </p>
                      </div>
                      <Badge variant={log.status === "success" ? "success" : "destructive"}>
                        {statusLabel(log.status, t)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {t("reason")}: {log.reason ?? "n/a"} · {t("userAgent")}: {log.userAgent ?? "n/a"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
