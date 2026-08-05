import { useState } from "react";
import { 
  useListOrdenes, 
  useCreateOrden, 
  useUpdateOrden, 
  useDeleteOrden,
  useGetOrden,
  useListClientes,
  useListServicios,
  useCreateFactura,
  getListOrdenesQueryKey,
  getGetOrdenQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Printer, FileText, ShoppingBag, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { es } from "date-fns/locale";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

const statusColors: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-500",
  en_proceso: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-500",
  listo: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-500",
  entregado: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  listo: "Listo",
  entregado: "Entregado",
};

export default function Ordenes() {
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);
  
  // Create Order State
  const [nuevoClienteId, setNuevoClienteId] = useState<string>("");
  const [nuevosItems, setNuevosItems] = useState<{servicioId: number, cantidad: number, precio: number, nombre: string}[]>([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const params = filtroEstado !== "todas" ? { estado: filtroEstado as any } : undefined;
  const { data: ordenes, isLoading } = useListOrdenes(params);
  
  const { data: clientes } = useListClientes();
  const { data: servicios } = useListServicios();
  const { data: ordenDetalle, isLoading: loadingDetalle } = useGetOrden(selectedOrdenId!, { 
    query: { enabled: !!selectedOrdenId, queryKey: getGetOrdenQueryKey(selectedOrdenId!) } 
  });
  
  const createOrden = useCreateOrden();
  const updateOrden = useUpdateOrden();
  const deleteOrden = useDeleteOrden();
  const createFactura = useCreateFactura();

  const handleOpenCreate = () => {
    setNuevoClienteId("");
    setNuevosItems([]);
    setNuevaNota("");
    setNuevaFecha("");
    setIsCreateOpen(true);
  };

  const handleView = (id: number) => {
    setSelectedOrdenId(id);
    setIsViewOpen(true);
  };

  const handleChangeStatus = async (id: number, estado: any) => {
    try {
      await updateOrden.mutateAsync({ id, data: { estado } });
      queryClient.invalidateQueries({ queryKey: getListOrdenesQueryKey() });
      if (selectedOrdenId === id) {
        queryClient.invalidateQueries({ queryKey: getGetOrdenQueryKey(id) });
      }
      toast({ title: "Estado actualizado" });
    } catch (error) {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    }
  };

  const handleCreateFactura = async (id: number) => {
    try {
      await createFactura.mutateAsync({ data: { ordenId: id } });
      queryClient.invalidateQueries({ queryKey: getGetOrdenQueryKey(id) });
      toast({ title: "Factura generada exitosamente" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.error || "Error al generar factura", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta orden? Se perderán todos sus items y factura si existe.")) {
      try {
        await deleteOrden.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListOrdenesQueryKey() });
        setIsViewOpen(false);
        toast({ title: "Orden eliminada" });
      } catch (error) {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    }
  };

  const handleCreateSubmit = async () => {
    if (!nuevoClienteId) {
      toast({ title: "Selecciona un cliente", variant: "destructive" });
      return;
    }
    if (nuevosItems.length === 0) {
      toast({ title: "Agrega al menos un servicio", variant: "destructive" });
      return;
    }

    try {
      await createOrden.mutateAsync({
        data: {
          clienteId: parseInt(nuevoClienteId),
          notas: nuevaNota,
          fechaEntregaEstimada: nuevaFecha || undefined,
          items: nuevosItems.map(item => ({
            servicioId: item.servicioId,
            cantidad: item.cantidad
          }))
        }
      });
      queryClient.invalidateQueries({ queryKey: getListOrdenesQueryKey() });
      setIsCreateOpen(false);
      toast({ title: "Orden creada exitosamente" });
    } catch (error) {
      toast({ title: "Error al crear orden", variant: "destructive" });
    }
  };

  const agregarItem = (servicioId: number) => {
    const srv = servicios?.find(s => s.id === servicioId);
    if (!srv) return;

    setNuevosItems(prev => {
      const exists = prev.find(item => item.servicioId === servicioId);
      if (exists) {
        return prev.map(item => item.servicioId === servicioId ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { servicioId, cantidad: 1, precio: srv.precio, nombre: srv.nombre }];
    });
  };

  const removerItem = (servicioId: number) => {
    setNuevosItems(prev => prev.filter(item => item.servicioId !== servicioId));
  };

  const totalNuevaOrden = nuevosItems.reduce((acc, item) => acc + (item.cantidad * item.precio), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes</h1>
          <p className="text-muted-foreground mt-1">
            Recepción y seguimiento de prendas
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex gap-4 items-center">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Estado de la orden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos los estados</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Orden #</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Fecha Recepción</th>
                <th className="px-4 py-3 font-medium">Entrega Est.</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Cargando órdenes...
                  </td>
                </tr>
              ) : ordenes?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron órdenes
                  </td>
                </tr>
              ) : (
                ordenes?.map((orden) => (
                  <tr key={orden.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-primary">
                      #{orden.id}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {orden.clienteNombre}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(orden.createdAt), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground flex items-center gap-1.5">
                      {orden.fechaEntregaEstimada ? (
                        <>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(orden.fechaEntregaEstimada), "dd/MM/yyyy")}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select 
                        value={orden.estado} 
                        onValueChange={(val) => handleChangeStatus(orden.id, val)}
                      >
                        <SelectTrigger className={`h-8 w-[130px] border-0 ring-1 ring-inset ${statusColors[orden.estado]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(orden.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleView(orden.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creacion Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Nueva Orden de Servicio
            </DialogTitle>
            <DialogDescription>
              Registra los servicios solicitados por el cliente
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={nuevoClienteId} onValueChange={setNuevoClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nombre} {c.apellido}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Estimada de Entrega</Label>
                <Input 
                  type="date" 
                  value={nuevaFecha} 
                  onChange={e => setNuevaFecha(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Notas / Instrucciones especiales</Label>
                <Input 
                  value={nuevaNota} 
                  onChange={e => setNuevaNota(e.target.value)} 
                  placeholder="Ej: Cuidado con manchas en el cuello"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Catálogo Rápido</h4>
                <div className="grid grid-cols-2 gap-2">
                  {servicios?.filter(s => s.activo).map(s => (
                    <button
                      key={s.id}
                      onClick={() => agregarItem(s.id)}
                      className="text-left p-2 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-xs"
                    >
                      <div className="font-medium truncate">{s.nombre}</div>
                      <div className="text-muted-foreground mt-0.5">{formatCurrency(s.precio)}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col">
              <h3 className="font-semibold mb-4 pb-2 border-b border-border">Detalle de la Orden</h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                {nuevosItems.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Sin servicios agregados
                  </div>
                ) : (
                  nuevosItems.map(item => (
                    <div key={item.servicioId} className="flex items-center justify-between bg-background p-2 rounded border border-border shadow-sm text-sm">
                      <div className="flex-1 truncate pr-2">
                        <p className="font-medium truncate">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground">{item.cantidad} x {formatCurrency(item.precio)}</p>
                      </div>
                      <div className="font-bold pr-2">
                        {formatCurrency(item.cantidad * item.precio)}
                      </div>
                      <button 
                        onClick={() => removerItem(item.servicioId)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-end justify-between">
                <span className="text-muted-foreground text-sm font-medium">Total Estimado</span>
                <span className="text-3xl font-bold text-primary">{formatCurrency(totalNuevaOrden)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSubmit} disabled={createOrden.isPending}>
              {createOrden.isPending ? "Procesando..." : "Confirmar Orden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vista Detalle Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {loadingDetalle || !ordenDetalle ? (
            <div className="py-12 text-center animate-pulse">Cargando detalles...</div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6">
                  <div>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                      Orden #{ordenDetalle.id}
                      <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${statusColors[ordenDetalle.estado]}`}>
                        {statusLabels[ordenDetalle.estado]}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="mt-1.5">
                      {format(new Date(ordenDetalle.createdAt), "dd MMMM yyyy, HH:mm", { locale: es })}
                    </DialogDescription>
                  </div>
                  {!ordenDetalle.factura && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleCreateFactura(ordenDetalle.id)}
                      disabled={createFactura.isPending}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generar Factura
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border my-4 bg-muted/10">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="font-medium">{ordenDetalle.clienteNombre}</p>
                  {ordenDetalle.clienteTelefono && (
                    <p className="text-sm text-muted-foreground">{ordenDetalle.clienteTelefono}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fechas</p>
                  <div className="text-sm space-y-0.5">
                    <p>Est: {ordenDetalle.fechaEntregaEstimada ? format(new Date(ordenDetalle.fechaEntregaEstimada), "dd/MM/yyyy") : '-'}</p>
                    <p>Real: {ordenDetalle.fechaEntregaReal ? format(new Date(ordenDetalle.fechaEntregaReal), "dd/MM/yyyy") : '-'}</p>
                  </div>
                </div>
                {ordenDetalle.notas && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-amber-900 dark:text-amber-400">
                      {ordenDetalle.notas}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">Servicios ({ordenDetalle.items.length})</h4>
                <div className="space-y-2">
                  {ordenDetalle.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                      <div>
                        <span className="font-medium mr-2">{item.cantidad}x</span>
                        <span className="text-muted-foreground">{item.servicioNombre || `Servicio #${item.servicioId}`}</span>
                      </div>
                      <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {ordenDetalle.factura && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-500">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-sm">Factura {ordenDetalle.factura.numeroFactura}</p>
                      <p className="text-xs opacity-80">Estado: {ordenDetalle.factura.estadoPago}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40">
                    Ver Factura
                  </Button>
                </div>
              )}

              <DialogFooter className="mt-6 flex sm:justify-between items-center w-full">
                <Button 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(ordenDetalle.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-muted-foreground text-sm">Total Orden</span>
                  <span className="text-2xl font-bold">{formatCurrency(ordenDetalle.total)}</span>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
