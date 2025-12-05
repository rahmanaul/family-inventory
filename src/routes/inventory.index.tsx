import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { format } from 'date-fns'
import { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/inventory/')({
  component: InventoryPage,
})

function InventoryPage() {
  const categories = useQuery(api.categories.getCategories, {})
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'categories'> | undefined>(undefined)
  const inventoryItems = useQuery(
    api.inventory.getInventoryItems,
    selectedCategoryId ? { categoryId: selectedCategoryId } : {}
  )
  const deleteItem = useMutation(api.inventory.deleteInventoryItem)

  const handleDelete = (itemId: Id<'inventoryItems'>) => {
    if (confirm('Are you sure you want to delete this item?')) {
      void deleteItem({ itemId })
    }
  }

  if (inventoryItems === undefined || categories === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your household inventory
          </p>
        </div>
        <AddItemDialog categories={categories} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategoryId === undefined ? 'default' : 'outline'}
          onClick={() => setSelectedCategoryId(undefined)}
          size="sm"
        >
          All Items
        </Button>
        {categories.map((category) => (
          <Button
            key={category._id}
            variant={selectedCategoryId === category._id ? 'default' : 'outline'}
            onClick={() => setSelectedCategoryId(category._id)}
            size="sm"
          >
            {category.icon && <span className="mr-1">{category.icon}</span>}
            {category.name}
          </Button>
        ))}
      </div>

      {inventoryItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items found</p>
            <AddItemDialog categories={categories} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inventoryItems.map((item) => {
            const category = categories.find((c) => c._id === item.categoryId)
            return (
              <Card key={item._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription>
                        {category && (
                          <Badge variant="secondary" className="mt-1">
                            {category.icon && <span className="mr-1">{category.icon}</span>}
                            {category.name}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <EditItemDialog item={item} categories={categories} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Quantity: </span>
                      <span className="text-sm">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    {item.minStock !== undefined && (
                      <div>
                        <span className="text-sm font-medium">Min Stock: </span>
                        <span className="text-sm">{item.minStock} {item.unit}</span>
                        {item.quantity < item.minStock && (
                          <Badge variant="destructive" className="ml-2">
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    )}
                    {item.expirationDate && (
                      <div>
                        <span className="text-sm font-medium">Expires: </span>
                        <span className="text-sm">
                          {format(new Date(item.expirationDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {item.notes && (
                      <div>
                        <span className="text-sm font-medium">Notes: </span>
                        <span className="text-sm text-muted-foreground">{item.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/inventory/$itemId" params={{ itemId: item._id }}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddItemDialog({ categories }: { categories: Array<{ _id: Id<'categories'>; name: string; icon?: string }> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('piece')
  const [categoryId, setCategoryId] = useState<Id<'categories'> | undefined>(undefined)
  const [minStock, setMinStock] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [notes, setNotes] = useState('')
  const createItem = useMutation(api.inventory.createInventoryItem)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void createItem({
      name,
      quantity: parseFloat(quantity) || 0,
      unit,
      categoryId,
      minStock: minStock ? parseFloat(minStock) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
      notes: notes || undefined,
    }).then(() => {
      setOpen(false)
      setName('')
      setQuantity('1')
      setUnit('piece')
      setCategoryId(undefined)
      setMinStock('')
      setExpirationDate('')
      setNotes('')
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
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new item to your inventory
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
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                  placeholder="piece, kg, liter, etc."
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
            <div>
              <Label htmlFor="minStock">Minimum Stock</Label>
              <Input
                id="minStock"
                type="number"
                step="0.01"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="expirationDate">Expiration Date</Label>
              <Input
                id="expirationDate"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
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

function EditItemDialog({
  item,
  categories,
}: {
  item: {
    _id: Id<'inventoryItems'>
    name: string
    quantity: number
    unit: string
    categoryId?: Id<'categories'>
    minStock?: number
    expirationDate?: number
    notes?: string
  }
  categories: Array<{ _id: Id<'categories'>; name: string; icon?: string }>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity.toString())
  const [unit, setUnit] = useState(item.unit)
  const [categoryId, setCategoryId] = useState<Id<'categories'> | undefined>(item.categoryId)
  const [minStock, setMinStock] = useState(item.minStock?.toString() || '')
  const [expirationDate, setExpirationDate] = useState(
    item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : ''
  )
  const [notes, setNotes] = useState(item.notes || '')
  const updateItem = useMutation(api.inventory.updateInventoryItem)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void updateItem({
      itemId: item._id,
      name,
      quantity: parseFloat(quantity) || 0,
      unit,
      categoryId,
      minStock: minStock ? parseFloat(minStock) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
      notes: notes || undefined,
    }).then(() => {
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update the item details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-quantity">Quantity *</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Unit *</Label>
                <Input
                  id="edit-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
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
            <div>
              <Label htmlFor="edit-minStock">Minimum Stock</Label>
              <Input
                id="edit-minStock"
                type="number"
                step="0.01"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-expirationDate">Expiration Date</Label>
              <Input
                id="edit-expirationDate"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
