import { Download } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DeleteAccountForm, PasswordForm, ProfileForm, ThemePicker } from "@/components/forms/settings-forms";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title={t("profile")} description={user.email ?? undefined} />
          <CardBody>
            <ProfileForm displayName={profile.display_name ?? ""} baseCurrency={profile.base_currency} locale={profile.locale} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("appearance")} description={t("appearanceHint")} />
          <CardBody>
            <ThemePicker />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("security")} description={t("securityHint")} />
          <CardBody>
            <PasswordForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("data")} description={t("dataHint")} />
          <CardBody>
            <Button variant="secondary" asChild>
              <a href="/api/export" download>
                <Download />
                {t("export")}
              </a>
            </Button>
          </CardBody>
        </Card>

        <Card className="border-loss/40">
          <CardHeader title={t("danger")} description={t("dangerHint")} />
          <CardBody>
            <DeleteAccountForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
