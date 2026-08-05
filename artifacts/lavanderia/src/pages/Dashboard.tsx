import { 
  useGetDashboardResumen, 
  useGetOrdenesRecientes,
  getGetDashboardResumenQueryKey,
  getGetOrdenesRecientesQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  FileText
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Link } from "wouter";

// We'll create custom simple cards to avoid missing components
function KpiCard({ title, value, subtitle, icon: Icon, colorClass }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-lg flex-shrink-0 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-card-foreground">{value}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

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

export default function Dashboard() {
  const { data: resumen, isLoading: loadingResumen } = useGetDashboardResumen();
  const { data: recientes, isLoading: loadingRecientes } = useGetOrdenesRecientes();

  if (loadingResumen || loadingRecientes) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!resumen) return null;

  const chartData = [
    { name: "Pendientes", valor: resumen.ordenesPendientes, color: "hsl(38, 92%, 50%)" },
    { name: "En Proceso", valor: resumen.ordenesEnProceso, color: "hsl(221, 83%, 53%)" },
    { name: "Listas", valor: resumen.ordenesListas, color: "hsl(142, 71%, 45%)" },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de operaciones de hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Link href="/ordenes/nueva" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Nueva Orden
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Órdenes Hoy" 
          value={resumen.ordenesHoy} 
          icon={ShoppingBag}
          colorClass="bg-primary/10 text-primary"
        />
        <KpiCard 
          title="Ingresos Hoy" 
          value={formatCurrency(resumen.ingresosHoy)} 
          icon={DollarSign}
          colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500"
        />
        <KpiCard 
          title="Ingresos del Mes" 
          value={formatCurrency(resumen.ingresosMes)} 
          icon={TrendingUp}
          colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500"
        />
        <KpiCard 
          title="Clientes Totales" 
          value={resumen.clientesTotales} 
          icon={Users}
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Órdenes Recientes</h2>
            <Link href="/ordenes" className="text-sm text-primary hover:underline font-medium">
              Ver todas
            </Link>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recientes?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No hay órdenes recientes
                      </td>
                    </tr>
                  ) : (
                    recientes?.map((orden) => (
                      <tr key={orden.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">#{orden.id}</td>
                        <td className="px-4 py-3">{orden.clienteNombre || 'Sin nombre'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(orden.createdAt), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[orden.estado]}`}>
                            {statusLabels[orden.estado]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(orden.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Estado Actual</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Pendientes</span>
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{resumen.ordenesPendientes}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Listas</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{resumen.ordenesListas}</p>
              </div>
            </div>
            
            {(resumen.facturasPendientes > 0) && (
              <div className="mt-4 bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-3">
                <FileText className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Facturas por cobrar</p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Tienes {resumen.facturasPendientes} facturas pendientes por un total de {formatCurrency(resumen.facturasPendientesMonto || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
