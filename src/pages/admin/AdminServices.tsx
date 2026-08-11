import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Service, SpecialService, Section, SpecialCategory, Promotion, UniqueService } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Clock, DollarSign, Sparkles, Upload, X, Crop, CalendarDays, Star, FolderTree, Tag, MessageCircle, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageCropper } from '@/components/ImageCropper';
import { parsePrice, formatPriceARS } from '@/lib/price';
import { Checkbox } from '@/components/ui/checkbox';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' }, { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' }, { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];
const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' }, { value: 60, label: '1 hora' }, { value: 90, label: '1 hora 30 min' },
  { value: 120, label: '2 horas' }, { value: 150, label: '2 horas 30 min' }, { value: 180, label: '3 horas' },
  { value: 210, label: '3 horas 30 min' }, { value: 240, label: '4 horas' }, { value: 270, label: '4 horas 30 min' },
  { value: 300, label: '5 horas' }, { value: 330, label: '5 horas 30 min' }, { value: 360, label: '6 horas' },
];

function readImageFile(file: File, onLoaded: (dataUrl: string) => void) {
  if (file.size > 5 * 1024 * 1024) {
    toast({ title: 'Archivo muy grande', description: 'La imagen debe ser menor a 5MB', variant: 'destructive' });
    return;
  }
  const reader = new FileReader();
  reader.onloadend = () => onLoaded(reader.result as string);
  reader.readAsDataURL(file);
}

type ImagePickerProps = {
  imageUrl?: string;
  onChange: (url: string) => void;
  cropperOpen: boolean;
  setCropperOpen: (o: boolean) => void;
  tempImg: string;
  setTempImg: (s: string) => void;
};
function ImagePicker({ imageUrl, onChange, cropperOpen, setCropperOpen, tempImg, setTempImg }: ImagePickerProps) {
  return (
    <div className="space-y-2">
      <Label>Imagen (opcional)</Label>
      {imageUrl ? (
        <div className="relative">
          <div className="h-32 rounded-lg bg-cover bg-center border" style={{ backgroundImage: `url(${imageUrl})` }} />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button type="button" variant="secondary" size="icon" className="h-8 w-8" onClick={() => { setTempImg(imageUrl); setCropperOpen(true); }} title="Reposicionar / zoom"><Crop className="w-4 h-4" /></Button>
            <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => onChange('')} title="Quitar imagen"><X className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Subir imagen (JPG, PNG, GIF, WEBP)</span>
          <input
            type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readImageFile(file, (dataUrl) => { setTempImg(dataUrl); setCropperOpen(true); });
              e.target.value = '';
            }}
          />
        </label>
      )}
      <ImageCropper
        imageSrc={tempImg}
        isOpen={cropperOpen}
        onClose={() => { setCropperOpen(false); setTempImg(''); }}
        onCrop={(croppedImage) => { onChange(croppedImage); setCropperOpen(false); setTempImg(''); }}
      />
    </div>
  );
}

export default function AdminServices() {
  const {
    sections, addSection, updateSection, removeSection,
    services, addService, removeService, updateService,
    specialServices, addSpecialService, removeSpecialService, updateSpecialService,
    specialCategories, addSpecialCategory, updateSpecialCategory, removeSpecialCategory,
    promotions, addPromotion, updatePromotion, removePromotion,
  } = useStore();
  const uniqueServices = useStore((s) => s.uniqueServices);
  const addUniqueService = useStore((s) => s.addUniqueService);
  const updateUniqueService = useStore((s) => s.updateUniqueService);
  const removeUniqueService = useStore((s) => s.removeUniqueService);

  // ===== Section dialog =====
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isSectionCropperOpen, setIsSectionCropperOpen] = useState(false);
  const [sectionTempImg, setSectionTempImg] = useState('');
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({ name: '', description: '', imageUrl: '' });

  // ===== Service dialog =====
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '', description: '', duration: 60, price: 0, imageUrl: '', availableDays: [], sectionId: '',
  });

  // ===== Special category dialog =====
  const [isSpecialCatDialogOpen, setIsSpecialCatDialogOpen] = useState(false);
  const [editingSpecialCat, setEditingSpecialCat] = useState<SpecialCategory | null>(null);
  const [isSpecialCatCropperOpen, setIsSpecialCatCropperOpen] = useState(false);
  const [specialCatTempImg, setSpecialCatTempImg] = useState('');
  const [specialCatForm, setSpecialCatForm] = useState<Partial<SpecialCategory>>({ name: '', description: '', imageUrl: '' });

  // ===== Special service dialog =====
  const [isSpecialDialogOpen, setIsSpecialDialogOpen] = useState(false);
  const [editingSpecialService, setEditingSpecialService] = useState<SpecialService | null>(null);
  const [isSpecialCropperOpen, setIsSpecialCropperOpen] = useState(false);
  const [specialTempImageUrl, setSpecialTempImageUrl] = useState('');
  const [specialFormData, setSpecialFormData] = useState<Partial<SpecialService>>({
    name: '', description: '', duration: 60, price: 0, imageUrl: '', date: '', categoryId: '',
  });

  // ===== Promotion dialog =====
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [isPromoCropperOpen, setIsPromoCropperOpen] = useState(false);
  const [promoTempImg, setPromoTempImg] = useState('');
  const [promoForm, setPromoForm] = useState<Partial<Promotion>>({
    name: '', description: '', imageUrl: '', phone: '',
  });

  // ===== Unique service dialog =====
  const [isUniqueDialogOpen, setIsUniqueDialogOpen] = useState(false);
  const [editingUnique, setEditingUnique] = useState<UniqueService | null>(null);
  const [isUniqueCropperOpen, setIsUniqueCropperOpen] = useState(false);
  const [uniqueTempImg, setUniqueTempImg] = useState('');
  const [uniqueForm, setUniqueForm] = useState<Partial<UniqueService>>({
    name: '', description: '', imageUrl: '', phone: '',
  });

  const openUniqueNew = () => {
    setEditingUnique(null);
    setUniqueForm({ name: '', description: '', imageUrl: '', phone: '' });
    setIsUniqueDialogOpen(true);
  };
  const openUniqueEdit = (u: UniqueService) => {
    setEditingUnique(u);
    setUniqueForm(u);
    setIsUniqueDialogOpen(true);
  };
  const handleUniqueSubmit = () => {
    if (!uniqueForm.name?.trim() || !uniqueForm.description?.trim()) {
      toast({ title: 'Faltan datos', description: 'Completá nombre y descripción', variant: 'destructive' });
      return;
    }
    if (editingUnique) {
      updateUniqueService(editingUnique.id, uniqueForm);
      toast({ title: 'Servicio único actualizado', description: uniqueForm.name });
    } else {
      const nu: UniqueService = {
        id: Date.now().toString(),
        name: uniqueForm.name!.trim(),
        description: uniqueForm.description!.trim(),
        imageUrl: uniqueForm.imageUrl || '',
        phone: (uniqueForm.phone || '').replace(/\D/g, ''),
        position: uniqueServices.length,
      };
      addUniqueService(nu);
      toast({ title: 'Servicio único creado', description: nu.name });
    }
    setIsUniqueDialogOpen(false);
  };
  const handleUniqueDelete = (u: UniqueService) => {
    if (!confirm(`¿Eliminar "${u.name}"?`)) return;
    removeUniqueService(u.id);
    toast({ title: 'Servicio único eliminado', description: u.name });
  };

  // ───── Sections ─────
  const resetSectionForm = () => { setSectionForm({ name: '', description: '', imageUrl: '' }); setEditingSection(null); };
  const handleSectionSubmit = () => {
    if (!sectionForm.name?.trim()) { toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' }); return; }
    if (editingSection) {
      updateSection(editingSection.id, sectionForm);
      toast({ title: 'Sección actualizada', description: sectionForm.name });
    } else {
      const ns: Section = { id: Date.now().toString(), name: sectionForm.name!, description: sectionForm.description || '', imageUrl: sectionForm.imageUrl || undefined };
      addSection(ns);
      toast({ title: 'Sección creada', description: ns.name });
    }
    resetSectionForm(); setIsSectionDialogOpen(false);
  };
  const handleSectionEdit = (s: Section) => { setEditingSection(s); setSectionForm(s); setIsSectionDialogOpen(true); };
  const handleSectionDelete = (s: Section) => {
    if (!confirm(`¿Eliminar la sección "${s.name}"?`)) return;
    removeSection(s.id); toast({ title: 'Sección eliminada', description: s.name });
  };

  // ───── Services ─────
  const resetForm = () => {
    setFormData({ name: '', description: '', duration: 60, price: 0, imageUrl: '', availableDays: [], sectionId: '' });
    setEditingService(null);
  };
  const toggleDay = (day: number) => {
    const current = formData.availableDays || [];
    setFormData({ ...formData, availableDays: current.includes(day) ? current.filter((d) => d !== day) : [...current, day] });
  };
  const handleSubmit = () => {
    if (!formData.name || !formData.description || !formData.duration || !formData.price) {
      toast({ title: 'Error', description: 'Completá todos los campos requeridos', variant: 'destructive' }); return;
    }
    if (!formData.sectionId) { toast({ title: 'Error', description: 'Seleccioná una sección', variant: 'destructive' }); return; }
    if (editingService) {
      updateService(editingService.id, formData);
      toast({ title: 'Servicio actualizado', description: formData.name });
    } else {
      const ns: Service = {
        id: Date.now().toString(), name: formData.name!, description: formData.description!,
        duration: formData.duration!, price: formData.price!, imageUrl: formData.imageUrl,
        sectionId: formData.sectionId, availableDays: formData.availableDays || [],
      };
      addService(ns); toast({ title: 'Servicio creado', description: formData.name });
    }
    resetForm(); setIsDialogOpen(false);
  };
  const handleEdit = (service: Service) => { setEditingService(service); setFormData(service); setIsDialogOpen(true); };
  const handleDelete = (service: Service) => { removeService(service.id); toast({ title: 'Servicio eliminado', description: service.name }); };
  const openNewServiceFor = (sectionId: string) => { resetForm(); setFormData((f) => ({ ...f, sectionId })); setIsDialogOpen(true); };

  // ───── Special categories ─────
  const resetSpecialCatForm = () => { setSpecialCatForm({ name: '', description: '', imageUrl: '' }); setEditingSpecialCat(null); };
  const handleSpecialCatSubmit = () => {
    if (!specialCatForm.name?.trim()) { toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' }); return; }
    if (editingSpecialCat) {
      updateSpecialCategory(editingSpecialCat.id, specialCatForm);
      toast({ title: 'Categoría actualizada', description: specialCatForm.name });
    } else {
      const nc: SpecialCategory = { id: Date.now().toString(), name: specialCatForm.name!, description: specialCatForm.description || '', imageUrl: specialCatForm.imageUrl || undefined };
      addSpecialCategory(nc); toast({ title: 'Categoría creada', description: nc.name });
    }
    resetSpecialCatForm(); setIsSpecialCatDialogOpen(false);
  };
  const handleSpecialCatEdit = (c: SpecialCategory) => { setEditingSpecialCat(c); setSpecialCatForm(c); setIsSpecialCatDialogOpen(true); };
  const handleSpecialCatDelete = (c: SpecialCategory) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"? Los especiales quedarán sin categoría.`)) return;
    removeSpecialCategory(c.id); toast({ title: 'Categoría eliminada', description: c.name });
  };

  // ───── Special services ─────
  const resetSpecialForm = () => {
    setSpecialFormData({ name: '', description: '', duration: 60, price: 0, imageUrl: '', date: '', categoryId: '' });
    setEditingSpecialService(null);
  };
  const handleSpecialSubmit = () => {
    if (!specialFormData.name || !specialFormData.description || !specialFormData.duration || !specialFormData.price) {
      toast({ title: 'Error', description: 'Completá todos los campos requeridos', variant: 'destructive' }); return;
    }
    if (!specialFormData.categoryId) {
      toast({ title: 'Error', description: 'Seleccioná una categoría', variant: 'destructive' }); return;
    }
    if (editingSpecialService) {
      updateSpecialService(editingSpecialService.id, specialFormData);
      toast({ title: 'Especial actualizado', description: specialFormData.name });
    } else {
      const ns: SpecialService = {
        id: Date.now().toString(), name: specialFormData.name!, description: specialFormData.description!,
        duration: specialFormData.duration!, price: specialFormData.price!,
        imageUrl: specialFormData.imageUrl, date: specialFormData.date || undefined,
        categoryId: specialFormData.categoryId,
      };
      addSpecialService(ns); toast({ title: 'Especial creado', description: ns.name });
    }
    resetSpecialForm(); setIsSpecialDialogOpen(false);
  };
  const handleSpecialEdit = (s: SpecialService) => { setEditingSpecialService(s); setSpecialFormData(s); setIsSpecialDialogOpen(true); };
  const handleSpecialDelete = (s: SpecialService) => { removeSpecialService(s.id); toast({ title: 'Especial eliminado', description: s.name }); };
  const openNewSpecialFor = (categoryId: string) => { resetSpecialForm(); setSpecialFormData((f) => ({ ...f, categoryId })); setIsSpecialDialogOpen(true); };

  // ───── Promotions ─────
  const resetPromoForm = () => { setPromoForm({ name: '', description: '', imageUrl: '', phone: '' }); setEditingPromo(null); };
  const handlePromoSubmit = () => {
    if (!promoForm.name?.trim() || !promoForm.description?.trim()) {
      toast({ title: 'Faltan datos', description: 'Completá título y descripción', variant: 'destructive' });
      return;
    }
    const phone = (promoForm.phone || '').replace(/\D/g, '');
    if (editingPromo) {
      updatePromotion(editingPromo.id, { ...promoForm, phone });
      toast({ title: 'Promoción actualizada', description: promoForm.name });
    } else {
      const np: Promotion = {
        id: Date.now().toString(),
        name: promoForm.name!.trim(),
        description: promoForm.description!.trim(),
        imageUrl: promoForm.imageUrl || undefined,
        phone,
        position: promotions.length,
      };
      addPromotion(np);
      toast({ title: 'Promoción creada', description: np.name });
    }
    resetPromoForm(); setIsPromoDialogOpen(false);
  };
  const handlePromoEdit = (p: Promotion) => { setEditingPromo(p); setPromoForm(p); setIsPromoDialogOpen(true); };
  const handlePromoDelete = (p: Promotion) => {
    if (!confirm(`¿Eliminar la promoción "${p.name}"?`)) return;
    removePromotion(p.id); toast({ title: 'Promoción eliminada', description: p.name });
  };

  // ─── Render helpers ───
  const servicesBySection = (sectionId: string) => services.filter((s) => s.sectionId === sectionId);
  const orphanServices = services.filter((s) => !s.sectionId || !sections.some((sec) => sec.id === s.sectionId));
  const specialsByCategory = (catId: string) => specialServices.filter((s) => s.categoryId === catId);
  const orphanSpecials = specialServices.filter((s) => !s.categoryId || !specialCategories.some((c) => c.id === s.categoryId));

  return (
    <div className="space-y-12">
      {/* ============== PROMOCIONES ============== */}
      <div className="border-b border-border pb-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" /> Promociones
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Aparecen en la página principal. Cada promoción redirige a WhatsApp con un mensaje pre-llenado.
            </p>
          </div>
          <Dialog open={isPromoDialogOpen} onOpenChange={(o) => { setIsPromoDialogOpen(o); if (!o) resetPromoForm(); }}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Agregar Promoción</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}</DialogTitle>
                <DialogDescription>Título, descripción y un número de WhatsApp al que dirigir la consulta.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={promoForm.name || ''} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="Ej: 2x1 Faciales" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea rows={4} value={promoForm.description || ''} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} placeholder="Detalle de la promoción..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> WhatsApp (opcional)</Label>
                  <Input
                    value={promoForm.phone || ''}
                    onChange={(e) => setPromoForm({ ...promoForm, phone: e.target.value })}
                    placeholder="Ej: 5492613820741 (solo dígitos, con código país)"
                  />
                  <p className="text-xs text-muted-foreground">Si lo dejás vacío, se usa el número por defecto de la estética.</p>
                </div>
                <ImagePicker
                  imageUrl={promoForm.imageUrl}
                  onChange={(url) => setPromoForm({ ...promoForm, imageUrl: url })}
                  cropperOpen={isPromoCropperOpen} setCropperOpen={setIsPromoCropperOpen}
                  tempImg={promoTempImg} setTempImg={setPromoTempImg}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPromoDialogOpen(false)}>Cancelar</Button>
                <Button variant="gradient" onClick={handlePromoSubmit}>{editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {promotions.map((promo) => (
            <Card key={promo.id} className="card-elevated overflow-hidden border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    {promo.name}
                  </CardTitle>
                </div>
                <CardDescription className="line-clamp-3 whitespace-pre-line">{promo.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {promo.phone ? `WhatsApp: +${promo.phone}` : 'WhatsApp por defecto'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePromoEdit(promo)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handlePromoDelete(promo)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {promotions.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground text-center py-6">No hay promociones todavía.</div>
          )}
        </div>
      </div>


      {/* ============== SECCIONES ============== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary" /> Secciones
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Cada sección agrupa sus propios servicios. En la página principal el cliente elige una sección.
          </p>
        </div>
        <Dialog open={isSectionDialogOpen} onOpenChange={(open) => { setIsSectionDialogOpen(open); if (!open) resetSectionForm(); }}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Agregar Sección</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{editingSection ? 'Editar Sección' : 'Nueva Sección'}</DialogTitle>
              <DialogDescription>{editingSection ? 'Modificá los datos de la sección' : 'Creá una nueva sección para agrupar servicios'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={sectionForm.name || ''} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="Ej: Faciales" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea rows={3} value={sectionForm.description || ''} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} />
              </div>
              <ImagePicker
                imageUrl={sectionForm.imageUrl}
                onChange={(url) => setSectionForm({ ...sectionForm, imageUrl: url })}
                cropperOpen={isSectionCropperOpen} setCropperOpen={setIsSectionCropperOpen}
                tempImg={sectionTempImg} setTempImg={setSectionTempImg}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>Cancelar</Button>
              <Button variant="gradient" onClick={handleSectionSubmit}>{editingSection ? 'Guardar Cambios' : 'Crear Sección'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <FolderTree className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Todavía no hay secciones.</p>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="space-y-4 border border-border rounded-2xl p-4 md:p-6 bg-card/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-4">
              {section.imageUrl ? (
                <div className="w-16 h-16 rounded-xl bg-cover bg-center border" style={{ backgroundImage: `url(${section.imageUrl})` }} />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center"><FolderTree className="w-7 h-7 text-primary" /></div>
              )}
              <div>
                <h2 className="text-xl md:text-2xl font-display font-semibold">{section.name}</h2>
                {section.description && <p className="text-sm text-muted-foreground line-clamp-1 max-w-xl">{section.description}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSectionEdit(section)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleSectionDelete(section)}><Trash2 className="w-4 h-4" /></Button>
              <Button variant="gradient" size="sm" onClick={() => openNewServiceFor(section.id)}><Plus className="w-4 h-4 mr-1" /> Servicio</Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {servicesBySection(section.id).map((service) => (
              <Card key={service.id} className="card-elevated overflow-hidden">
                {service.imageUrl ? (
                  <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${service.imageUrl})` }} />
                ) : (
                  <div className="h-32 bg-gradient-to-br from-rose-gold-light/30 via-cream to-dusty-rose/20 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-primary/30" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-xl">{service.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration} min</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{formatPriceARS(service.price)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(service)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(service)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {servicesBySection(section.id).length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground py-4">Sin servicios. Tocá "Servicio" para agregar uno.</div>
            )}
          </div>
        </div>
      ))}

      {orphanServices.length > 0 && (
        <div className="space-y-4 border border-dashed border-border rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-display font-semibold text-muted-foreground">Servicios sin sección</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orphanServices.map((service) => (
              <Card key={service.id} className="card-elevated overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg">{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(service)}><Edit className="w-4 h-4 mr-1" /> Asignar sección</Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(service)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SERVICE DIALOG (shared) */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
            <DialogDescription>{editingService ? 'Modificá los detalles' : 'Completá los datos del servicio'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sección</Label>
              <Select value={formData.sectionId || ''} onValueChange={(v) => setFormData({ ...formData, sectionId: v })}>
                <SelectTrigger><SelectValue placeholder="Elegí una sección" /></SelectTrigger>
                <SelectContent>{sections.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nombre</Label>
              <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Limpieza Facial" />
            </div>
            <div className="space-y-2"><Label>Descripción</Label>
              <Textarea rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duración</Label>
                <Select value={formData.duration?.toString()} onValueChange={(v) => setFormData({ ...formData, duration: parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="Duración" /></SelectTrigger>
                  <SelectContent>{DURATION_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Precio ($)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="30000"
                  value={formData.price ? formatPriceARS(formData.price).replace('$', '') : ''}
                  onChange={(e) => setFormData({ ...formData, price: parsePrice(e.target.value) })}
                />
              </div>
            </div>
            <ImagePicker
              imageUrl={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              cropperOpen={isCropperOpen} setCropperOpen={setIsCropperOpen}
              tempImg={tempImageUrl} setTempImg={setTempImageUrl}
            />
            <p className="text-xs text-muted-foreground">
              Los días y horarios disponibles para reservar se configuran en la pestaña <strong>Horarios</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button variant="gradient" onClick={handleSubmit}>{editingService ? 'Guardar Cambios' : 'Crear Servicio'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== ESPECIALES (mirror de secciones) ============== */}
      <div className="border-t border-border pt-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Star className="w-6 h-6 text-primary" /> Especiales
            </h2>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Categorías de servicios especiales. Comparten franja horaria con los servicios regulares y pueden reservarse en paralelo.
            </p>
          </div>
          <Dialog open={isSpecialCatDialogOpen} onOpenChange={(o) => { setIsSpecialCatDialogOpen(o); if (!o) resetSpecialCatForm(); }}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Agregar Categoría</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{editingSpecialCat ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                <DialogDescription>Las categorías agrupan los especiales en la página principal.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Nombre</Label>
                  <Input value={specialCatForm.name || ''} onChange={(e) => setSpecialCatForm({ ...specialCatForm, name: e.target.value })} placeholder="Ej: Workshops" />
                </div>
                <div className="space-y-2"><Label>Descripción</Label>
                  <Textarea rows={3} value={specialCatForm.description || ''} onChange={(e) => setSpecialCatForm({ ...specialCatForm, description: e.target.value })} />
                </div>
                <ImagePicker
                  imageUrl={specialCatForm.imageUrl}
                  onChange={(url) => setSpecialCatForm({ ...specialCatForm, imageUrl: url })}
                  cropperOpen={isSpecialCatCropperOpen} setCropperOpen={setIsSpecialCatCropperOpen}
                  tempImg={specialCatTempImg} setTempImg={setSpecialCatTempImg}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSpecialCatDialogOpen(false)}>Cancelar</Button>
                <Button variant="gradient" onClick={handleSpecialCatSubmit}>{editingSpecialCat ? 'Guardar Cambios' : 'Crear Categoría'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {specialCategories.length === 0 && orphanSpecials.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Todavía no hay categorías de especiales.</p>
          </div>
        )}

        {specialCategories.map((cat) => (
          <div key={cat.id} className="space-y-4 border border-border rounded-2xl p-4 md:p-6 bg-card/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-4">
                {cat.imageUrl ? (
                  <div className="w-16 h-16 rounded-xl bg-cover bg-center border" style={{ backgroundImage: `url(${cat.imageUrl})` }} />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center"><Star className="w-7 h-7 text-primary" /></div>
                )}
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-semibold">{cat.name}</h2>
                  {cat.description && <p className="text-sm text-muted-foreground line-clamp-1 max-w-xl">{cat.description}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleSpecialCatEdit(cat)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleSpecialCatDelete(cat)}><Trash2 className="w-4 h-4" /></Button>
                <Button variant="gradient" size="sm" onClick={() => openNewSpecialFor(cat.id)}><Plus className="w-4 h-4 mr-1" /> Especial</Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {specialsByCategory(cat.id).map((sp) => (
                <Card key={sp.id} className="card-elevated overflow-hidden border-primary/30">
                  {sp.imageUrl ? (
                    <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${sp.imageUrl})` }} />
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center"><Star className="w-12 h-12 text-primary/30" /></div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-xl">{sp.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{sp.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{sp.duration} min</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{formatPriceARS(sp.price)}</span>
                    </div>
                    {sp.date && <div className="text-xs">📅 {sp.date}</div>}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSpecialEdit(sp)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleSpecialDelete(sp)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {specialsByCategory(cat.id).length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground py-4">Sin especiales en esta categoría.</div>
              )}
            </div>
          </div>
        ))}

        {orphanSpecials.length > 0 && (
          <div className="space-y-4 border border-dashed border-border rounded-2xl p-4 md:p-6">
            <h2 className="text-lg font-display font-semibold text-muted-foreground">Especiales sin categoría</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orphanSpecials.map((sp) => (
                <Card key={sp.id} className="card-elevated overflow-hidden">
                  <CardHeader className="pb-2"><CardTitle className="font-display text-lg">{sp.name}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSpecialEdit(sp)}><Edit className="w-4 h-4 mr-1" /> Asignar categoría</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleSpecialDelete(sp)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* SPECIAL SERVICE DIALOG */}
        <Dialog open={isSpecialDialogOpen} onOpenChange={(o) => { setIsSpecialDialogOpen(o); if (!o) resetSpecialForm(); }}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{editingSpecialService ? 'Editar Especial' : 'Nuevo Especial'}</DialogTitle>
              <DialogDescription>Los especiales usan la misma franja horaria que los servicios regulares y pueden reservarse al mismo tiempo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={specialFormData.categoryId || ''} onValueChange={(v) => setSpecialFormData({ ...specialFormData, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Elegí una categoría" /></SelectTrigger>
                  <SelectContent>{specialCategories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Nombre</Label>
                <Input value={specialFormData.name || ''} onChange={(e) => setSpecialFormData({ ...specialFormData, name: e.target.value })} placeholder="Ej: Workshop" />
              </div>
              <div className="space-y-2"><Label>Descripción</Label>
                <Textarea rows={3} value={specialFormData.description || ''} onChange={(e) => setSpecialFormData({ ...specialFormData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Duración</Label>
                  <Select value={specialFormData.duration?.toString()} onValueChange={(v) => setSpecialFormData({ ...specialFormData, duration: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Duración" /></SelectTrigger>
                    <SelectContent>{DURATION_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Precio ($)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="30000"
                    value={specialFormData.price ? formatPriceARS(specialFormData.price).replace('$', '') : ''}
                    onChange={(e) => setSpecialFormData({ ...specialFormData, price: parsePrice(e.target.value) })}
                  />
                </div>
              </div>
              <ImagePicker
                imageUrl={specialFormData.imageUrl}
                onChange={(url) => setSpecialFormData({ ...specialFormData, imageUrl: url })}
                cropperOpen={isSpecialCropperOpen} setCropperOpen={setIsSpecialCropperOpen}
                tempImg={specialTempImageUrl} setTempImg={setSpecialTempImageUrl}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSpecialDialogOpen(false)}>Cancelar</Button>
              <Button variant="gradient" onClick={handleSpecialSubmit}>{editingSpecialService ? 'Guardar Cambios' : 'Crear Especial'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============== ÚNICOS (WhatsApp directo) ============== */}
        <div className="pt-12 border-t border-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-emerald-600" /> Servicios Únicos
              </h2>
              <p className="text-sm text-muted-foreground">
                No toman turno online. En la página principal abren WhatsApp con un mensaje pre-llenado.
              </p>
            </div>
            <Button variant="gradient" onClick={openUniqueNew} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Agregar Servicio Único
            </Button>
          </div>

          {uniqueServices.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aún no hay servicios únicos.</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueServices.map((u) => (
                <Card key={u.id} className="overflow-hidden">
                  {u.imageUrl && (
                    <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${u.imageUrl})` }} />
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-600" /> {u.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{u.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {u.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openUniqueEdit(u)}>
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleUniqueDelete(u)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={isUniqueDialogOpen} onOpenChange={setIsUniqueDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {editingUnique ? 'Editar Servicio Único' : 'Nuevo Servicio Único'}
                </DialogTitle>
                <DialogDescription>
                  Aparece en la página principal con un botón que abre WhatsApp con un mensaje pre-llenado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={uniqueForm.name || ''}
                    onChange={(e) => setUniqueForm({ ...uniqueForm, name: e.target.value })}
                    placeholder="Ej: Consulta personalizada"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    rows={3}
                    value={uniqueForm.description || ''}
                    onChange={(e) => setUniqueForm({ ...uniqueForm, description: e.target.value })}
                    placeholder="Breve descripción del servicio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono WhatsApp (opcional)</Label>
                  <Input
                    value={uniqueForm.phone || ''}
                    onChange={(e) => setUniqueForm({ ...uniqueForm, phone: e.target.value })}
                    placeholder="Ej: 5492613820741 (solo dígitos, con código de país)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si lo dejás vacío, se usa el número por defecto de la estética.
                  </p>
                </div>
                <ImagePicker
                  imageUrl={uniqueForm.imageUrl}
                  onChange={(url) => setUniqueForm({ ...uniqueForm, imageUrl: url })}
                  cropperOpen={isUniqueCropperOpen} setCropperOpen={setIsUniqueCropperOpen}
                  tempImg={uniqueTempImg} setTempImg={setUniqueTempImg}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUniqueDialogOpen(false)}>Cancelar</Button>
                <Button variant="gradient" onClick={handleUniqueSubmit}>
                  {editingUnique ? 'Guardar Cambios' : 'Crear Servicio Único'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
