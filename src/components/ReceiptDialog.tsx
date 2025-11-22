import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: any | null;
  onSuccess: () => void;
}

const ReceiptDialog = ({ open, onOpenChange, receipt, onSuccess }: ReceiptDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier_name: "",
    warehouse_id: "",
    notes: "",
    status: "draft",
  });
  const [items, setItems] = useState<any[]>([{ product_id: "", quantity: 1 }]);

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (receipt) {
      setFormData({
        supplier_name: receipt.supplier_name,
        warehouse_id: receipt.warehouse_id,
        notes: receipt.notes || "",
        status: receipt.status,
      });
      fetchReceiptItems(receipt.id);
    } else {
      setFormData({
        supplier_name: "",
        warehouse_id: "",
        notes: "",
        status: "draft",
      });
      setItems([{ product_id: "", quantity: 1 }]);
    }
  }, [receipt]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("*").eq("is_active", true);
    setWarehouses(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  };

  const fetchReceiptItems = async (receiptId: string) => {
    const { data } = await supabase
      .from("receipt_items")
      .select("*")
      .eq("receipt_id", receiptId);
    if (data && data.length > 0) {
      setItems(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const receiptNumber = `REC-${Date.now()}`;

      if (receipt) {
        // Update existing receipt
        const { error } = await supabase
          .from("receipts")
          .update(formData)
          .eq("id", receipt.id);
        if (error) throw error;

        // Delete old items and insert new ones
        await supabase.from("receipt_items").delete().eq("receipt_id", receipt.id);
        
        const itemsToInsert = items.map(item => ({
          receipt_id: receipt.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));
        
        const { error: itemsError } = await supabase
          .from("receipt_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast.success("Receipt updated successfully");
      } else {
        // Create new receipt
        const { data: newReceipt, error } = await supabase
          .from("receipts")
          .insert([{
            ...formData,
            receipt_number: receiptNumber,
            created_by: user.id,
          }])
          .select()
          .single();

        if (error) throw error;

        // Insert items
        const itemsToInsert = items.map(item => ({
          receipt_id: newReceipt.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("receipt_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast.success("Receipt created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border/50 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
            {receipt ? "Edit Receipt" : "New Receipt"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier Name *</Label>
              <Input
                id="supplier"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                required
                className="glass-card border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                required
              >
                <SelectTrigger className="glass-card border-border/50">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items *</Label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => {
                        const newItems = [...items];
                        newItems[index].product_id = value;
                        setItems(newItems);
                      }}
                      required
                    >
                      <SelectTrigger className="glass-card border-border/50">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.name} ({prod.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = parseFloat(e.target.value);
                        setItems(newItems);
                      }}
                      className="glass-card border-border/50"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems([...items, { product_id: "", quantity: 1 }])}
                className="border-border/50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="glass-card border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="glass-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-primary hover:opacity-90 shadow-glass"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {receipt ? "Update" : "Create"} Receipt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
