# MERN Stack Feedback Application

A complete MERN stack application with user authentication, profile management, and role-based access control for Students and Teachers.

## Features

### Authentication & Authorization
- Secure user registration and login
- JWT-based authentication
- Role-based access control (Student/Teacher)
- Password hashing with bcrypt
- Protected routes

### User Management
- **Create**: Profile created during signup with auto-generated IDs
- **Read**: Users can view their personal information and role
- **Update**: Students/Teachers can edit details, change passwords, update profile pictures
- **Delete**: Profiles can be deactivated upon request

### Key Features
- Auto-generated Student ID (STU0001, STU0002, etc.)
- Auto-generated Teacher ID (TCH0001, TCH0002, etc.)
- Profile picture upload functionality
- Role-based dashboards
- Responsive design with modern UI
- Form validation and error handling
- Toast notifications for user feedback

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Multer for file uploads
- Express Validator for input validation

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- React Toastify for notifications
- Styled Components for styling
- Context API for state management

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TestFeedback
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in the Backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/feedback_app
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd Frontend
npm install
```

Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/profile-picture` - Upload profile picture
- `PUT /api/users/change-password` - Change password
- `DELETE /api/users/profile` - Deactivate account
- `GET /api/users/students` - Get all students (Teacher only)
- `GET /api/users/teachers` - Get all teachers (Student only)

## User Roles

### Student
- Can view their profile information
- Can update their personal details
- Can change their password
- Can upload profile picture
- Can view list of teachers
- Can deactivate their account

### Teacher
- Can view their profile information
- Can update their personal details
- Can change their password
- Can upload profile picture
- Can view list of students
- Can deactivate their account

## Database Schema

### User Model
```javascript
{
  studentId: String, // Auto-generated: STU0001, STU0002, etc.
  teacherId: String, // Auto-generated: TCH0001, TCH0002, etc.
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['student', 'teacher']),
  profilePicture: String,
  phone: String,
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## File Structure

```
TestFeedback/
├── Backend/
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── uploads/
│   │   └── profiles/
│   ├── package.json
│   ├── server.js
│   └── config.env
├── Frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Profile.js
│   │   │   └── ProtectedRoute.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Usage

1. **Registration**: Visit `/register` to create a new account as either a Student or Teacher
2. **Login**: Use your credentials to log in at `/login`
3. **Dashboard**: After login, you'll be redirected to your role-based dashboard
4. **Profile Management**: Visit `/profile` to update your information, change password, or upload a profile picture
5. **User Lists**: Teachers can view all students, Students can view all teachers

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- File upload restrictions (images only, 5MB max)
- Protected routes and role-based access
- CORS configuration
- Error handling middleware

## Development

### Backend Development
```bash
cd Backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
cd Frontend
npm start  # Runs on port 3000
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment variables
2. Use a strong JWT secret
3. Configure MongoDB Atlas for production database
4. Build the frontend: `npm run build`
5. Serve the built files with your backend or a static file server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
