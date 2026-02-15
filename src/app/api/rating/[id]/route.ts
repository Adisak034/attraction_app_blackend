import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ratingId } = await params;
    const [result] = await pool.query('DELETE FROM rating WHERE rating_id = ?', [ratingId]);

    if ((result as any).affectedRows === 0) {
        return NextResponse.json({ message: 'Rating not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
