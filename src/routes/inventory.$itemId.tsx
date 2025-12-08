import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Id } from '../../convex/_generated/dataModel'
import { useMutation } from 'convex/react'
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
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export const Route = createFileRoute('/inventory/$itemId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { itemId } = Route.useParams()
  const navigate = useNavigate()
  const item = useQuery(api.inventory.getInventoryItem, { itemId: itemId as Id<'inventoryItems'> })
  const categories = useQuery(api.categories.getCategories, {})
  const deleteItem = useMutation(api.inventory.deleteInventoryItem)

  const handleDelete = () => {
    void deleteItem({ itemId: itemId as Id<'inventoryItems'> }).then(() => {
      // Navigate back to inventory list after deletion
      navigate({ to: '/inventory' })
    })
  }

  if (item === undefined || categories === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading...</p>
      </div>
    )
  }

  if (item === null) {
    return (
      <div className="space-y-6">
        <Link to="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Item not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const category = categories.find((c) => c._id === item.categoryId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{item.name}</CardTitle>
              <CardDescription className="mt-2">
                {category && (
                  <Badge variant="secondary">
                    {category.icon && <span className="mr-1">{category.icon}</span>}
                    {category.name}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
                      This will remove the item from your inventory permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Quantity</span>
              <p className="text-lg">
                {item.quantity} {item.unit}
              </p>
            </div>
            {item.minStock !== undefined && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Minimum Stock</span>
                <div className="flex items-center gap-2">
                  <p className="text-lg">
                    {item.minStock} {item.unit}
                  </p>
                  {item.quantity < item.minStock && (
                    <Badge variant="destructive">Low Stock</Badge>
                  )}
                </div>
              </div>
            )}
            {item.expirationDate && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Expiration Date</span>
                <p className="text-lg">
                  {format(new Date(item.expirationDate), 'dd/MM/yyyy')}
                </p>
              </div>
            )}
            {item.notes && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Notes</span>
                <p className="text-lg text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateItem = useMutation(api.inventory.updateInventoryItem)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      await updateItem({
        itemId: item._id,
        name,
        quantity: parseFloat(quantity) || 0,
        unit,
        categoryId,
        minStock: minStock ? parseFloat(minStock) : undefined,
        expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
        notes: notes || undefined,
      })
      toast.success('Item updated')
      setOpen(false)
    } catch (error) {
      console.error('Failed to update inventory item', error)
      toast.error('Failed to update item')
    } finally {
      setIsSubmitting(false)
    }
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
          <DialogDescription>Update the item details</DialogDescription>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
