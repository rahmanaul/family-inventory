import { createFileRoute } from '@tanstack/react-router'
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
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Settings as SettingsIcon, Tag, Users, Copy, Check, UserPlus, X, Lock } from 'lucide-react'
import { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const household = useQuery(api.households.getCurrentHousehold, {})
  const categories = useQuery(api.categories.getCategories, {})
  const membersData = useQuery(api.households.getHouseholdMembersWithDetails, {})
  const members = membersData?.members ?? []
  const currentUserIsCreator = membersData?.currentUserIsCreator ?? false
  const inviteCode = useQuery(api.households.getHouseholdInviteCode, {})
  const deleteCategory = useMutation(api.categories.deleteCategory)

  const handleDeleteCategory = (categoryId: Id<'categories'>) => {
    if (confirm('Are you sure you want to delete this category? Items in this category will not be deleted.')) {
      void deleteCategory({ categoryId })
    }
  }

  if (household === undefined || categories === undefined || membersData === undefined || inviteCode === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading...</p>
      </div>
    )
  }

  // If user doesn't have a household, show join dialog
  if (!household) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Join a household to get started
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Join Household
            </CardTitle>
            <CardDescription>
              Enter an invite code to join an existing household
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinHouseholdDialog />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your household settings and categories
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Household Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium">Household Name: </span>
              <span className="text-sm">{household?.name || 'N/A'}</span>
            </div>
            <InviteCodeSection inviteCode={inviteCode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Household Members
          </CardTitle>
          <CardDescription>
            People who have access to this household's inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.email || 'Unknown User'}
                        </span>
                        {member.isCreator && (
                          <Badge variant="secondary">Creator</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {currentUserIsCreator && !member.isCreator && (
                    <RemoveMemberButton memberId={member._id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categories
              </CardTitle>
              <CardDescription>
                Organize your inventory items with categories
              </CardDescription>
            </div>
            <AddCategoryDialog />
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No categories yet</p>
              <AddCategoryDialog />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Card key={category._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {category.icon && <span>{category.icon}</span>}
                          {category.name}
                        </CardTitle>
                        {category.color && (
                          <div
                            className="w-6 h-6 rounded-full mt-2 border"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <EditCategoryDialog category={category} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordDialog />
        </CardContent>
      </Card>
    </div>
  )
}

function AddCategoryDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('#6b7280')
  const createCategory = useMutation(api.categories.createCategory)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void createCategory({
      name,
      icon: icon || undefined,
      color: color || undefined,
    }).then(() => {
      setOpen(false)
      setName('')
      setIcon('')
      setColor('#6b7280')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Create a new category for organizing your inventory
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
                placeholder="Category name"
              />
            </div>
            <div>
              <Label htmlFor="icon">Icon (Emoji)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🍞"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#6b7280"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Category</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditCategoryDialog({
  category,
}: {
  category: {
    _id: Id<'categories'>
    name: string
    icon?: string
    color?: string
  }
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category.name)
  const [icon, setIcon] = useState(category.icon || '')
  const [color, setColor] = useState(category.color || '#6b7280')
  const updateCategory = useMutation(api.categories.updateCategory)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void updateCategory({
      categoryId: category._id,
      name,
      icon: icon || undefined,
      color: color || undefined,
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
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the category details
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
            <div>
              <Label htmlFor="edit-icon">Icon (Emoji)</Label>
              <Input
                id="edit-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🍞"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#6b7280"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
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

function InviteCodeSection({ inviteCode }: { inviteCode: string | null }) {
  const [copied, setCopied] = useState(false)
  const generateInviteCode = useMutation(api.households.generateInviteCode)
  const [code, setCode] = useState<string | null>(inviteCode)
  const [isGenerating, setIsGenerating] = useState(false)

  // Sync code with query result
  useEffect(() => {
    setCode(inviteCode)
  }, [inviteCode])

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const newCode = await generateInviteCode({})
      setCode(newCode)
    } catch (error) {
      console.error('Failed to generate invite code:', error)
      alert('Failed to generate invite code. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Invite Code</Label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 p-2 border rounded-md bg-muted">
          <code className="flex-1 font-mono text-sm">
            {code || 'No invite code generated'}
          </code>
          {code && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant="outline"
        >
          {code ? 'Regenerate' : 'Generate'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this code with family members so they can join your household
      </p>
    </div>
  )
}

function JoinHouseholdDialog() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const joinHousehold = useMutation(api.households.joinHouseholdByCode)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!code.trim()) {
      setError('Please enter an invite code')
      return
    }

    try {
      await joinHousehold({ inviteCode: code.trim().toUpperCase() })
      setOpen(false)
      setCode('')
      // Reload the page to refresh household data
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to join household')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Join Household
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Household</DialogTitle>
          <DialogDescription>
            Enter the invite code provided by the household creator
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="ABCD1234"
                className="font-mono"
                maxLength={8}
                required
              />
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Join</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RemoveMemberButton({ memberId }: { memberId: Id<'householdMembers'> }) {
  const removeMember = useMutation(api.households.removeHouseholdMember)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this member from the household?')) {
      return
    }

    setIsRemoving(true)
    try {
      await removeMember({ memberId })
    } catch (error: any) {
      alert(error.message || 'Failed to remove member')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRemove}
      disabled={isRemoving}
    >
      <X className="h-4 w-4" />
    </Button>
  )
}

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      // Password change needs to be done via HTTP endpoint
      // For now, we'll use the auth API
      const siteUrl = import.meta.env.VITE_CONVEX_URL?.replace('/api', '') || window.location.origin
      const response = await fetch(`${siteUrl}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      alert('Password changed successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Lock className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update your account password
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 rounded-md p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
