import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Adjustments = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Stock Adjustments</h1>
          <p className="text-muted-foreground">Fix stock discrepancies</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-glass">
          <Plus className="mr-2 h-4 w-4" />New Adjustment
        </Button>
      </div>
    </div>
  );
};

export default Adjustments;
