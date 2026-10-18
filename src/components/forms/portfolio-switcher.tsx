"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Select } from "@/components/ui/form";

export function PortfolioSwitcher({
  portfolios,
  currentId,
}: {
  portfolios: { id: string; name: string }[];
  currentId?: string;
}) {
  const t = useTranslations("portfolio");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (portfolios.length < 2) return null;

  return (
    <div className="w-48">
      <label htmlFor="portfolio-switcher" className="sr-only">
        {t("switch")}
      </label>
      <Select
        id="portfolio-switcher"
        value={currentId}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("p", e.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {portfolios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
