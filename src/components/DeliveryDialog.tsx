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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface DeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: any | null;
  onSuccess: () => void;
}

const DeliveryDialog = ({ open, onOpenChange, delivery, onSuccess }: DeliveryDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_name: "",
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
  }, [open]);

  useEffect(() => {
    if (delivery) {
      setFormData({
        customer_name: delivery.customer_name,
        warehouse_id: delivery.warehouse_id,
        notes: delivery.notes || "",
        status: delivery.status,
      });
      fetchDeliveryItems(delivery.id);
    } else {
      setFormData({
        customer_name: "",
        warehouse_id: "",
        notes: "",
        status: "draft",
      });
      setItems([{ product_id: "", quantity: 1 }]);
    }
  }, [delivery, open]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("*");
    setWarehouses(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  };

  const fetchDeliveryItems = async (deliveryId: string) => {
    const { data } = await supabase
      .from("delivery_items")
      .select("*")
      .eq("delivery_id", deliveryId);
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
      const deliveryNumber = `DEL-${Math.floor(Math.random() * 100000)}`;

      if (delivery) {
        // Update
        const { error } = await supabase.from("deliveries").update(formData).eq("id", delivery.id);
        if (error) throw error;

        await supabase.from("delivery_items").delete().eq("delivery_id", delivery.id);
        const itemsToInsert = items.map(item => ({
          delivery_id: delivery.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));
        await supabase.from("delivery_items").insert(itemsToInsert);

        toast.success("Delivery updated");
      } else {
        // Create
        const { data: newDelivery, error } = await supabase
          .from("deliveries")
          .insert([{
            ...formData,
            delivery_number: deliveryNumber,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (error) throw error;

        const itemsToInsert = items.map(item => ({
          delivery_id: newDelivery.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));

        await supabase.from("delivery_items").insert(itemsToInsert);
        toast.success("Delivery created");
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
            {delivery ? "Edit Delivery" : "New Delivery"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Delivery
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryDialog;