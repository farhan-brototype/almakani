import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { ManageTabs } from "@/components/ManageTabs";
import { PublicShell } from "@/components/PublicShell";
import { CardTab } from "@/components/certificate/card-tab";
import { CertificateTab } from "@/components/certificate/certificate-tab";
import { FEST } from "@/config";
import { useRealtime } from "@/hooks/use-realtime";
import { fetchCardStudents, fetchCertificateRows, type CardStudent } from "@/lib/certificates";
import type { PublicResultRow } from "@/lib/results";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: `Certificate & Card — ${FEST.name}` },
      {
        name: "description",
        content: `Download your ${FEST.name} certificate of achievement or personal achievement card.`,
      },
      { property: "og:title", content: `Certificate & Card — ${FEST.name}` },
      {
        property: "og:description",
        content: `Preview and download certificates and achievement cards of ${FEST.name}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatePage,
});

const TABS = [
  { id: "certificate", label: "Certificate" },
  { id: "card", label: "My Card" },
];

function CertificatePage() {
  const [tab, setTab] = useState("certificate");
  const [rows, setRows] = useState<PublicResultRow[]>([]);
  const [students, setStudents] = useState<CardStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await fetchCertificateRows();
    setRows(list);
    setStudents(await fetchCardStudents(list));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "students", "programs"], () => void load());

  return (
    <PublicShell
      title="Certificate"
      subtitle="Preview and download your certificate of achievement or personal achievement card."
    >
      <ManageTabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {tab === "certificate" ? (
          <CertificateTab rows={rows} loading={loading} />
        ) : (
          <CardTab rows={rows} students={students} loading={loading} />
        )}
      </div>
    </PublicShell>
  );
}
