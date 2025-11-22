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
import ReceiptDialog from "@/components/ReceiptDialog";

const Receipts = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*, warehouses(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch receipts");
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

  const handleValidate = async (receipt: any) => {
    if (!confirm("Validate this receipt? This will update stock levels.")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get receipt items
      const { data: items, error: itemsError } = await supabase
        .from("receipt_items")
        .select("*")
        .eq("receipt_id", receipt.id);

      if (itemsError) throw itemsError;

      // Update stock for each item
      for (const item of items || []) {
        // Get or create warehouse stock record
        const { data: existingStock } = await supabase
          .from("product_warehouse_stock")
          .select("*")
          .eq("product_id", item.product_id)
          .eq("warehouse_id", receipt.warehouse_id)
          .single();

        const newQuantity = (existingStock?.quantity || 0) + item.quantity;

        if (existingStock) {
          await supabase
            .from("product_warehouse_stock")
            .update({ quantity: newQuantity })
            .eq("id", existingStock.id);
        } else {
          await supabase.from("product_warehouse_stock").insert({
            product_id: item.product_id,
            warehouse_id: receipt.warehouse_id,
            quantity: newQuantity,
          });
        }

        // Add to stock ledger
        await supabase.from("stock_ledger").insert({
          product_id: item.product_id,
          warehouse_id: receipt.warehouse_id,
          transaction_type: "receipt",
          reference_id: receipt.id,
          reference_number: receipt.receipt_number,
          quantity_change: item.quantity,
          balance_after: newQuantity,
          created_by: user.id,
        });
      }

      // Update receipt status
      const { error: updateError } = await supabase
        .from("receipts")
        .update({
          status: "done",
          validated_at: new Date().toISOString(),
          validated_by: user.id,
        })
        .eq("id", receipt.id);

      if (updateError) throw updateError;

      toast.success("Receipt validated successfully");
      fetchReceipts();
    } catch (error: any) {
      toast.error(error.message || "Failed to validate receipt");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Receipts
          </h1>
          <p className="text-muted-foreground">Manage incoming stock</p>
        </div>
        <Button
          onClick={() => {
            setSelectedReceipt(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-primary hover:opacity-90 shadow-glass"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Receipt
        </Button>
      </div>

      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead>Receipt #</TableHead>
              <TableHead>Supplier</TableHead>
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
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No receipts found. Create your first receipt to get started.
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((receipt) => (
                <TableRow key={receipt.id} className="border-border/50">
                  <TableCell className="font-mono text-primary">
                    {receipt.receipt_number}
                  </TableCell>
                  <TableCell className="font-medium">{receipt.supplier_name}</TableCell>
                  <TableCell>{receipt.warehouses?.name || "-"}</TableCell>
                  <TableCell>{format(new Date(receipt.receipt_date), "PP")}</TableCell>
                  <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setDialogOpen(true);
                        }}
                      >
                        View
                      </Button>
                      {receipt.status === "ready" && (
                        <Button
                          size="sm"
                          onClick={() => handleValidate(receipt)}
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

      <ReceiptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        receipt={selectedReceipt}
        onSuccess={fetchReceipts}
      />
    </div>
  );
};

export default Receipts;
