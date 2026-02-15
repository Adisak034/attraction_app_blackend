import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET all categories
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT category_id, category_name FROM category ORDER BY category_name');
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
