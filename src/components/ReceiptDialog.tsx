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
    if (open) {
      fetchWarehouses();
      fetchProducts();
    }
  }, [open]); // Fetch when dialog opens

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
  }, [receipt, open]);

  const fetchWarehouses = async () => {
    // Removed .eq('is_active', true) just to be safe for the hackathon
    const { data } = await supabase.from("warehouses").select("*");
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
    if (!formData.warehouse_id) {
        toast.error("Please select a warehouse");
        return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate a random receipt number if creating new
      const receiptNumber = `REC-${Math.floor(Math.random() * 100000)}`;

      if (receipt) {
        // Update
        const { error } = await supabase
          .from("receipts")
          .update(formData)
          .eq("id", receipt.id);
        if (error) throw error;

        // Reset Items (Simple delete all and re-add strategy for MVP)
        await supabase.from("receipt_items").delete().eq("receipt_id", receipt.id);
        
        const itemsToInsert = items.map(item => ({
          receipt_id: receipt.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));
        
        await supabase.from("receipt_items").insert(itemsToInsert);

        toast.success("Receipt updated");
      } else {
        // Create
        const { data: newReceipt, error } = await supabase
          .from("receipts")
          .insert([{
            ...formData,
            receipt_number: receiptNumber,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (error) throw error;

        const itemsToInsert = items.map(item => ({
          receipt_id: newReceipt.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));

        await supabase.from("receipt_items").insert(itemsToInsert);
        toast.success("Receipt created");
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
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                required
              >
                <SelectTrigger>
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
            <Label>Products *</Label>
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
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
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
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = parseFloat(e.target.value);
                        setItems(newItems);
                      }}
                      placeholder="Qty"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems([...items, { product_id: "", quantity: 1 }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Receipt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;