import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;
    const [rows] = await pool.query('SELECT image_id, Image_name, attraction_id FROM attraction_image WHERE image_id = ?', [imageId]);
    const images = rows as any[];
    if (images.length === 0) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }
    return NextResponse.json(images[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;
    const { Image_name, attraction_id } = await request.json();
    
    if (!Image_name || !attraction_id) {
      return NextResponse.json({ message: 'Image_name and attraction_id are required' }, { status: 400 });
    }
    
    await pool.query(
      'UPDATE attraction_image SET Image_name = ?, attraction_id = ? WHERE image_id = ?',
      [Image_name, attraction_id, imageId]
    );
    return NextResponse.json({ message: 'Image updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;
    const [result] = await pool.query('DELETE FROM attraction_image WHERE image_id = ?', [imageId]);
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
