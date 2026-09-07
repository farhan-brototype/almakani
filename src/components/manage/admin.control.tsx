import { Check, Loader2, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  fetchFestRules,
  type CategoryItem,
  type CategoryRow,
  type ItemKind,
  type LimitRow,
} from "@/lib/fest-rules";
import { useRealtime } from "@/hooks/use-realtime";
import { supabase, type Program, type Team } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { EntryWindowsPanel } from "@/components/manage/entry-windows-panel";

export function ControlPage() {
  const [loading, setLoading] = useState(true);
  const [savingLimits, setSavingLimits] = useState(false);
  const [entryOpen, setEntryOpen] = useState(true);
  const [grandResults, setGrandResults] = useState(false);
  const [festName, setFestName] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [limits, setLimits] = useState<LimitRow[]>([]);
  /** True while the admin has unsaved limit edits, so live refreshes never wipe them. */
  const [limitsDirty, setLimitsDirty] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryGeneral, setNewCategoryGeneral] = useState(false);
  const [pickedCategory, setPickedCategory] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newItemKind, setNewItemKind] = useState<ItemKind>("Individual");
  const [codeId, setCodeId] = useState("");
  const [allowedClass, setAllowedClass] = useState("1");
  const [editCategory, setEditCategory] = useState<{ from: string; to: string } | null>(null);
  const [editItem, setEditItem] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const [rules, { data: s }, { data: t }, { data: p }] = await Promise.all([
      fetchFestRules(),
      supabase.from("fest_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("teams").select("id,name,short_name").order("name"),
      supabase.from("programs").select("*").order("code"),
    ]);
    setCategories(rules.categories);
    setItems(rules.items);
    // Every category gets a row, so a new category is editable straight away.
    const blank = (category: string): LimitRow =>
      ({
        category,
        stage_limit: 0,
        nonstage_limit: 0,
        sports_limit: 0,
        stage_unlimited: false,
        nonstage_unlimited: false,
        sports_unlimited: false,
        arts_max: 0,
        arts_min: 0,
        stage_min: 0,
        nonstage_min: 0,
      }) as unknown as LimitRow;
    const merged = rules.categories.map(
      (c) => rules.limits.find((l) => l.category === c.name) ?? blank(c.name),
    );
    const extras = rules.limits.filter((l) => !rules.categories.some((c) => c.name === l.category));
    setLimits((prev) => (limitsDirty ? prev : [...merged, ...extras]));
    setTeams((t as Team[]) ?? []);
    setPrograms((p as Program[]) ?? []);
    if (s) {
      setEntryOpen(Boolean((s as { entry_open: boolean }).entry_open));
      setFestName((s as { fest_name: string }).fest_name ?? "");
      setGrandResults(Boolean((s as { grand_results?: boolean }).grand_results));
    }
    setPickedCategory((prev) => prev || rules.categories[0]?.name || "");
    setLoading(false);
  }, [limitsDirty]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["categories", "category_items", "category_limits", "fest_settings", "teams", "programs", "students"], () => void load());

  const saveSettings = async (open: boolean, name: string): Promise<void> => {
    const { error } = await supabase
      .from("fest_settings")
      .update({ entry_open: open, fest_name: name, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fest settings updated");
  };

  const saveGrandResults = async (on: boolean): Promise<void> => {
    const { error } = await supabase
      .from("fest_settings")
      .update({ grand_results: on, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      setGrandResults(!on);
      toast.error(
        error.message.includes("grand_results")
          ? "Run supabase/grand-results.sql to add the Grand Results column."
          : error.message,
      );
      return;
    }
    toast.success(on ? "Grand Results published" : "Grand Results turned off");
  };

  /* ---------------- categories ---------------- */

  const addCategory = async (): Promise<void> => {
    const name = newCategory.trim();
    if (!name) {
      toast.error("Give the category a name");
      return;
    }
    const { error } = await supabase.from("categories").insert({
      name,
      is_general: newCategoryGeneral,
      sort: categories.length + 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("category_limits").upsert(
      { category: name, stage_limit: 3, nonstage_limit: 3 } as unknown as object,
      { onConflict: "category" },
    );
    setNewCategory("");
    setNewCategoryGeneral(false);
    toast.success(`Category "${name}" added`);
    void load();
  };

  const renameCategory = async (): Promise<void> => {
    if (!editCategory) return;
    const to = editCategory.to.trim();
    const from = editCategory.from;
    if (!to || to === from) {
      setEditCategory(null);
      return;
    }
    const { error } = await supabase.from("categories").update({ name: to }).eq("name", from);
    if (error) {
      toast.error(error.message);
      return;
    }
    await Promise.all([
      supabase.from("category_limits").update({ category: to }).eq("category", from),
      supabase.from("programs").update({ category: to }).eq("category", from),
      supabase.from("students").update({ category: to }).eq("category", from),
    ]);
    setEditCategory(null);
    toast.success("Category renamed everywhere");
    void load();
  };

  const toggleGeneral = async (name: string, value: boolean): Promise<void> => {
    const { error } = await supabase.from("categories").update({ is_general: value }).eq("name", name);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  const removeCategory = async (name: string): Promise<void> => {
    if (!window.confirm(`Remove the category "${name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("name", name);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Category removed");
    void load();
  };

  /* ---------------- items ---------------- */

  const addItem = async (): Promise<void> => {
    const name = newItem.trim();
    if (!name) {
      toast.error("Give the item a name");
      return;
    }
    const { error } = await supabase
      .from("category_items")
      .insert({ name, kind: newItemKind, sort: items.length + 1 });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewItem("");
    toast.success(`Item "${name}" added`);
    void load();
  };

  const renameItem = async (): Promise<void> => {
    if (!editItem) return;
    const name = editItem.name.trim();
    if (!name) return;
    const previous = items.find((i) => i.id === editItem.id)?.name;
    const { error } = await supabase.from("category_items").update({ name }).eq("id", editItem.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (previous && previous !== name)
      await supabase.from("programs").update({ type: name }).eq("type", previous);
    setEditItem(null);
    toast.success("Item renamed");
    void load();
  };

  const setItemKind = async (id: string, kind: ItemKind): Promise<void> => {
    const { error } = await supabase.from("category_items").update({ kind }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  const removeItem = async (id: string): Promise<void> => {
    const { error } = await supabase.from("category_items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  /* ---------------- limits ---------------- */

  const patchLimit = (index: number, patch: Partial<LimitRow>) => {
    setLimitsDirty(true);
    setLimits((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const saveLimits = async (): Promise<void> => {
    setSavingLimits(true);
    const payload = limits.map((l) => ({
      category: l.category,
      stage_limit: Number(l.stage_limit) || 0,
      nonstage_limit: Number(l.nonstage_limit) || 0,
      stage_unlimited: Boolean(l.stage_unlimited),
      nonstage_unlimited: Boolean(l.nonstage_unlimited),
      sports_limit: Number(l.sports_limit) || 0,
      sports_unlimited: Boolean(l.sports_unlimited),
      arts_max: Number(l.arts_max) || 0,
      arts_min: Number(l.arts_min) || 0,
      min_total: Number(l.arts_min) || 0,
      stage_min: Number(l.stage_min) || 0,
      nonstage_min: Number(l.nonstage_min) || 0,
      min_items: ["Stage", "Non-stage"],
    }));
    const { error } = await supabase
      .from("category_limits")
      .upsert(payload as unknown as object[], { onConflict: "category" });
    setSavingLimits(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLimitsDirty(false);
    toast.success("Limits saved");
    void load();
  };

  const saveRestriction = async (clear: boolean): Promise<void> => {
    if (!codeId) {
      toast.error("Pick a programme code");
      return;
    }
    const { error } = await supabase
      .from("programs")
      .update({ allowed_classes: clear ? null : allowedClass.trim() })
      .eq("id", codeId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(clear ? "Restriction removed" : "Class restriction applied");
    void load();
  };

  const restricted = programs.filter((p) => p.allowed_classes);
  const picked = categories.find((c) => c.name === pickedCategory);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <PageHeading title="Fest Control" />
        <p className="text-sm text-muted-foreground">
          Entry window, categories, items, per-category limits and class-specific codes.
        </p>
      </div>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Programme entry</h2>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Entry is {entryOpen ? "allowed" : "restricted"}</p>
            <p className="text-xs text-muted-foreground">
              When restricted, teams cannot add or remove candidates.
            </p>
          </div>
          <Switch
            checked={entryOpen}
            onCheckedChange={(v) => {
              setEntryOpen(v);
              void saveSettings(v, festName);
            }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label>Fest name</Label>
            <Input value={festName} onChange={(e) => setFestName(e.target.value)} />
          </div>
          <Button className="gap-2" onClick={() => void saveSettings(entryOpen, festName)}>
            <Save className="size-4" /> Save
          </Button>
        </div>

        <EntryWindowsPanel itemNames={items.map((i) => i.name)} programs={programs} />
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Grand results</h2>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">
              Grand results are {grandResults ? "announced" : "hidden"}
            </p>
            <p className="text-xs text-muted-foreground">
              When on, the public Team Points page shows Winners, Runner Up, Third, Fourth… and
              plays the celebration.
            </p>
          </div>
          <Switch
            checked={grandResults}
            onCheckedChange={(v) => {
              setGrandResults(v);
              void saveGrandResults(v);
            }}
          />
        </div>
      </section>


      {/* Categories */}
      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Categories</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1 space-y-1.5">
            <Label>New category</Label>
            <Input
              value={newCategory}
              placeholder="e.g. Aliya"
              onChange={(e) => setNewCategory(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox
              checked={newCategoryGeneral}
              onCheckedChange={(v) => setNewCategoryGeneral(Boolean(v))}
            />
            General (whole team)
          </label>
          <Button className="gap-2" onClick={() => void addCategory()}>
            <Plus className="size-4" /> Add category
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">General (team-wide)</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.name}>
                  <td className="p-3 font-medium">
                    {editCategory?.from === c.name ? (
                      <Input
                        autoFocus
                        className="w-48"
                        value={editCategory.to}
                        onChange={(e) => setEditCategory({ from: c.name, to: e.target.value })}
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={c.is_general}
                      onCheckedChange={(v) => void toggleGeneral(c.name, v)}
                    />
                  </td>
                  <td className="p-3 text-right">
                    {editCategory?.from === c.name ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => void renameCategory()}>
                          <Check className="size-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditCategory(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Rename"
                        onClick={() => setEditCategory({ from: c.name, to: c.name })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => void removeCategory(c.name)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 space-y-1.5">
            <Label>Select a category</Label>
            <Select value={pickedCategory} onValueChange={setPickedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                    {c.is_general ? " · General" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {picked?.is_general ? (
          <div className="rounded-lg border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 text-primary" /> {picked.name} is a team-wide category — the
              whole team competes:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {teams.map((t) => (
                <span key={t.id} className="rounded-full bg-muted px-3 py-1 text-xs">
                  {t.name}
                </span>
              ))}
              {teams.length === 0 && (
                <span className="text-xs text-muted-foreground">No teams created yet.</span>
              )}
            </div>
          </div>
        ) : (
          picked && (
            <p className="text-xs text-muted-foreground">
              {picked.name} is a student category — candidates are entered per student.
            </p>
          )
        )}
      </section>

      {/* Items */}
      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Items of the category</h2>
        <p className="text-xs text-muted-foreground">
          Items are the programme kinds: Stage, Non-stage, Sports or anything you add. Group items
          are unlimited for every student.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1 space-y-1.5">
            <Label>New item</Label>
            <Input
              value={newItem}
              placeholder="e.g. Sports"
              onChange={(e) => setNewItem(e.target.value)}
            />
          </div>
          <div className="w-44 space-y-1.5">
            <Label>Kind</Label>
            <Select value={newItemKind} onValueChange={(v) => setNewItemKind(v as ItemKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">Individual programme</SelectItem>
                <SelectItem value="Group">Group programme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" onClick={() => void addItem()}>
            <Plus className="size-4" /> Add item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Individual / Group</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="p-3 font-medium">
                    {editItem?.id === i.id ? (
                      <Input
                        autoFocus
                        className="w-48"
                        value={editItem.name}
                        onChange={(e) => setEditItem({ id: i.id, name: e.target.value })}
                      />
                    ) : (
                      i.name
                    )}
                  </td>
                  <td className="p-3">
                    <Select value={i.kind} onValueChange={(v) => void setItemKind(i.id, v as ItemKind)}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Group">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    {editItem?.id === i.id ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => void renameItem()}>
                          <Check className="size-4 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditItem(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Rename"
                        onClick={() => setEditItem({ id: i.id, name: i.name })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => void removeItem(i.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Limits */}
      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Limits per student</h2>
          <Button size="sm" className="gap-2" disabled={savingLimits} onClick={() => void saveLimits()}>
            {savingLimits ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Stage and Non-stage together are the <strong>Arts</strong> total. Each of them has its own
          minimum and maximum; a student may reach both caps individually, but never more than the
          Arts maximum (e.g. 4 + 4 caps with an Arts maximum of 7 means 4 + 3). Sports has its own
          cap and no minimum. Set 0 for “no cap” / “no minimum”. Group programmes are always unlimited. The general category (Kulliyya) is a
          whole-team category with no per-student limits, so it is not listed here.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Stage min</th>
                <th className="p-3">Stage max</th>
                <th className="p-3">Non-stage min</th>
                <th className="p-3">Non-stage max</th>
                <th className="p-3">Arts max</th>
                <th className="p-3">Sports max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {limits.map((l, i) =>
                categories.find((c) => c.name === l.category)?.is_general ? null : (
                <tr key={l.category}>
                  <td className="p-3 font-medium">{l.category}</td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={l.stage_min ?? 0}
                      onChange={(e) => patchLimit(i, { stage_min: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        disabled={l.stage_unlimited}
                        value={l.stage_limit}
                        onChange={(e) => patchLimit(i, { stage_limit: Number(e.target.value) })}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <Checkbox
                          checked={l.stage_unlimited}
                          onCheckedChange={(v) => patchLimit(i, { stage_unlimited: Boolean(v) })}
                        />
                        Unlimited
                      </label>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={l.nonstage_min ?? 0}
                      onChange={(e) => patchLimit(i, { nonstage_min: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        disabled={l.nonstage_unlimited}
                        value={l.nonstage_limit}
                        onChange={(e) => patchLimit(i, { nonstage_limit: Number(e.target.value) })}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <Checkbox
                          checked={l.nonstage_unlimited}
                          onCheckedChange={(v) => patchLimit(i, { nonstage_unlimited: Boolean(v) })}
                        />
                        Unlimited
                      </label>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={l.arts_max ?? 0}
                      onChange={(e) => patchLimit(i, { arts_max: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        disabled={l.sports_unlimited}
                        value={l.sports_limit ?? 0}
                        onChange={(e) => patchLimit(i, { sports_limit: Number(e.target.value) })}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <Checkbox
                          checked={l.sports_unlimited}
                          onCheckedChange={(v) => patchLimit(i, { sports_unlimited: Boolean(v) })}
                        />
                        Unlimited
                      </label>
                    </div>
                  </td>
                </tr>
                ),
              )}
              {limits.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Add a category first — every category gets its own limit row.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Class-specific programme codes</h2>
        <p className="text-xs text-muted-foreground">
          Example: restrict a Uoola code so that only class 1 students can be entered.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1 space-y-1.5">
            <Label>Programme code</Label>
            <Select value={codeId} onValueChange={setCodeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select programme" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name} ({p.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1.5">
            <Label>Only class</Label>
            <Input value={allowedClass} onChange={(e) => setAllowedClass(e.target.value)} />
          </div>
          <Button onClick={() => void saveRestriction(false)}>Apply</Button>
          <Button variant="outline" onClick={() => void saveRestriction(true)}>
            Remove restriction
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {restricted.map((p) => (
            <span key={p.id} className="rounded-full bg-muted px-3 py-1 text-xs">
              {p.code} → class {p.allowed_classes}
            </span>
          ))}
          {restricted.length === 0 && (
            <span className="text-xs text-muted-foreground">No class restrictions set.</span>
          )}
        </div>
      </section>
    </div>
  );
}
