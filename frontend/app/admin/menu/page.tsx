'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/lib/admin-auth';
import {
  useMenuCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from '@/lib/admin-queries';
import { Loading } from '@/components/loading';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdminMenuCategory, AdminMenuItem, AdminMenuItemVariant } from '@/lib/admin-api';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
});

const variantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price_cents: z.number().min(0, 'Price must be positive'),
  item_id: z.string().min(1, 'Item is required'),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type ItemFormData = z.infer<typeof itemSchema>;
type VariantFormData = z.infer<typeof variantSchema>;

export default function MenuPage() {
  const { isLoading: isAuthLoading } = useRequireAuth(true);
  const { data: categoriesData, isLoading: isCategoriesLoading } = useMenuCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const variantForm = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
  });

  if (isAuthLoading || isCategoriesLoading) {
    return <Loading fullScreen />;
  }

  const categories = categoriesData?.categories || [];

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateCategory = async (data: CategoryFormData) => {
    await createCategory.mutateAsync(data);
    setShowCategoryForm(false);
    categoryForm.reset();
  };

  const handleUpdateCategory = async (id: string, data: CategoryFormData) => {
    await updateCategory.mutateAsync({ id, data });
    setEditingCategory(null);
    categoryForm.reset();
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? All items in it will be deleted.')) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const handleCreateItem = async (data: ItemFormData) => {
    await createItem.mutateAsync(data);
    setShowItemForm(false);
    itemForm.reset();
  };

  const handleUpdateItem = async (id: string, data: ItemFormData) => {
    await updateItem.mutateAsync({ id, data });
    setEditingItem(null);
    itemForm.reset();
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem.mutateAsync(id);
    }
  };

  const handleCreateVariant = async (data: VariantFormData) => {
    await createVariant.mutateAsync(data);
    setShowVariantForm(false);
    variantForm.reset();
  };

  const handleUpdateVariant = async (id: string, data: VariantFormData) => {
    await updateVariant.mutateAsync({ id, data });
    setEditingVariant(null);
    variantForm.reset();
  };

  const handleDeleteVariant = async (id: string) => {
    if (confirm('Are you sure you want to delete this variant?')) {
      await deleteVariant.mutateAsync(id);
    }
  };

  const startEditCategory = (category: AdminMenuCategory) => {
    setEditingCategory(category.id);
    categoryForm.setValue('name', category.name);
  };

  const startEditItem = (item: AdminMenuItem) => {
    setEditingItem(item.id);
    itemForm.setValue('name', item.name);
    itemForm.setValue('description', item.description);
    itemForm.setValue('category_id', categories.find(c => c.items.some(i => i.id === item.id))?.id || '');
  };

  const startEditVariant = (variant: AdminMenuItemVariant, itemId: string) => {
    setEditingVariant(variant.id);
    variantForm.setValue('name', variant.name);
    variantForm.setValue('price_cents', variant.price_cents);
    variantForm.setValue('item_id', itemId);
  };

  const openItemForm = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    itemForm.setValue('category_id', categoryId);
    setShowItemForm(true);
  };

  const openVariantForm = (itemId: string) => {
    setSelectedItemId(itemId);
    variantForm.setValue('item_id', itemId);
    setShowVariantForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage menu categories, items, and variants
          </p>
        </div>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Category Form */}
      {showCategoryForm && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">New Category</h3>
          <form
            onSubmit={categoryForm.handleSubmit(handleCreateCategory)}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                {...categoryForm.register('name')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {categoryForm.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {categoryForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createCategory.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createCategory.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryForm(false);
                  categoryForm.reset();
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Item Form */}
      {showItemForm && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">New Menu Item</h3>
          <form
            onSubmit={itemForm.handleSubmit(handleCreateItem)}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                {...itemForm.register('name')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                {...itemForm.register('description')}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createItem.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createItem.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowItemForm(false);
                  itemForm.reset();
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Variant Form */}
      {showVariantForm && (
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">New Variant</h3>
          <form
            onSubmit={variantForm.handleSubmit(handleCreateVariant)}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                {...variantForm.register('name')}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Price (cents)
              </label>
              <input
                type="number"
                {...variantForm.register('price_cents', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createVariant.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createVariant.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVariantForm(false);
                  variantForm.reset();
                }}
                className="rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground">No categories yet</p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="rounded-lg border bg-card shadow-sm"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="rounded p-1 hover:bg-muted"
                  >
                    {expandedCategories.includes(category.id) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                  {editingCategory === category.id ? (
                    <form
                      onSubmit={categoryForm.handleSubmit((data) =>
                        handleUpdateCategory(category.id, data)
                      )}
                      className="flex items-center gap-2"
                    >
                      <input
                        {...categoryForm.register('name')}
                        className="rounded border border-input px-2 py-1"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={updateCategory.isPending}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          categoryForm.reset();
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <h3 className="font-semibold text-foreground">
                        {category.name}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        ({category.items_count} items)
                      </span>
                    </>
                  )}
                </div>
                {editingCategory !== category.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditCategory(category)}
                      className="rounded p-2 text-muted-foreground hover:bg-muted"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="rounded p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openItemForm(category.id)}
                      className="ml-2 flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                      Add Item
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              {expandedCategories.includes(category.id) && (
                <div className="border-t bg-muted p-4">
                  {category.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items in this category</p>
                  ) : (
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-card p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleItem(item.id)}
                                className="rounded p-1 hover:bg-muted"
                              >
                                {expandedItems.includes(item.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              {editingItem === item.id ? (
                                <form
                                  onSubmit={itemForm.handleSubmit((data) =>
                                    handleUpdateItem(item.id, data)
                                  )}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    {...itemForm.register('name')}
                                    className="rounded border border-input px-2 py-1"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    disabled={updateItem.isPending}
                                    className="text-sm text-green-600"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingItem(null);
                                      itemForm.reset();
                                    }}
                                    className="text-sm text-muted-foreground"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <div>
                                  <p className="font-medium text-foreground">
                                    {item.name}
                                  </p>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            {editingItem !== item.id && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditItem(item)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="rounded p-1.5 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => openVariantForm(item.id)}
                                  className="ml-2 flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                >
                                  <Plus className="h-3 w-3" />
                                  Variant
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Variants List */}
                          {expandedItems.includes(item.id) && item.variants.length > 0 && (
                            <div className="mt-3 space-y-2 border-t pt-3">
                              {item.variants.map((variant) => (
                                <div
                                  key={variant.id}
                                  className="flex items-center justify-between rounded bg-muted px-3 py-2"
                                >
                                  {editingVariant === variant.id ? (
                                    <form
                                      onSubmit={variantForm.handleSubmit((data) =>
                                        handleUpdateVariant(variant.id, data)
                                      )}
                                      className="flex w-full items-center gap-2"
                                    >
                                      <input
                                        {...variantForm.register('name')}
                                        className="flex-1 rounded border border-input px-2 py-1 text-sm"
                                        autoFocus
                                      />
                                      <input
                                        type="number"
                                        {...variantForm.register('price_cents', { valueAsNumber: true })}
                                        className="w-24 rounded border border-input px-2 py-1 text-sm"
                                      />
                                      <button
                                        type="submit"
                                        disabled={updateVariant.isPending}
                                        className="text-sm text-green-600"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingVariant(null);
                                          variantForm.reset();
                                        }}
                                        className="text-sm text-muted-foreground"
                                      >
                                        Cancel
                                      </button>
                                    </form>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-foreground">
                                          {variant.name}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          ${(variant.price_cents / 100).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => startEditVariant(variant, item.id)}
                                          className="rounded p-1 text-muted-foreground hover:bg-muted"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteVariant(variant.id)}
                                          className="rounded p-1 text-red-600 hover:bg-red-100"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
