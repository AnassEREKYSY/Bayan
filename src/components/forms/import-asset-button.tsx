"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { importAsset } from "@/server/actions/market";

/** Adds a catalogue result to Bayan, then opens its page. */
export function ImportAssetButton({ provider, providerRef, name }: { provider: string; providerRef: string; name: string }) {
  const t = useTranslations("markets");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const res = await importAsset(provider, providerRef);
      if (res.ok && res.data) router.push(routes.asset(res.data.id));
      else if (!res.ok) toast.error(tErr(res.error as never));
    });

  return (
    <Button variant="secondary" size="sm" onClick={add} disabled={pending} aria-label={t("addNamed", { name })}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      {pending ? t("adding") : t("add")}
    </Button>
  );
}
