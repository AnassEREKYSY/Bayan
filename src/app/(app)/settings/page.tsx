import { Download } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DeleteAccountForm, PasswordForm, ProfileForm, ThemePicker } from "@/components/forms/settings-forms";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/server/auth";
import { getPageContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("settings") };
}

export default async function SettingsPage() {
  const [{ profile }, user] = await Promise.all([getPageContext(), requireUser()]);
  const t = await getTranslations("settings");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="flex flex-col divide-y divide-border">
        <Section title={t("profile")} description={user.email ?? undefined}>
          <ProfileForm displayName={profile.display_name ?? ""} baseCurrency={profile.base_currency} locale={profile.locale} />
        </Section>
        <Section title={t("appearance")} description={t("appearanceHint")}>
          <ThemePicker />
        </Section>
        <Section title={t("security")} description={t("securityHint")}>
          <PasswordForm />
        </Section>
        <Section title={t("data")} description={t("dataHint")}>
          <Button variant="secondary" asChild>
            <a href="/api/export" download>
              <Download />
              {t("export")}
            </a>
          </Button>
        </Section>
        <Section title={t("danger")} description={t("dangerHint")} danger>
          <DeleteAccountForm />
        </Section>
      </div>
    </>
  );
}

/** Settings row: explanation on the left, the controls in a panel on the right. */
function Section({
  title,
  description,
  danger,
  children,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 py-8 first:pt-2 md:grid-cols-[240px_1fr] md:gap-10">
      <div>
        <h2 className={danger ? "font-semibold text-loss" : "font-semibold text-fg"}>{title}</h2>
        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      </div>
      <Card className={danger ? "border-loss/30" : undefined}>
        <CardBody className="max-w-2xl">{children}</CardBody>
      </Card>
    </section>
  );
}
