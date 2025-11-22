import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import DeliveryDialog from "@/components/DeliveryDialog";

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, warehouses(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch deliveries");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      waiting: { variant: "default", label: "Waiting" },
      ready: { variant: "default", label: "Ready" },
      done: { variant: "default", label: "Done" },
      canceled: { variant: "destructive", label: "Canceled" },
    };
    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className={status === "done" ? "bg-success" : ""}>
        {config.label}
      </Badge>
    );
  };

  const handleValidate = async (delivery: any) => {
    if (!confirm("Validate this delivery? This will update stock levels.")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get delivery items
      const { data: items, error: itemsError } = await supabase
        .from("delivery_items")
        .select("*")
        .eq("delivery_id", delivery.id);

      if (itemsError) throw itemsError;

      // Update stock for each item
      for (const item of items || []) {
        // Get warehouse stock record
        const { data: existingStock } = await supabase
          .from("product_warehouse_stock")
          .select("*")
          .eq("product_id", item.product_id)
          .eq("warehouse_id", delivery.warehouse_id)
          .single();

        if (!existingStock) {
          throw new Error("Insufficient stock");
        }

        const newQuantity = existingStock.quantity - item.quantity;
        if (newQuantity < 0) {
          throw new Error("Insufficient stock");
        }

        await supabase
          .from("product_warehouse_stock")
          .update({ quantity: newQuantity })
          .eq("id", existingStock.id);

        // Add to stock ledger
        await supabase.from("stock_ledger").insert({
          product_id: item.product_id,
          warehouse_id: delivery.warehouse_id,
          transaction_type: "delivery",
          reference_id: delivery.id,
          reference_number: delivery.delivery_number,
          quantity_change: -item.quantity,
          balance_after: newQuantity,
          created_by: user.id,
        });
      }

      // Update delivery status
      const { error: updateError } = await supabase
        .from("deliveries")
        .update({
          status: "done",
          validated_at: new Date().toISOString(),
          validated_by: user.id,
        })
        .eq("id", delivery.id);

      if (updateError) throw updateError;

      toast.success("Delivery validated successfully");
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.message || "Failed to validate delivery");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Deliveries
          </h1>
          <p className="text-muted-foreground">Manage outgoing stock</p>
        </div>
        <Button
          onClick={() => {
            setSelectedDelivery(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-primary hover:opacity-90 shadow-glass"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Delivery
        </Button>
      </div>

      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead>Delivery #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No deliveries found. Create your first delivery to get started.
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery) => (
                <TableRow key={delivery.id} className="border-border/50">
                  <TableCell className="font-mono text-primary">
                    {delivery.delivery_number}
                  </TableCell>
                  <TableCell className="font-medium">{delivery.customer_name}</TableCell>
                  <TableCell>{delivery.warehouses?.name || "-"}</TableCell>
                  <TableCell>{format(new Date(delivery.delivery_date), "PP")}</TableCell>
                  <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setDialogOpen(true);
                        }}
                      >
                        View
                      </Button>
                      {delivery.status === "ready" && (
                        <Button
                          size="sm"
                          onClick={() => handleValidate(delivery)}
                          className="bg-success hover:bg-success/90"
                        >
                          Validate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeliveryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        delivery={selectedDelivery}
        onSuccess={fetchDeliveries}
      />
    </div>
  );
};

export default Deliveries;
