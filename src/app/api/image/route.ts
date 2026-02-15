import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const attractionId = searchParams.get('attraction_id');

    try {
        let query = 'SELECT image_id, Image_name, attraction_id FROM attraction_image';
        const params = [];
        if (attractionId) {
            query += ' WHERE attraction_id = ?';
            params.push(attractionId);
        }
        const [rows] = await pool.query(query, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
  try {
    const { Image_name, attraction_id } = await request.json();

    if (!Image_name || !attraction_id) {
        return NextResponse.json({ message: 'Image_name and attraction_id are required' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO attraction_image (Image_name, attraction_id) VALUES (?, ?)',
      [Image_name, attraction_id]
    );
    
    const insertId = (result as any).insertId;

    return NextResponse.json({ 
        image_id: insertId, 
        Image_name, 
        attraction_id
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
