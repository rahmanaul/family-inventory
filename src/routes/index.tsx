import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { AlertTriangle, Clock, Loader2, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const household = useQuery(api.households.getCurrentHousehold, {});
  const lowStockItems = useQuery(api.inventory.getLowStockItems, {});
  const expiringItems = useQuery(api.inventory.getExpiringSoonItems, {});
  const addToShoppingList = useMutation(api.shoppingList.addLowStockItemToShoppingList);
  const [addingItemId, setAddingItemId] = useState<Id<"inventoryItems"> | null>(null);

  // Seed default categories if household exists but no categories
  const categories = useQuery(api.categories.getCategories, {});
  const seedCategories = useMutation(api.categories.seedDefaultCategories);
  const [hasSeeded, setHasSeeded] = useState(false);

  // Auto-seed categories when household is created (only once)
  useEffect(() => {
    if (household && categories && categories.length === 0 && !hasSeeded) {
      setHasSeeded(true);
      void seedCategories({});
    }
  }, [household, categories, hasSeeded, seedCategories]);

  if (household === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h1 className="text-2xl font-bold">Welcome to Family Inventory</h1>
        <p className="text-muted-foreground">
          Create a household to get started
        </p>
        <CreateHouseholdForm />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {household.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Items
            </CardTitle>
            <CardDescription>
              Items that need to be restocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems === undefined ? (
              <p>Loading...</p>
            ) : lowStockItems.length === 0 ? (
              <p className="text-muted-foreground">No low stock items</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit}
                        {item.minStock && ` (min: ${item.minStock})`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          setAddingItemId(item._id);
                          await addToShoppingList({ inventoryItemId: item._id });
                          toast.success("Added to shopping list");
                        } catch (error) {
                          console.error("Failed to add low stock item to shopping list", error);
                          toast.error("Unable to add to shopping list");
                        } finally {
                          setAddingItemId(null);
                        }
                      }}
                      disabled={addingItemId === item._id}
                    >
                      {addingItemId === item._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add to List
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Expiring Soon
            </CardTitle>
            <CardDescription>
              Items expiring within 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiringItems === undefined ? (
              <p>Loading...</p>
            ) : expiringItems.length === 0 ? (
              <p className="text-muted-foreground">No items expiring soon</p>
            ) : (
              <div className="space-y-2">
                {expiringItems.map((item) => {
                  const daysUntilExpiry = item.expirationDate
                    ? differenceInDays(
                        new Date(item.expirationDate),
                        new Date()
                      )
                    : null;
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3;
                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                  return (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.expirationDate && (
                            <Badge
                              variant={
                                isExpired
                                  ? "destructive"
                                  : isExpiringSoon
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {isExpired
                                ? "Expired"
                                : `${daysUntilExpiry} day${
                                    daysUntilExpiry !== 1 ? "s" : ""
                                  } left`}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.expirationDate!), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link to="/inventory">
          <Button>View All Inventory</Button>
        </Link>
        <Link to="/shopping-list">
          <Button variant="outline">View Shopping List</Button>
        </Link>
      </div>
    </div>
  );
}

function CreateHouseholdForm() {
  const [name, setName] = useState("");
  const createHousehold = useMutation(api.households.createHousehold);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void createHousehold({ name });
      }}
      className="flex flex-col gap-4 w-full max-w-md"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Household name"
        className="px-4 py-2 border rounded-md"
        required
      />
      <Button type="submit">Create Household</Button>
    </form>
  );
}
