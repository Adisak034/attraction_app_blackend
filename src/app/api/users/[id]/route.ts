import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET a single user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const [rows] = await pool.query('SELECT user_id, user_name, password, birth_date, role FROM user WHERE user_id = ?', [userId]);
    const users = rows as any[];
    if (users.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(users[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT (update) a user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { user_name, password, birth_date, role } = await request.json();

    // Basic validation
    if (!user_name) {
      return NextResponse.json({ message: 'Username is required' }, { status: 400 });
    }

    // NOTE: Storing plain text passwords is a security risk. 
    // In a real application, you should hash the password before saving.
    // For now, we'll update it as is if provided.
    
    let query = 'UPDATE user SET user_name = ?, birth_date = ?, role = ?';
    const queryParams: (string | number | null)[] = [user_name, birth_date || null, role || null];

    if (password) {
      query += ', password = ?';
      queryParams.push(password);
    }

    query += ' WHERE user_id = ?';
    queryParams.push(userId);

    await pool.query(query, queryParams);

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id: userId } = await params;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Before deleting the user, we need to handle related records in other tables.
    // For example, delete ratings made by this user.
    await connection.query('DELETE FROM rating WHERE user_id = ?', [userId]);
    
    // Now, delete the user
    const [result] = await connection.query('DELETE FROM user WHERE user_id = ?', [userId]);

    await connection.commit();

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
