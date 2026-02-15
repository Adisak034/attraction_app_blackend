# Project Guidelines

This is a Next.js admin panel backend for managing temple attractions with user and image management, built with TypeScript and MySQL.

## Architecture

- **Framework**: Next.js App Router (v16.1.6) with TypeScript in `/src` directory.
- **Language**: TypeScript with strict mode.
- **Styling**: Tailwind CSS with forced white theme.
- **Database**: MySQL via `mysql2/promise` connection pool (`src/lib/db.ts` exports `pool`).
- **API Routes**: Located in `src/app/api/`. Each resource has its own directory with `route.ts` for collection endpoints and `[id]/route.ts` for item operations.
- **Admin UI**: Located in `src/app/admin/`. All pages are client components (`'use client'`) that fetch from internal API routes.
- **File Uploads**: Images uploaded to `public/uploads/` with server-side file handling.

## Database Schema

Single source of truth: `appdb.sql` (provided in project root). Key tables:
- **attraction**: `attraction_id`, `attraction_name`, `type_id`, `district_id`, `sect_id`, `lat`, `lng`, `sacred_obj`, `offering`
- **attraction_category**: Links attractions to categories (many-to-many)
- **attraction_image**: `image_id`, `Image_name` (URL), `attraction_id`
- **user**: `user_id`, `user_name`, `password`, `birth_date`, `role`, `onboarding_data`
- **rating**: `rating_id`, `user_id`, `attraction_id`, `rating`, `created_at`
- **category**, **district**, **type**, **sect**: Lookup tables

## Build and Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   - Ensure MySQL server running (port 3306)
   - Create database: `CREATE DATABASE appdb;`
   - Import schema: `mysql -u root -p appdb < appdb.sql`
   - Update credentials in `src/lib/db.ts`

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Access at `http://localhost:3000`. Admin pages under `/admin/*`.

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

## Project Conventions

### API Routes Pattern
All dynamic routes use async params pattern (Next.js App Router requirement):
```typescript
// ✅ Correct
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Must await params
  // query logic
}

// ❌ Wrong - will error with "params is a Promise"
const id = params.id;
```

### Database Operations
- Use `pool` from `@/lib/db` for all queries (NOT `db`).
- For multi-table operations (e.g., creating attraction + categories), use transactions within API route. See `src/app/api/attraction/[id]/route.ts` for transaction example.
- For deletions affecting related records, cascade delete in transactions (e.g., deleting user also deletes their ratings).

### API Naming
- Collection endpoints are plural: `/api/attractions`, `/api/users`, `/api/images`
- Item endpoints use dynamic route: `/api/attractions/[id]/`, `/api/users/[id]/`
- Special endpoints like uploads: `/api/image/upload`

### Admin UI Pages
- All pages are client components with `'use client'` directive.
- Fetch data on component mount with loading/error states.
- Forms use controlled inputs with `useState`.
- Navigation via `useRouter` from `next/navigation`.
- Standardized patterns:
  - **Add Form + Table**: `src/app/admin/attractions/page.tsx` (template for others)
  - **Edit Page**: `/admin/attractions/edit/[id]/page.tsx` (edit form with pre-populated data)
  - **Delete**: Confirmation dialog, then fetch to refresh list

### Image Handling
- Images can be uploaded as files (saved to `public/uploads/`) or URLs.
- Upload endpoint: `POST /api/image/upload` (multipart form-data)
  - Validates: image file only, max 5MB
  - Generates unique filename: `{timestamp}-{random}.{ext}`
  - Returns: `{ image_url: "/uploads/filename" }`
- Database stores file URL or external URL in `Image_name` column
- Edit pages support both file upload and URL input with live preview

### Form Field Notes
- Ensure all form inputs have `name` attribute matching state key
- Use `onChange={handleInputChange}` for text inputs, `onChange` for file inputs
- Required fields in forms should be validated before submit
- Textarea example: `<textarea name="field" value={value} onChange={handleInputChange} />`

### Security Notes
- **Passwords**: Currently stored plaintext (security risk). Should use bcrypt in production.
- **Authentication**: No auth system implemented. Add middleware for protected routes in production.
- **File Uploads**: Validate type/size server-side (already done). Add CSRF tokens if needed.

## Recently Implemented Features

- ✅ Full CRUD for attractions (with category associations and transactions)
- ✅ Full CRUD for users (with edit/delete pages)
- ✅ Image management with file upload, edit, delete
- ✅ Proper async params pattern for all dynamic routes
- ✅ Edit pages for attractions and users at `/admin/[resource]/edit/[id]`
- ✅ File upload API with validation and unique naming
- ✅ Removed invalid columns (email, user_level) to match actual schema
- ✅ Actions column styling in tables with vertical button stacking
- ✅ Sacred Objects and Offerings columns in attractions table
- ✅ ID column in tables

## Integration Points

- **Next.js App Router**: Dynamic routes use `Promise<params>` pattern
- **Tailwind CSS**: All components use utility classes (forced light theme)
- **MySQL Connection Pool**: Reused across requests via singleton export
- **FormData**: For file uploads (use `multipart/form-data` MIME type)

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | MySQL connection pool (export: `pool`) |
| `src/app/api/attraction/[id]/route.ts` | Transaction example for multi-table updates |
| `src/app/api/image/upload/route.ts` | File upload handler |
| `src/app/admin/attractions/page.tsx` | Template for CRUD + table UI |
| `src/app/admin/attractions/edit/[id]/page.tsx` | Template for edit pages |
| `appdb.sql` | Database schema (source of truth) |

## API Reference

### Attractions
- **GET** `/api/attraction` - List all attractions with joined data
- **POST** `/api/attraction` - Create new attraction
- **GET** `/api/attraction/[id]` - Get single attraction
- **PUT** `/api/attraction/[id]` - Update attraction + categories (transaction)
- **DELETE** `/api/attraction/[id]` - Delete attraction + cascade to categories

### Users
- **GET** `/api/users` - List all users
- **POST** `/api/users` - Create new user
- **GET** `/api/users/[id]` - Get single user
- **PUT** `/api/users/[id]` - Update user (name, password, birth_date, role)
- **DELETE** `/api/users/[id]` - Delete user + cascade to ratings

### Images
- **GET** `/api/image` - List all images (optional `attraction_id` filter)
- **POST** `/api/image` - Create image record with URL
- **GET** `/api/image/[id]` - Get single image
- **PUT** `/api/image/[id]` - Update image URL + attraction
- **DELETE** `/api/image/[id]` - Delete image record
- **POST** `/api/image/upload` - Upload file to `public/uploads/` (multipart form-data)
  - Returns: `{ image_url: "/uploads/filename" }`

### Ratings
- **GET** `/api/rating` - List all ratings with joined user/attraction names
- **POST** `/api/rating` - Create rating (1-5 stars)
- **DELETE** `/api/rating/[id]` - Delete rating

### Lookup Tables (Read-Only)
- **GET** `/api/category` - List categories
- **GET** `/api/district` - List districts
- **GET** `/api/type` - List attraction types
- **GET** `/api/sect` - List sects

### Response Format
All endpoints return JSON. Errors include status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `404` - Not found
- `500` - Server error
