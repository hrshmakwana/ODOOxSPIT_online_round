import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner"; // Added import for Toast

type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
};

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [open, setOpen] = useState(false); // Added state to close dialog on success

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Fetch warehouse list
  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setWarehouses(data || []);
  };

  // Toggle Status Logic
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("warehouses")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Warehouse status updated");
      fetchWarehouses();
    }
  };

  // Add warehouse
  const addWarehouse = async () => {
    if (!name || !code) {
      toast.error("Name and Code are required!");
      return;
    }

    const { error } = await supabase.from("warehouses").insert({
      name,
      code,
      address,
      is_active: true,
    });

    if (error) {
        toast.error(error.message);
    } else {
      toast.success("Warehouse created successfully");
      setName("");
      setCode("");
      setAddress("");
      setOpen(false); // Close dialog
      fetchWarehouses();
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Warehouse Management
        </h1>
        
        {/* Add Warehouse Button */}
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-purple-600 shadow-lg hover:shadow-xl transition-all">
                Add Warehouse
            </Button>
            </DialogTrigger>

            <DialogContent className="glass-card border-border/50">
            <DialogHeader>
                <DialogTitle>Add New Warehouse</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Warehouse Name</label>
                    <Input
                    placeholder="e.g. North Distribution Center"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Unique Code</label>
                    <Input
                    placeholder="e.g. WH-001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                    placeholder="e.g. 123 Storage Lane"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    />
                </div>
                <Button onClick={addWarehouse} className="w-full">Save Warehouse</Button>
            </div>
            </DialogContent>
        </Dialog>
      </div>

      {/* Warehouse List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((w) => (
          <Card key={w.id} className="glass-card border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{w.name}</h2>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block font-mono">
                        {w.code}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Switch 
                        checked={w.is_active} 
                        onCheckedChange={() => toggleStatus(w.id, w.is_active)}
                    />
                    <span className="text-[10px] text-muted-foreground">
                        {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="font-semibold">Address:</span> 
                    {w.address || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    Registered: {new Date(w.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}