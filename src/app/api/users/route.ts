import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Note: In a real application, passwords should be hashed before storing.
// For simplicity, we are storing them as plain text here.

export async function GET() {
  try {
    // Corrected table and column names
    const [rows] = await pool.query('SELECT user_id, user_name, birth_date, role FROM user');
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Corrected table and column names
    const { user_name, birth_date, password, role } = await request.json();

    if (!user_name || !password) {
        return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO user (user_name, birth_date, password, role) VALUES (?, ?, ?, ?)',
      [user_name, birth_date || null, password, role || 'user'] // Default role to 'user' if not provided
    );
    
    const insertId = (result as any).insertId;

    return NextResponse.json({ 
        user_id: insertId, 
        user_name, 
        birth_date, 
        role: role || 'user' 
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
