import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, ImagePlus, MonitorPlay, Pencil, Plus, RefreshCw, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import { promoScreenService, type PromoScreen, type PromoScreenItem } from '../../services/promoScreenService';

type ScreenForm = {
  name: string;
  slug: string;
  rotationSeconds: number;
  fitMode: 'cover' | 'contain';
  backgroundColor: string;
  active: boolean;
};

type ItemForm = {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  active: boolean;
};

const blankScreen: ScreenForm = {
  name: '',
  slug: '',
  rotationSeconds: 12,
  fitMode: 'cover',
  backgroundColor: '#111827',
  active: true,
};

const blankItem: ItemForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  sortOrder: 0,
  active: true,
};

function displayUrl(token: string) {
  return `${window.location.origin}/display/${token}`;
}

export function PromoScreensPage() {
  const [screens, setScreens] = useState<PromoScreen[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<PromoScreenItem[]>([]);
  const [screenForm, setScreenForm] = useState<ScreenForm>(blankScreen);
  const [itemForm, setItemForm] = useState<ItemForm>(blankItem);
  const [editingItem, setEditingItem] = useState<PromoScreenItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingScreen, setSavingScreen] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selected = useMemo(() => screens.find((s) => s.id === selectedId) ?? null, [screens, selectedId]);

  useEffect(() => {
    promoScreenService.listScreens()
      .then((data) => {
        setScreens(data);
        setSelectedId((cur) => cur ?? data[0]?.id ?? null);
      })
      .catch(() => toast.error('Failed to load promo screens'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      return;
    }
    promoScreenService.listItems(selectedId)
      .then(setItems)
      .catch(() => toast.error('Failed to load screen items'));
  }, [selectedId]);

  function resetScreenForm() {
    setScreenForm(blankScreen);
  }

  async function saveScreen() {
    if (!screenForm.name.trim()) {
      toast.error('Screen name is required');
      return;
    }
    setSavingScreen(true);
    try {
      const saved = await promoScreenService.createScreen({
        name: screenForm.name,
        slug: screenForm.slug || undefined,
        rotationSeconds: screenForm.rotationSeconds,
        fitMode: screenForm.fitMode,
        backgroundColor: screenForm.backgroundColor,
        active: screenForm.active,
      });
      setScreens((prev) => [saved, ...prev]);
      setSelectedId(saved.id);
      resetScreenForm();
      toast.success('Promo screen created');
    } catch {
      toast.error('Could not save promo screen');
    } finally {
      setSavingScreen(false);
    }
  }

  async function updateSelected(data: Partial<ScreenForm>) {
    if (!selected) return;
    try {
      const updated = await promoScreenService.updateScreen(selected.id, data);
      setScreens((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    } catch {
      toast.error('Could not update screen');
    }
  }

  async function refreshSelected() {
    if (!selected) return;
    setRefreshing(true);
    try {
      const updated = await promoScreenService.refreshScreen(selected.id);
      setScreens((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      toast.success('Display screen refresh requested');
    } catch {
      toast.error('Could not refresh display screen');
    } finally {
      setRefreshing(false);
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm(`Delete "${selected.name}" and all its promotions?`)) return;
    try {
      await promoScreenService.deleteScreen(selected.id);
      setScreens((prev) => {
        const next = prev.filter((s) => s.id !== selected.id);
        setSelectedId(next[0]?.id ?? null);
        return next;
      });
      toast.success('Promo screen deleted');
    } catch {
      toast.error('Could not delete screen');
    }
  }

  function editItem(item: PromoScreenItem) {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      subtitle: item.subtitle,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl ?? '',
      sortOrder: item.sortOrder,
      active: item.active,
    });
  }

  function resetItemForm() {
    setEditingItem(null);
    setItemForm(blankItem);
  }

  async function saveItem(refreshAfter = false) {
    if (!selected) return;
    if (!itemForm.imageUrl.trim()) {
      toast.error('Banner image URL is required');
      return;
    }
    setSavingItem(true);
    try {
      const payload = {
        title: itemForm.title,
        subtitle: itemForm.subtitle,
        imageUrl: itemForm.imageUrl,
        linkUrl: itemForm.linkUrl || null,
        sortOrder: itemForm.sortOrder,
        active: itemForm.active,
      };
      const saved = editingItem
        ? await promoScreenService.updateItem(editingItem.id, payload)
        : await promoScreenService.createItem(selected.id, payload);
      setItems((prev) => editingItem
        ? prev.map((item) => (item.id === saved.id ? saved : item)).sort((a, b) => a.sortOrder - b.sortOrder)
        : [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder));
      setScreens((prev) => prev.map((s) => s.id === selected.id ? {
        ...s,
        itemCount: editingItem ? s.itemCount : (s.itemCount ?? 0) + 1,
        activeItemCount: editingItem
          ? items.map((i) => i.id === saved.id ? saved : i).filter((i) => i.active).length
          : (s.activeItemCount ?? 0) + (saved.active ? 1 : 0),
      } : s));
      resetItemForm();
      toast.success(editingItem ? 'Promotion updated' : 'Promotion added');
      if (refreshAfter) {
        const refreshed = await promoScreenService.refreshScreen(selected.id);
        setScreens((prev) => prev.map((s) => (s.id === refreshed.id ? { ...s, ...refreshed } : s)));
        toast.success('Display screen refresh requested');
      }
    } catch {
      toast.error('Could not save promotion');
    } finally {
      setSavingItem(false);
    }
  }

  async function toggleItem(item: PromoScreenItem) {
    try {
      const updated = await promoScreenService.updateItem(item.id, { active: !item.active });
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setScreens((prev) => prev.map((s) => s.id === updated.screenId ? {
        ...s,
        activeItemCount: items.map((i) => i.id === updated.id ? updated : i).filter((i) => i.active).length,
      } : s));
    } catch {
      toast.error('Could not update promotion');
    }
  }

  async function deleteItem(item: PromoScreenItem) {
    if (!confirm(`Delete this promotion${item.title ? `: ${item.title}` : ''}?`)) return;
    try {
      await promoScreenService.deleteItem(item.id);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setScreens((prev) => prev.map((s) => s.id === item.screenId ? {
        ...s,
        itemCount: Math.max((s.itemCount ?? 1) - 1, 0),
        activeItemCount: Math.max((s.activeItemCount ?? 0) - (item.active ? 1 : 0), 0),
      } : s));
    } catch {
      toast.error('Could not delete promotion');
    }
  }

  function copyUrl() {
    if (!selected) return;
    navigator.clipboard.writeText(displayUrl(selected.token)).then(() => toast.success('Display URL copied'));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <AdminHeader title="Promo Screens" subtitle="Manage banners for TVs and display screens" backTo="/admin" icon={MonitorPlay} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <section className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Screens</h2>
                  <span className="text-xs text-gray-400">{screens.length}</span>
                </div>
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : screens.length === 0 ? (
                    <p className="text-sm text-gray-400">No promo screens yet</p>
                  ) : screens.map((screen) => (
                    <button
                      key={screen.id}
                      onClick={() => setSelectedId(screen.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === screen.id ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{screen.name}</p>
                          <p className="text-xs text-gray-400 truncate">/{screen.slug}</p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${screen.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          {screen.active ? 'Live' : 'Off'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{screen.activeItemCount ?? 0} active of {screen.itemCount ?? 0} promos</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4">New Screen</h2>
                <div className="space-y-3">
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Entrance TV" value={screenForm.name} onChange={(e) => setScreenForm((p) => ({ ...p, name: e.target.value }))} />
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="entrance-tv" value={screenForm.slug} onChange={(e) => setScreenForm((p) => ({ ...p, slug: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-500">
                      Rotation
                      <input type="number" min={5} max={120} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={screenForm.rotationSeconds} onChange={(e) => setScreenForm((p) => ({ ...p, rotationSeconds: Number(e.target.value) }))} />
                    </label>
                    <label className="text-xs text-gray-500">
                      Fit
                      <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={screenForm.fitMode} onChange={(e) => setScreenForm((p) => ({ ...p, fitMode: e.target.value as 'cover' | 'contain' }))}>
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                      </select>
                    </label>
                  </div>
                  <label className="text-xs text-gray-500">
                    Background
                    <input type="color" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-1 py-1" value={screenForm.backgroundColor} onChange={(e) => setScreenForm((p) => ({ ...p, backgroundColor: e.target.value }))} />
                  </label>
                  <button onClick={saveScreen} disabled={savingScreen} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60">
                    <Plus size={16} /> {savingScreen ? 'Saving...' : 'Create Screen'}
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {selected ? (
                <>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                          <button onClick={() => updateSelected({ active: !selected.active })} className={`flex items-center gap-1 text-xs font-semibold ${selected.active ? 'text-green-600' : 'text-gray-400'}`}>
                            {selected.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />} {selected.active ? 'Live' : 'Off'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{displayUrl(selected.token)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={refreshSelected} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-100 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-60">
                          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh Screen
                        </button>
                        <button onClick={copyUrl} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"><Copy size={15} /> Copy URL</button>
                        <a href={displayUrl(selected.token)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"><ExternalLink size={15} /> Open</a>
                        <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-100 text-sm text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete</button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mt-4">
                      <label className="text-xs text-gray-500">
                        Rotation seconds
                        <input type="number" min={5} max={120} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selected.rotationSeconds} onChange={(e) => updateSelected({ rotationSeconds: Number(e.target.value) })} />
                      </label>
                      <label className="text-xs text-gray-500">
                        Image fit
                        <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selected.fitMode} onChange={(e) => updateSelected({ fitMode: e.target.value as 'cover' | 'contain' })}>
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                        </select>
                      </label>
                      <label className="text-xs text-gray-500">
                        Background
                        <input type="color" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-1 py-1" value={selected.backgroundColor} onChange={(e) => updateSelected({ backgroundColor: e.target.value })} />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                      <h2 className="font-bold text-gray-900 mb-4">Promotions</h2>
                      {items.length === 0 ? (
                        <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400">
                          <ImagePlus className="mx-auto mb-3" size={32} />
                          <p className="text-sm font-medium">Add a banner to start this screen</p>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {items.map((item) => (
                            <article key={item.id} className={`border rounded-xl overflow-hidden bg-white ${item.active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                              <img src={item.imageUrl} alt={item.title || 'Promotion'} className="h-36 w-full object-cover bg-gray-100" />
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{item.title || 'Untitled promotion'}</p>
                                    {item.subtitle && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.subtitle}</p>}
                                  </div>
                                  <span className="text-xs text-gray-400">#{item.sortOrder}</span>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <button onClick={() => toggleItem(item)} className={`flex items-center gap-1 text-xs font-semibold ${item.active ? 'text-green-600' : 'text-gray-400'}`}>
                                    {item.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} {item.active ? 'Active' : 'Off'}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => editItem(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={15} /></button>
                                    <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm h-fit">
                      <h2 className="font-bold text-gray-900 mb-4">{editingItem ? 'Edit Promotion' : 'Add Promotion'}</h2>
                      <div className="space-y-3">
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Title" value={itemForm.title} onChange={(e) => setItemForm((p) => ({ ...p, title: e.target.value }))} />
                        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-20" placeholder="Subtitle" value={itemForm.subtitle} onChange={(e) => setItemForm((p) => ({ ...p, subtitle: e.target.value }))} />
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Banner image URL" value={itemForm.imageUrl} onChange={(e) => setItemForm((p) => ({ ...p, imageUrl: e.target.value }))} />
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional link or QR target URL" value={itemForm.linkUrl} onChange={(e) => setItemForm((p) => ({ ...p, linkUrl: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-gray-500">
                            Sort
                            <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={itemForm.sortOrder} onChange={(e) => setItemForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} />
                          </label>
                          <label className="text-xs text-gray-500">
                            Status
                            <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={itemForm.active ? 'active' : 'off'} onChange={(e) => setItemForm((p) => ({ ...p, active: e.target.value === 'active' }))}>
                              <option value="active">Active</option>
                              <option value="off">Off</option>
                            </select>
                          </label>
                        </div>
                        {itemForm.imageUrl && <img src={itemForm.imageUrl} alt="" className="h-28 w-full object-cover rounded-lg bg-gray-100" />}
                        <div className="flex gap-2">
                          <button onClick={() => saveItem(false)} disabled={savingItem} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60">
                            <ImagePlus size={16} /> {savingItem ? 'Saving...' : editingItem ? 'Update' : 'Add'}
                          </button>
                          <button onClick={() => saveItem(true)} disabled={savingItem} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-100 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60">
                            <RefreshCw size={15} /> Save & Refresh
                          </button>
                          {editingItem && <button onClick={resetItemForm} className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600">Cancel</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-400 shadow-sm">
                  <MonitorPlay className="mx-auto mb-3" size={36} />
                  <p className="font-medium">Create a screen to start adding promotions</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
