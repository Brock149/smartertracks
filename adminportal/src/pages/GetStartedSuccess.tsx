import { Link } from 'react-router-dom'

export default function GetStartedSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Payment complete</h1>
        <p className="mt-4 text-gray-600">
          You can now sign in using the email and password you just created.
        </p>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}
