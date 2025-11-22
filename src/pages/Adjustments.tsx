import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Trash2 } from "lucide-react";
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
    if (!selectedProduct || !quantity) {
        toast.error("Please fill required fields");
        return;
    }
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
        current_stock: Math.max(0, prod.current_stock + qtyNum) // Prevent negative
      }).eq("id", selectedProduct);
    }

    toast.success("Stock Adjusted Successfully");
    setOpen(false);
    setLoading(false);
    setQuantity("");
    setReason("Damage");
    fetchData();
  };

  const deleteAdjustment = async (id: string) => {
    if (!confirm("Delete this adjustment log? (Note: This won't revert the stock count, only the log)")) return;
    const { error } = await supabase.from("stock_ledger").delete().eq("id", id);
    if (error) toast.error("Failed to delete log");
    else {
        toast.success("Log deleted");
        fetchData();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Stock Adjustments</h1>
            <p className="text-muted-foreground">Correct discrepancies and log damages.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-purple-600 shadow-lg"><Plus className="mr-2 h-4 w-4"/> New Adjustment</Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/50">
            <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product *</label>
                <Select onValueChange={setSelectedProduct}>
                  <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse (Optional)</label>
                <Select onValueChange={setSelectedWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity Change *</label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. -5 (Lost) or 10 (Found)" />
                <p className="text-xs text-muted-foreground">Use negative numbers for lost/damaged items.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Damage, Theft, Count Correction" />
              </div>

              <Button onClick={handleAdjustment} className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Confirm Adjustment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden glass-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Adjustment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No adjustments logged.</TableCell></TableRow>
            ) : adjustments.map((adj) => (
              <TableRow key={adj.id}>
                <TableCell>{new Date(adj.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{adj.products?.name || "Unknown Product"}</TableCell>
                <TableCell>{adj.reference_number}</TableCell>
                <TableCell className={`text-right font-bold ${adj.quantity_change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteAdjustment(adj.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground/50 hover:text-destructive" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}