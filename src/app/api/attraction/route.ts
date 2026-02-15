import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// GET all attractions with their categories
export async function GET() {
  try {
    const query = `
      SELECT 
        a.attraction_id, 
        a.attraction_name, 
        a.type_id, 
        a.district_id, 
        a.sect_id, 
        a.lat, 
        a.lng, 
        a.sacred_obj, 
        a.offering,
        GROUP_CONCAT(c.category_name SEPARATOR ', ') as categories
      FROM attraction a
      LEFT JOIN attraction_category ac ON a.attraction_id = ac.attraction_id
      LEFT JOIN category c ON ac.category_id = c.category_id
      GROUP BY a.attraction_id
    `;
    const [rows] = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST a new attraction and link it to categories
export async function POST(request: Request) {
  let connection;
  try {
    const { 
        attraction_name, 
        type_id, 
        district_id, 
        sect_id, 
        lat, 
        lng, 
        sacred_obj, 
        offering,
        category_ids // Expect an array of category IDs
    } = await request.json();

    // Validate input
    if (!attraction_name || !Array.isArray(category_ids)) {
        return NextResponse.json({ message: 'Missing required fields: attraction_name and category_ids are required.' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert into attraction table
    const [attractionResult] = await connection.query(
      'INSERT INTO attraction (attraction_name, type_id, district_id, sect_id, lat, lng, sacred_obj, offering) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [attraction_name, type_id, district_id, sect_id, lat, lng, sacred_obj, offering]
    );
    
    const newAttractionId = (attractionResult as any).insertId;

    // 2. Insert into attraction_category table
    if (category_ids.length > 0) {
        const categoryValues = category_ids.map(catId => [newAttractionId, catId]);
        await connection.query(
            'INSERT INTO attraction_category (attraction_id, category_id) VALUES ?',
            [categoryValues]
        );
    }

    await connection.commit();

    return NextResponse.json({ 
        message: 'Attraction created successfully',
        attraction_id: newAttractionId 
    }, { status: 201 });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
