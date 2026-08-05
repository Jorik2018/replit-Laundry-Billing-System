import { useState } from "react";
import { 
  useListFacturas, 
  usePagarFactura,
  useGetFactura,
  getListFacturasQueryKey,
  getGetFacturaQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, FileText, CheckCircle2, Clock, Printer, CreditCard, Banknote, Building, Eye } from "lucide-react";
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export default function Facturas() {
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const params = filtroEstado !== "todas" ? { estadoPago: filtroEstado as any } : undefined;
  const { data: facturas, isLoading } = useListFacturas(params);
  
  const { data: facturaDetalle, isLoading: loadingDetalle } = useGetFactura(selectedFactura?.id || 0, {
    query: { enabled: isViewDialogOpen && !!selectedFactura?.id, queryKey: getGetFacturaQueryKey(selectedFactura?.id || 0) }
  });

  const pagarFactura = usePagarFactura();

  const handleOpenPay = (factura: any) => {
    setSelectedFactura(factura);
    setMetodoPago("efectivo");
    setIsPayDialogOpen(true);
  };

  const handleOpenView = (factura: any) => {
    setSelectedFactura(factura);
    setIsViewDialogOpen(true);
  };

  const handlePay = async () => {
    if (!selectedFactura) return;
    try {
      await pagarFactura.mutateAsync({ 
        id: selectedFactura.id, 
        data: { metodoPago: metodoPago as any } 
      });
      queryClient.invalidateQueries({ queryKey: getListFacturasQueryKey() });
      toast({ title: "Factura marcada como pagada" });
      setIsPayDialogOpen(false);
    } catch (error) {
      toast({ title: "Error al registrar pago", variant: "destructive" });
    }
  };

  const getMethodIcon = (method: string) => {
    switch(method) {
      case 'efectivo': return <Banknote className="w-4 h-4" />;
      case 'tarjeta': return <CreditCard className="w-4 h-4" />;
      case 'transferencia': return <Building className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground mt-1">
            Historial de cobros y cuentas pendientes
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex gap-4 items-center">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Estado de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las facturas</SelectItem>
              <SelectItem value="pendiente">Pendientes de pago</SelectItem>
              <SelectItem value="pagado">Pagadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Factura #</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Orden Asoc.</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Cargando facturas...
                  </td>
                </tr>
              ) : facturas?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron facturas
                  </td>
                </tr>
              ) : (
                facturas?.map((factura) => (
                  <tr key={factura.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2 text-primary">
                        <FileText className="w-4 h-4" />
                        {factura.numeroFactura}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(factura.createdAt), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      #{factura.ordenId}
                    </td>
                    <td className="px-4 py-3">
                      {factura.estadoPago === 'pagado' ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-500">
                            <CheckCircle2 className="w-3 h-3" />
                            Pagado
                          </span>
                          {factura.metodoPago && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              {getMethodIcon(factura.metodoPago)} {factura.metodoPago}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-500">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-card-foreground">
                      {formatCurrency(factura.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {factura.estadoPago === 'pendiente' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs h-8 bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleOpenPay(factura)}
                          >
                            Pagar
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpenView(factura)}
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

      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Factura {selectedFactura?.numeroFactura} por un total de {selectedFactura ? formatCurrency(selectedFactura.total) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPago('efectivo')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    metodoPago === 'efectivo' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-xs font-medium">Efectivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('tarjeta')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    metodoPago === 'tarjeta' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs font-medium">Tarjeta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('transferencia')}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    metodoPago === 'transferencia' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Building className="w-6 h-6" />
                  <span className="text-xs font-medium">Transf.</span>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={pagarFactura.isPending}>
              {pagarFactura.isPending ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {loadingDetalle || !facturaDetalle ? (
            <div className="py-12 text-center animate-pulse">Cargando factura...</div>
          ) : (
            <div className="bg-white text-black p-6 rounded-lg font-mono text-sm border-2 border-dashed border-gray-300">
              <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest">LAVANDERÍA</h2>
                <p className="text-xs mt-1">Factura Simplificada</p>
                <p className="text-xs mt-1 font-bold">{facturaDetalle.numeroFactura}</p>
                <p className="text-xs mt-1">{format(new Date(facturaDetalle.createdAt), "dd/MM/yyyy HH:mm")}</p>
              </div>

              <div className="mb-4">
                <p>Cliente: {facturaDetalle.orden.clienteNombre}</p>
                <p>Orden Ref: #{facturaDetalle.ordenId}</p>
              </div>

              <div className="border-y-2 border-dashed border-gray-300 py-3 mb-4 space-y-2">
                <div className="grid grid-cols-12 gap-2 font-bold mb-1">
                  <div className="col-span-2">CANT</div>
                  <div className="col-span-7">CONCEPTO</div>
                  <div className="col-span-3 text-right">SUBT</div>
                </div>
                {facturaDetalle.orden.items.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 text-xs">
                    <div className="col-span-2">{item.cantidad}</div>
                    <div className="col-span-7 truncate">{item.servicioNombre}</div>
                    <div className="col-span-3 text-right">{formatCurrency(item.subtotal)}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-xs uppercase font-bold">Estado: {facturaDetalle.estadoPago}</p>
                  {facturaDetalle.metodoPago && <p className="text-xs mt-0.5">Vía: {facturaDetalle.metodoPago}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs">TOTAL A PAGAR</p>
                  <p className="text-xl font-bold">{formatCurrency(facturaDetalle.total)}</p>
                </div>
              </div>

              <div className="text-center text-xs opacity-70 mt-8 pt-4 border-t-2 border-dashed border-gray-300">
                ¡Gracias por su preferencia!
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 sm:justify-center">
            <Button onClick={() => window.print()} className="gap-2 w-full sm:w-auto">
              <Printer className="w-4 h-4" />
              Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
