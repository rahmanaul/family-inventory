import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Package, Minus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

  const handleDelete = (itemId: Id<'inventoryItems'>) => void deleteItem({ itemId })

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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the item from your inventory. You can add it again
                              later if needed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item._id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Quantity</span>
                      <QuantityControls item={item} />
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

function QuantityControls({
  item,
}: {
  item: {
    _id: Id<'inventoryItems'>
    quantity: number
    unit: string
  }
}) {
  const updateItem = useMutation(api.inventory.updateInventoryItem)
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setQuantityInput(item.quantity.toString())
  }, [item.quantity])

  const defaultStep = (() => {
    const lowerUnit = item.unit.toLowerCase()
    if (lowerUnit.includes('kg') || lowerUnit.includes('g') || lowerUnit.includes('l')) {
      return 0.1
    }
    return 1
  })()

  const commitQuantity = async (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      setQuantityInput(item.quantity.toString())
      return
    }

    const clamped = Math.max(0, Number.parseFloat(nextQuantity.toFixed(2)))
    if (clamped === item.quantity) {
      setQuantityInput(clamped.toString())
      return
    }

    try {
      setIsSaving(true)
      await updateItem({
        itemId: item._id,
        quantity: clamped,
      })
      toast.success('Quantity updated')
    } catch (error) {
      console.error('Failed to update quantity', error)
      toast.error('Failed to update quantity')
      setQuantityInput(item.quantity.toString())
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdjust = (delta: number) => {
    const parsed = Number.parseFloat(quantityInput)
    const current = Number.isFinite(parsed) ? parsed : item.quantity
    const next = Math.max(0, Number.parseFloat((current + delta).toFixed(2)))
    setQuantityInput(next.toString())
    void commitQuantity(next)
  }

  const handleBlur = () => {
    const parsed = Number.parseFloat(quantityInput)
    if (!Number.isFinite(parsed)) {
      setQuantityInput(item.quantity.toString())
      return
    }
    void commitQuantity(parsed)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleAdjust(-defaultStep)}
        disabled={isSaving}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        className="w-24"
        type="number"
        step={defaultStep}
        min={0}
        value={quantityInput}
        onChange={(e) => setQuantityInput(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleBlur()
          }
        }}
        disabled={isSaving}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleAdjust(defaultStep)}
        disabled={isSaving}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">{item.unit}</span>
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createItem = useMutation(api.inventory.createInventoryItem)

  const resetForm = () => {
    setName('')
    setQuantity('1')
    setUnit('piece')
    setCategoryId(undefined)
    setMinStock('')
    setExpirationDate('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      await createItem({
        name,
        quantity: parseFloat(quantity) || 0,
        unit,
        categoryId,
        minStock: minStock ? parseFloat(minStock) : undefined,
        expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
        notes: notes || undefined,
      })
      toast.success('Item added')
      setOpen(false)
      resetForm()
    } catch (error) {
      console.error('Failed to add item', error)
      toast.error('Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Add Item'
              )}
            </Button>
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
