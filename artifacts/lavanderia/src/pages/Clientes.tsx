import { useState } from "react";
import { 
  useListClientes, 
  useCreateCliente, 
  useUpdateCliente, 
  useDeleteCliente,
  getListClientesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { format } from "date-fns";
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

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: clientes, isLoading } = useListClientes({ search });
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const deleteCliente = useDeleteCliente();

  const handleOpenCreate = () => {
    setSelectedCliente(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cliente: any) => {
    setSelectedCliente(cliente);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      try {
        await deleteCliente.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListClientesQueryKey() });
        toast({ title: "Cliente eliminado" });
      } catch (error) {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nombre: formData.get("nombre") as string,
      apellido: formData.get("apellido") as string,
      telefono: formData.get("telefono") as string,
      email: formData.get("email") as string,
      direccion: formData.get("direccion") as string,
      notas: formData.get("notas") as string,
    };

    try {
      if (selectedCliente) {
        await updateCliente.mutateAsync({ id: selectedCliente.id, data });
        toast({ title: "Cliente actualizado" });
      } else {
        await createCliente.mutateAsync({ data });
        toast({ title: "Cliente creado" });
      }
      queryClient.invalidateQueries({ queryKey: getListClientesQueryKey() });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la información de tus clientes y su historial
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, teléfono o email..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Dirección</th>
                <th className="px-4 py-3 font-medium">Registro</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Cargando clientes...
                  </td>
                </tr>
              ) : clientes?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                clientes?.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-card-foreground">
                        {cliente.nombre} {cliente.apellido}
                      </div>
                      {cliente.notas && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                          {cliente.notas}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs">{cliente.telefono}</span>
                        </div>
                        {cliente.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs">{cliente.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cliente.direccion ? (
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="text-xs truncate max-w-[200px]">{cliente.direccion}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(cliente.createdAt), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(cliente)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(cliente.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedCliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" defaultValue={selectedCliente?.nombre} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" name="apellido" defaultValue={selectedCliente?.apellido} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" name="telefono" defaultValue={selectedCliente?.telefono} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={selectedCliente?.email} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" name="direccion" defaultValue={selectedCliente?.direccion} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Input id="notas" name="notas" defaultValue={selectedCliente?.notas} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createCliente.isPending || updateCliente.isPending}>
                {createCliente.isPending || updateCliente.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
