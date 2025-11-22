import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Damage");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: adjData } = await supabase.from("stock_ledger").select("*, products(name), warehouses(name)").eq('transaction_type', 'adjustment').order('created_at', { ascending: false });
    const { data: prodData } = await supabase.from("products").select("*");
    const { data: wareData } = await supabase.from("warehouses").select("*");

    setAdjustments(adjData || []);
    setProducts(prodData || []);
    setWarehouses(wareData || []);
  };

  const handleAdjustment = async () => {
    if (!selectedProduct || !quantity) return;
    setLoading(true);

    const qtyNum = parseInt(quantity);
    
    // 1. Log the Adjustment
    await supabase.from("stock_ledger").insert({
      product_id: selectedProduct,
      warehouse_id: selectedWarehouse || null,
      transaction_type: "adjustment",
      quantity_change: qtyNum, // Negative for damage, Positive for found items
      reference_number: reason,
    });

    // 2. Update the Actual Product Stock
    // First get current stock
    const { data: prod } = await supabase.from("products").select("current_stock").eq("id", selectedProduct).single();
    if (prod) {
      await supabase.from("products").update({
        current_stock: prod.current_stock + qtyNum
      }).eq("id", selectedProduct);
    }

    toast.success("Stock Adjusted Successfully");
    setOpen(false);
    setLoading(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Stock Adjustments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4"/> New Adjustment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label>Product</label>
                <Select onValueChange={setSelectedProduct}>
                  <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label>Warehouse (Optional)</label>
                <Select onValueChange={setSelectedWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label>Quantity Change (e.g. -5 for damage, 10 for found)</label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="-5" />
              </div>

              <div className="space-y-2">
                <label>Reason</label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Damage, Theft, etc." />
              </div>

              <Button onClick={handleAdjustment} className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Confirm Adjustment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Adjustment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.map((adj) => (
              <TableRow key={adj.id}>
                <TableCell>{new Date(adj.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{adj.products?.name}</TableCell>
                <TableCell>{adj.reference_number}</TableCell>
                <TableCell className={`text-right font-bold ${adj.quantity_change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}