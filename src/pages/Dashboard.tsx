import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  TrendingUp,
  Building2,
} from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  totalStockValue: number;
  warehouseCount: number;
}

const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    pendingTransfers: 0,
    totalStockValue: 0,
    warehouseCount: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [
        productsRes,
        receiptsRes,
        deliveriesRes,
        transfersRes,
        warehousesRes,
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("receipts").select("*").in("status", ["draft", "waiting", "ready"]),
        supabase.from("deliveries").select("*").in("status", ["draft", "waiting", "ready"]),
        supabase.from("transfers").select("*").in("status", ["draft", "waiting", "ready"]),
        supabase.from("warehouses").select("*"),
      ]);

      const products = productsRes.data || [];

      const lowStock = products.filter(
        (p) => Number(p.current_stock) <= (p.reorder_level || 10)
      );

      setStats({
        totalProducts: products.length,
        lowStockItems: lowStock.length,
        pendingReceipts: receiptsRes.data?.length || 0,
        pendingDeliveries: deliveriesRes.data?.length || 0,
        pendingTransfers: transfersRes.data?.length || 0,
        totalStockValue: products.reduce(
          (sum, p) => sum + Number(p.current_stock || 0),
          0
        ),
        warehouseCount: warehousesRes.data?.length || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
      link: "/products",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
      link: "/products?filter=low-stock",
    },
    {
      title: "Pending Receipts",
      value: stats.pendingReceipts,
      icon: ArrowDownToLine,
      color: "text-success",
      bgColor: "bg-success/10",
      link: "/receipts",
    },
    {
      title: "Pending Deliveries",
      value: stats.pendingDeliveries,
      icon: ArrowUpFromLine,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      link: "/deliveries",
    },
    {
      title: "Pending Transfers",
      value: stats.pendingTransfers,
      icon: ArrowLeftRight,
      color: "text-accent",
      bgColor: "bg-accent/10",
      link: "/transfers",
    },
    {
      title: "Total Stock Units",
      value: Math.round(stats.totalStockValue),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      link: "/products",
    },
  ];

  const operationsCards = [
    {
      title: "Warehouses",
      value: stats.warehouseCount,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      link: "/warehouses",
    },
    {
      title: "Transfers",
      value: stats.pendingTransfers,
      icon: ArrowLeftRight,
      color: "text-purple-600",
      bgColor: "bg-purple-200/30",
      link: "/transfers",
    },
    {
      title: "Deliveries",
      value: stats.pendingDeliveries,
      icon: ArrowUpFromLine,
      color: "text-red-600",
      bgColor: "bg-red-200/30",
      link: "/deliveries",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Overview of your inventory operations</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, idx) => (
          <Card
            key={stat.title}
            onClick={() => navigate(stat.link)}
            className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "..." : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operations */}
      <div>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Operations</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {operationsCards.map((op, idx) => (
            <Card
              key={op.title}
              onClick={() => navigate(op.link)}
              className="glass-card border-border/50 hover:border-primary/40 transition-all duration-300 cursor-pointer"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {op.title}
                </CardTitle>
                <div className={`${op.bgColor} p-2 rounded-lg`}>
                  <op.icon className={`h-5 w-5 ${op.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "..." : op.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
