import { useState } from "react";
import { 
  useListServicios, 
  useCreateServicio, 
  useUpdateServicio, 
  useDeleteServicio,
  getListServiciosQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Tag, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Servicios() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: servicios, isLoading } = useListServicios();
  const createServicio = useCreateServicio();
  const updateServicio = useUpdateServicio();
  const deleteServicio = useDeleteServicio();

  const handleOpenCreate = () => {
    setSelectedServicio(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (servicio: any) => {
    setSelectedServicio(servicio);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este servicio?")) {
      try {
        await deleteServicio.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListServiciosQueryKey() });
        toast({ title: "Servicio eliminado" });
      } catch (error) {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    }
  };

  const handleToggleActivo = async (id: number, activo: boolean) => {
    try {
      await updateServicio.mutateAsync({ id, data: { activo } });
      queryClient.invalidateQueries({ queryKey: getListServiciosQueryKey() });
      toast({ title: activo ? "Servicio activado" : "Servicio desactivado" });
    } catch (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre: formData.get("nombre") as string,
      descripcion: formData.get("descripcion") as string,
      precio: parseFloat(formData.get("precio") as string),
      unidad: formData.get("unidad") as string,
      activo: formData.get("activo") === "on",
    };

    try {
      if (selectedServicio) {
        await updateServicio.mutateAsync({ id: selectedServicio.id, data });
        toast({ title: "Servicio actualizado" });
      } else {
        await createServicio.mutateAsync({ data });
        toast({ title: "Servicio creado" });
      }
      queryClient.invalidateQueries({ queryKey: getListServiciosQueryKey() });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de servicios y precios
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Servicio
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)
        ) : servicios?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
            No hay servicios configurados
          </div>
        ) : (
          servicios?.map((servicio) => (
            <div 
              key={servicio.id} 
              className={`bg-card border rounded-xl p-5 shadow-sm transition-all ${servicio.activo ? 'border-border' : 'border-border/50 opacity-75'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{servicio.nombre}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {servicio.activo ? (
                        <><Check className="w-3 h-3 text-emerald-500" /> Activo</>
                      ) : (
                        <><X className="w-3 h-3 text-destructive" /> Inactivo</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => handleOpenEdit(servicio)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(servicio.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              
              {servicio.descripcion && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {servicio.descripcion}
                </p>
              )}
              
              <div className="mt-4 pt-4 border-t border-border flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Precio</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold">{formatCurrency(servicio.precio)}</span>
                    <span className="text-sm text-muted-foreground">/ {servicio.unidad}</span>
                  </div>
                </div>
                <Switch 
                  checked={servicio.activo} 
                  onCheckedChange={(checked) => handleToggleActivo(servicio.id, checked)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedServicio ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del servicio</Label>
                <Input id="nombre" name="nombre" defaultValue={selectedServicio?.nombre} placeholder="Ej: Lavado y secado" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" name="descripcion" defaultValue={selectedServicio?.descripcion} placeholder="Detalles del servicio..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio</Label>
                  <Input id="precio" name="precio" type="number" step="0.01" min="0" defaultValue={selectedServicio?.precio} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidad">Unidad</Label>
                  <Input id="unidad" name="unidad" defaultValue={selectedServicio?.unidad} placeholder="Ej: kilo, prenda" required />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 p-3 border border-border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="activo" className="text-base">Servicio activo</Label>
                  <p className="text-xs text-muted-foreground">Visible al crear órdenes</p>
                </div>
                <Switch id="activo" name="activo" defaultChecked={selectedServicio ? selectedServicio.activo : true} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createServicio.isPending || updateServicio.isPending}>
                {createServicio.isPending || updateServicio.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
