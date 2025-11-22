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
    fetchWarehouses();
    fetchProducts();
  }, []);

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
  }, [delivery]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("*").eq("is_active", true);
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
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const deliveryNumber = `DEL-${Date.now()}`;

      if (delivery) {
        const { error } = await supabase
          .from("deliveries")
          .update(formData)
          .eq("id", delivery.id);
        if (error) throw error;

        await supabase.from("delivery_items").delete().eq("delivery_id", delivery.id);
        
        const itemsToInsert = items.map(item => ({
          delivery_id: delivery.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));
        
        const { error: itemsError } = await supabase
          .from("delivery_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast.success("Delivery updated successfully");
      } else {
        const { data: newDelivery, error } = await supabase
          .from("deliveries")
          .insert([{
            ...formData,
            delivery_number: deliveryNumber,
            created_by: user.id,
          }])
          .select()
          .single();

        if (error) throw error;

        const itemsToInsert = items.map(item => ({
          delivery_id: newDelivery.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("delivery_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast.success("Delivery created successfully");
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
            {delivery ? "Edit Delivery" : "New Delivery"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer Name *</Label>
              <Input
                id="customer"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
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
              {delivery ? "Update" : "Create"} Delivery
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryDialog;
