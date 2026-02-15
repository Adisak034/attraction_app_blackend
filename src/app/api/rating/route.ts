import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const query = `
        SELECT 
            r.rating_id, 
            r.rating, 
            r.created_at,
            u.user_name,
            a.attraction_name
        FROM rating r
        JOIN user u ON r.user_id = u.user_id
        JOIN attraction a ON r.attraction_id = a.attraction_id
        ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Corrected according to the schema (no 'comment' field)
    const { attraction_id, user_id, rating } = await request.json();
    
    if (attraction_id === undefined || user_id === undefined || rating === undefined) {
        return NextResponse.json({ message: 'Missing required fields: attraction_id, user_id, and rating are required.' }, { status: 400 });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json({ message: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO rating (attraction_id, user_id, rating) VALUES (?, ?, ?)',
      [attraction_id, user_id, rating]
    );
    
    const insertId = (result as any).insertId;

    return NextResponse.json({ 
        rating_id: insertId, 
        attraction_id, 
        user_id, 
        rating 
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    // This could fail if user_id or attraction_id does not exist
    return NextResponse.json({ message: 'Internal Server Error or Invalid ID' }, { status: 500 });
  }
}
