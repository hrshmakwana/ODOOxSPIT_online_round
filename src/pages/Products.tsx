import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
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
import ProductDialog from "@/components/ProductDialog";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit_of_measure: string;
  reorder_level: number;
  current_stock: number;
  categories?: { name: string } | null;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  /** 🚀 Fetch all products with stock normalized */
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const cleanData = (data || []).map((p) => ({
        ...p,
        current_stock: Number(p.current_stock ?? 0), // Always convert to number
      }));

      setProducts(cleanData);
      setFilteredProducts(cleanData);
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  /** 🔥 Safe Stock Update */
  const updateStock = async (id: string, change: number) => {
    try {
      // Get latest stock from DB
      const { data: product, error: fetchErr } = await supabase
        .from("products")
        .select("current_stock")
        .eq("id", id)
        .single();

      if (fetchErr) throw fetchErr;

      const currentStock = Number(product?.current_stock ?? 0);

      const newStock = currentStock + change;

      if (newStock < 0) {
        toast.error("Insufficient stock");
        return;
      }

      const { error: updateErr } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", id);

      if (updateErr) throw updateErr;

      toast.success("Stock updated successfully");
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update stock");
    }
  };

  /** 🗑 Delete product */
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  /** 🚦 Stock Status Badge */
  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (stock <= 10) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-600 border border-yellow-600">
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/20 text-green-700 border border-green-700">
        In Stock
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Products
          </h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>

        <Button
          onClick={() => {
            setSelectedProduct(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-primary hover:opacity-90 shadow-glass"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Search bar */}
      <div className="glass-card p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none bg-transparent focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-border/50">
                  <TableCell className="font-mono text-primary">{product.sku}</TableCell>

                  <TableCell className="font-medium">{product.name}</TableCell>

                  <TableCell>{product.categories?.name || "-"}</TableCell>

                  <TableCell>{product.unit_of_measure}</TableCell>

                  {/* Stock Controls */}
                  <TableCell className="font-semibold flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateStock(product.id, -1)}
                    >
                      -
                    </Button>

                    {product.current_stock}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => updateStock(product.id, +1)}
                    >
                      +
                    </Button>
                  </TableCell>

                  <TableCell>{getStockBadge(product.current_stock)}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedProduct(product);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
