import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/shopping-list')({
  component: ShoppingListPage,
})

function ShoppingListPage() {
  const shoppingListItems = useQuery(api.shoppingList.getShoppingListItems, {})
  const categories = useQuery(api.categories.getCategories, {})
  const deleteItem = useMutation(api.shoppingList.deleteShoppingListItem)
  const markAsBought = useMutation(api.shoppingList.markAsBought)
  const markAsAddedToInventory = useMutation(api.shoppingList.markAsAddedToInventory)
  const updateItem = useMutation(api.shoppingList.updateShoppingListItem)

  const handleDelete = (itemId: Id<'shoppingListItems'>) => {
    if (confirm('Are you sure you want to delete this item?')) {
      void deleteItem({ itemId })
    }
  }

  const handleBoughtChange = (itemId: Id<'shoppingListItems'>, checked: boolean) => {
    if (checked) {
      void markAsBought({ itemId })
    } else {
      void updateItem({ itemId, isBought: false })
    }
  }

  const handleAddedToInventoryChange = (itemId: Id<'shoppingListItems'>, checked: boolean) => {
    if (checked) {
      void markAsAddedToInventory({ itemId })
    } else {
      void updateItem({ itemId, isAddedToInventory: false })
    }
  }

  if (shoppingListItems === undefined || categories === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading...</p>
      </div>
    )
  }

  const activeItems = shoppingListItems.filter((item) => !item.isBought || !item.isAddedToInventory)
  const boughtItems = shoppingListItems.filter((item) => item.isBought && !item.isAddedToInventory)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shopping List</h1>
          <p className="text-muted-foreground">
            Manage your shopping list
          </p>
        </div>
        <AddItemDialog categories={categories} />
      </div>

      {activeItems.length === 0 && boughtItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Your shopping list is empty</p>
            <AddItemDialog categories={categories} />
          </CardContent>
        </Card>
      ) : (
        <>
          {activeItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active Items</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeItems.map((item) => {
                  const category = categories.find((c) => c._id === item.categoryId)
                  return (
                    <Card key={item._id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            {category && (
                              <CardDescription>
                                <Badge variant="secondary" className="mt-1">
                                  {category.icon && <span className="mr-1">{category.icon}</span>}
                                  {category.name}
                                </Badge>
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {item.quantity && (
                            <div>
                              <span className="text-sm font-medium">Quantity: </span>
                              <span className="text-sm">
                                {item.quantity} {item.unit || 'piece'}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`bought-${item._id}`}
                                checked={item.isBought}
                                onCheckedChange={(checked) =>
                                  handleBoughtChange(item._id, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`bought-${item._id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Bought
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`added-${item._id}`}
                                checked={item.isAddedToInventory}
                                onCheckedChange={(checked) =>
                                  handleAddedToInventoryChange(item._id, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`added-${item._id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Added to Inventory
                              </Label>
                            </div>
                          </div>
                          {item.isBought && item.isAddedToInventory && (
                            <Badge variant="default" className="w-full justify-center">
                              Will be processed automatically
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {boughtItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Bought (Pending Inventory)</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {boughtItems.map((item) => {
                  const category = categories.find((c) => c._id === item.categoryId)
                  return (
                    <Card key={item._id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            {category && (
                              <CardDescription>
                                <Badge variant="secondary" className="mt-1">
                                  {category.icon && <span className="mr-1">{category.icon}</span>}
                                  {category.name}
                                </Badge>
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {item.quantity && (
                            <div>
                              <span className="text-sm font-medium">Quantity: </span>
                              <span className="text-sm">
                                {item.quantity} {item.unit || 'piece'}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`bought-bought-${item._id}`}
                                checked={item.isBought}
                                disabled
                              />
                              <Label
                                htmlFor={`bought-bought-${item._id}`}
                                className="text-sm font-medium leading-none"
                              >
                                Bought
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`bought-added-${item._id}`}
                                checked={item.isAddedToInventory}
                                onCheckedChange={(checked) =>
                                  handleAddedToInventoryChange(item._id, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`bought-added-${item._id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                Added to Inventory
                              </Label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AddItemDialog({ categories }: { categories: Array<{ _id: Id<'categories'>; name: string; icon?: string }> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [categoryId, setCategoryId] = useState<Id<'categories'> | undefined>(undefined)
  const createItem = useMutation(api.shoppingList.createShoppingListItem)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void createItem({
      name,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit || undefined,
      categoryId,
    }).then(() => {
      setOpen(false)
      setName('')
      setQuantity('')
      setUnit('')
      setCategoryId(undefined)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Shopping List Item</DialogTitle>
          <DialogDescription>
            Add a new item to your shopping list
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Item name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="piece, kg, etc."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value ? (e.target.value as Id<'categories'>) : undefined)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
