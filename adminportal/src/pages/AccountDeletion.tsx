import { Link } from 'react-router-dom'

export default function AccountDeletion() {
  return (
    <div className="min-h-screen bg-white text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Delete Your Account</h1>

        <p className="mb-4">
          This page explains the methods available to permanently delete your SmarterTracks account
          and associated data. Account deletion is <strong>irreversible</strong>. All records linked
          to your user profile will be removed from our databases and cannot be restored.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Ask a Supervisor</h2>
        <p className="mb-4">
          Any supervisor at your company who has access to the SmarterTracks <em>Web Admin Portal</em>
          can delete your account. Please contact your supervisor and request removal. The deletion
          takes effect immediately after they confirm.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Email Request</h2>
        <p className="mb-4">
          If you cannot reach a supervisor, you may request deletion by emailing us at{' '}
          <a
            href="mailto:brockcoburn@smartertracks.com"
            className="text-blue-600 hover:underline"
          >
            brockcoburn@smartertracks.com
          </a>
          . Please send the email from the address associated with your SmarterTracks account so we
          can verify ownership.
        </p>
        <p className="mb-4">
          We will acknowledge your request within 7 business days and complete the deletion within{' '}
          <strong>30 business days</strong>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Before You Delete</h2>
        <p className="mb-4">
          • Deletion cannot be undone.<br />
          • Make sure to export or record any information you might need.<br />
          • If you are part of multiple companies in SmarterTracks, each company must initiate its
          own deletion.
        </p>

        <div className="mt-10 text-center">
          <Link to="/" className="text-blue-600 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 