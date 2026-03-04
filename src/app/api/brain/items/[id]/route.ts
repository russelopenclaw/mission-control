import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const BRAIN_DIR = path.join(process.cwd(), '../../workspace/brain');
const ITEMS_FILE = path.join(BRAIN_DIR, 'items.json');

/**
 * Read items from file
 */
function readItems(): any {
  const data = fs.readFileSync(ITEMS_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * Write items to file
 */
function writeItems(data: any): void {
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(data, null, 2));
}

/**
 * DELETE /api/brain/items/[id] - Delete a specific item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    const data = readItems();
    const originalLength = data.items.length;
    
    // Filter out the item with matching ID
    data.items = data.items.filter((item: any) => item.id !== id);
    
    if (data.items.length === originalLength) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Save updated list
    writeItems(data);
    
    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting brain item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete brain item' },
      { status: 500 }
    );
  }
}
