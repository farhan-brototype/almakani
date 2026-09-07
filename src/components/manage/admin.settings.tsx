import {
  EyeOff,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, refreshSiteSettings, type SiteSettings } from "@/lib/site";
import { deletePublicFile, uploadPublicFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useRealtime } from "@/hooks/use-realtime";
import { PageHeading } from "@/components/PageHeading";


export function SettingsPage() {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("fest_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setForm({ ...DEFAULT_SETTINGS, ...(data as Partial<SiteSettings>) });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  // Live: a change made in another tab or by another admin lands here at once.
  useRealtime(["fest_settings"], () => void load());

  const patch = (key: keyof SiteSettings, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }) as SiteSettings);

  const save = async (override?: Partial<SiteSettings>): Promise<void> => {
    setSaving(true);
    // gallery_link is saved on its own (the column may not exist yet on older DBs)
    const { gallery_link: _ignored, ...rest } = { ...form, ...override };
    const payload = { ...rest, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("fest_settings").update(payload).eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Settings saved");
    void refreshSiteSettings();
  };

  const saveGalleryLink = async (): Promise<void> => {
    const value = (form.gallery_link ?? "").trim();
    setSavingLink(true);
    const { error } = await supabase
      .from("fest_settings")
      .update({ gallery_link: value || null } as never)
      .eq("id", 1);
    setSavingLink(false);
    if (error) {
      toast.error(
        /gallery_link/.test(error.message)
          ? "Run supabase/gallery-link.sql in the SQL editor to enable this field."
          : error.message,
      );
      return;
    }
    toast.success("Gallery link saved");
    void refreshSiteSettings();
  };


  const pickLogo = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file (PNG, JPG or SVG)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPublicFile("fest-branding", file);
      const previous = form.logo_url;
      patch("logo_url", url);
      await save({ logo_url: url });
      if (previous) await deletePublicFile("fest-branding", previous).catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the logo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async (): Promise<void> => {
    const previous = form.logo_url;
    patch("logo_url", null);
    await save({ logo_url: null });
    if (previous) await deletePublicFile("fest-branding", previous).catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <PageHeading title="Settings" />
        <p className="text-sm text-muted-foreground">
          Site visibility and public content. Every management area has its own menu option.
        </p>
      </div>

      <section className="panel space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Fest logo</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Used on the menu, the home page, the sign-in page and the browser tab. Square PNG works
          best. Max 5MB.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Fest logo" className="size-full object-contain" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickLogo(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={uploading || saving}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {form.logo_url ? "Replace logo" : "Upload logo"}
          </Button>
          {form.logo_url && (
            <Button
              variant="ghost"
              className="gap-2 text-destructive"
              disabled={uploading || saving}
              onClick={() => void removeLogo()}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Gallery link</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste the album link (Google Photos, Drive, Instagram…). The Gallery page then shows an
          “All Photos” button that opens it in a new tab. Leave empty to hide the button.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-1.5">
            <Label>All Photos link</Label>
            <Input
              type="url"
              placeholder="https://photos.app.goo.gl/…"
              value={form.gallery_link ?? ""}
              onChange={(e) => patch("gallery_link", e.target.value)}
            />
          </div>
          <Button className="gap-2" disabled={savingLink} onClick={() => void saveGalleryLink()}>
            {savingLink ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save link
          </Button>
        </div>
      </section>


      <section className="panel space-y-4 p-5">
        <div className="flex items-center gap-2">
          <EyeOff className="size-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Main page visibility</h2>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">
              Main page is {form.main_hidden ? "hidden" : "visible"}
            </p>
            <p className="text-xs text-muted-foreground">
              When hidden, visitors see a short notice instead of the home page. The menu stays
              usable.
            </p>
          </div>
          <Switch
            checked={form.main_hidden}
            onCheckedChange={(v) => {
              patch("main_hidden", v);
              void save({ main_hidden: v });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notice shown while hidden</Label>
          <Input
            value={form.maintenance_message ?? ""}
            onChange={(e) => patch("maintenance_message", e.target.value)}
          />
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Public content</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Fest name</Label>
            <Input value={form.fest_name} onChange={(e) => patch("fest_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hero title</Label>
            <Input
              value={form.hero_title ?? ""}
              onChange={(e) => patch("hero_title", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Hero subtitle</Label>
            <Input
              value={form.hero_subtitle ?? ""}
              onChange={(e) => patch("hero_subtitle", e.target.value)}
            />
          </div>
        </div>
        <Button className="gap-2" disabled={saving} onClick={() => void save()}>
          <Save className="size-4" /> Save settings
        </Button>
      </section>
    </div>
  );
}
