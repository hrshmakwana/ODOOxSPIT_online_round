import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

  // Add warehouse
  const addWarehouse = async () => {
    if (!name || !code) {
      alert("Name and Code are required!");
      return;
    }

    const { error } = await supabase.from("warehouses").insert({
      name,
      code,
      address,
      is_active: true,
    });

    if (!error) {
      setName("");
      setCode("");
      setAddress("");
      fetchWarehouses();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Warehouse Management</h1>

      {/* Add Warehouse Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button>Add Warehouse</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Warehouse</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Warehouse Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Warehouse Code (unique)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Button onClick={addWarehouse}>Save Warehouse</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warehouse List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-xl font-semibold">{w.name}</h2>
              <p className="text-muted-foreground">Code: {w.code}</p>
              <p className="text-muted-foreground">
                Address: {w.address || "N/A"}
              </p>

              <div className="flex items-center gap-2">
                <span>Status:</span>
                <Switch checked={w.is_active} disabled />
              </div>

              <p className="text-sm text-muted-foreground">
                Created At: {new Date(w.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
