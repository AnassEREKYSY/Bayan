"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

/** Shown when a page fails to load. Never displays the raw error to the user. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error.digest ?? "page error");
  }, [error]);

  return (
    <Card>
      <EmptyState
        title={t("title")}
        description={t("text")}
        action={
          <Button onClick={reset} variant="secondary">
            <RotateCcw />
            {t("retry")}
          </Button>
        }
      />
    </Card>
  );
}
