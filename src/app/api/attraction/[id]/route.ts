import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET a single attraction with its categories
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attractionId } = await params;

    // Get attraction details
    const [attractionRows] = await pool.query('SELECT * FROM attraction WHERE attraction_id = ?', [attractionId]);
    const attractions = attractionRows as any[];
    if (attractions.length === 0) {
      return NextResponse.json({});
    }
    const attraction = attractions[0];

    // Get associated categories
    const [categoryRows] = await pool.query('SELECT category_id FROM attraction_category WHERE attraction_id = ?', [attractionId]);
    const categories = (categoryRows as any[]).map(row => ({ category_id: row.category_id }));

    const responseData = {
        ...attraction,
        categories: categories
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT (update) an attraction and its categories
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    let connection;
    try {
        const { id: attractionId } = await params;
        const body = await request.json();
        const { 
            attraction_name, 
            type_id, 
            district_id, 
            sect_id, 
            lat, 
            lng, 
            sacred_obj, 
            offering,
            category_ids
        } = body;

        if (!attraction_name || !Array.isArray(category_ids)) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.query(
            'UPDATE attraction SET attraction_name = ?, type_id = ?, district_id = ?, sect_id = ?, lat = ?, lng = ?, sacred_obj = ?, offering = ? WHERE attraction_id = ?',
            [attraction_name, type_id, district_id, sect_id, lat, lng, sacred_obj, offering, attractionId]
        );

        await connection.query('DELETE FROM attraction_category WHERE attraction_id = ?', [attractionId]);

        if (category_ids.length > 0) {
            const categoryValues = category_ids.map((catId: number) => [attractionId, catId]);
            await connection.query(
                'INSERT INTO attraction_category (attraction_id, category_id) VALUES ?',
                [categoryValues]
            );
        }

        await connection.commit();
        return NextResponse.json({ message: 'Attraction updated successfully' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

// DELETE an attraction and all its related data
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    let connection;
    try {
        const { id: attractionId } = await params;
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Since ON DELETE CASCADE is not set, we must delete manually from child tables.
        await connection.query('DELETE FROM attraction_category WHERE attraction_id = ?', [attractionId]);
        await connection.query('DELETE FROM attraction_image WHERE attraction_id = ?', [attractionId]);
        await connection.query('DELETE FROM rating WHERE attraction_id = ?', [attractionId]);
        
        // Finally, delete the attraction itself
        const [result] = await connection.query('DELETE FROM attraction WHERE attraction_id = ?', [attractionId]);

        await connection.commit();

        if ((result as any).affectedRows === 0) {
            return NextResponse.json({ message: 'Attraction not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Attraction deleted successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}