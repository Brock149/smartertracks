import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>

        <p className="mb-4">
          This Privacy Policy describes how BAC Tech LLC (<strong>"Company," "we," "us,"</strong> or{' '}
          <strong>"our"</strong>) collects, uses, and shares information in connection with the Smarter
          Tracks platform, including the mobile application, web portal, and all related services
          (collectively, the <strong>"Platform"</strong>). By using the Platform, you agree to the
          collection and use of information as described in this policy.
        </p>

        <p className="mb-4">
          The Platform is a business software tool designed for contractors and businesses to manage tool
          and equipment inventory. This policy applies to all users of the Platform, including account
          administrators and team members.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>

        <h3 className="text-xl font-semibold mt-6 mb-3">Information You Provide</h3>
        <p className="mb-4">When you create an account or use the Platform, you may provide:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Name and email address</li>
          <li>Company or business name</li>
          <li>Phone number</li>
          <li>Payment and billing information (processed by Stripe; we do not store full payment card details)</li>
          <li>Tool and equipment inventory data (descriptions, values, quantities, photos, assignments)</li>
          <li>Employee or team member information you enter into the Platform</li>
          <li>Support requests and communications</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-3">Information Collected Automatically</h3>
        <p className="mb-4">When you use the Platform, we may automatically collect:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Device information (device type, operating system, unique device identifiers)</li>
          <li>IP address</li>
          <li>Usage data (pages visited, features used, time and date of access, session duration)</li>
          <li>App version and performance data</li>
          <li>Error and crash logs</li>
        </ul>
        <p className="mb-4">
          The Platform does not collect precise geolocation data from your device.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">We use the information we collect to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Provide, operate, and maintain the Platform</li>
          <li>Process transactions and manage subscriptions</li>
          <li>Send important notices, such as account updates, security alerts, and policy changes</li>
          <li>Respond to support requests and communications</li>
          <li>Improve the Platform's functionality, performance, and user experience</li>
          <li>Monitor usage patterns and analyze trends</li>
          <li>Protect against fraud, abuse, and unauthorized access</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p className="mb-4">
          We may send marketing communications about our products or services. You may opt out of
          marketing emails at any time by using the unsubscribe link in the email or by contacting us.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Third-Party Services</h2>
        <p className="mb-4">
          The Platform relies on third-party services to provide its functionality. These services may
          collect and process data in accordance with their own privacy policies. We encourage you to
          review their policies:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Google Play Services
            </a>
            {' '}&mdash; App distribution on Android
          </li>
          <li>
            <a href="https://www.apple.com/legal/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Apple
            </a>
            {' '}&mdash; App distribution on iOS
          </li>
          <li>
            <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Supabase
            </a>
            {' '}&mdash; Database, authentication, and backend infrastructure
          </li>
          <li>
            <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Stripe
            </a>
            {' '}&mdash; Payment processing and billing
          </li>
          <li>
            <a href="https://expo.dev/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Expo / EAS
            </a>
            {' '}&mdash; Mobile application build and delivery services
          </li>
          <li>
            <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Vercel
            </a>
            {' '}&mdash; Web hosting
          </li>
        </ul>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. How We Share Your Information</h2>
        <p className="mb-4">We may share your information in the following circumstances:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            <strong>Service providers:</strong> With trusted third-party providers who help us operate the
            Platform (as listed above). These providers process data only on our behalf and are obligated
            to protect your information.
          </li>
          <li>
            <strong>Legal compliance:</strong> When required by law, such as to comply with a subpoena,
            court order, or other legal process.
          </li>
          <li>
            <strong>Safety and rights:</strong> When we believe in good faith that disclosure is necessary
            to protect our rights, your safety, the safety of others, or to investigate fraud.
          </li>
          <li>
            <strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of all or
            a portion of our assets, your information may be transferred as part of that transaction.
          </li>
        </ul>
        <p className="mb-4">
          We do not sell your personal information to third parties.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Payment Information</h2>
        <p className="mb-4">
          All payment processing is handled by Stripe. When you provide payment information, it is
          transmitted directly to Stripe's secure servers. We do not store your full credit card number,
          CVV, or other sensitive payment details on our systems. We may receive and store limited
          information from Stripe, such as the last four digits of your card, card type, and billing
          address, for record-keeping and support purposes.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Retention</h2>
        <p className="mb-4">
          We retain your data for as long as your account is active or as needed to provide you with the
          Platform's services. We may also retain your data as necessary to comply with legal obligations,
          resolve disputes, and enforce our agreements. If you wish to request deletion of your data,
          please contact us or use the account deletion feature within the Platform. Upon account deletion,
          we will remove or anonymize your data within a reasonable timeframe, except where retention is
          required by law.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Security</h2>
        <p className="mb-4">
          We implement industry-standard physical, electronic, and procedural safeguards to protect your
          information. However, no method of transmission over the internet or electronic storage is
          completely secure. While we strive to protect your information, we cannot guarantee its absolute
          security.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Your Rights &amp; Choices</h2>
        <p className="mb-4">Depending on your jurisdiction, you may have the right to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict certain processing of your data</li>
          <li>Request a portable copy of your data</li>
          <li>Withdraw consent at any time (where processing is based on consent)</li>
        </ul>
        <p className="mb-4">
          To exercise any of these rights, please contact us at the email address below. We will respond
          within a reasonable timeframe in accordance with applicable law.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Opt-Out &amp; Uninstall</h2>
        <p className="mb-4">
          You may stop all collection of information by the mobile application by uninstalling it using
          the standard uninstall process for your device. You may also delete your account through the
          Platform or by contacting us. Note that uninstalling the app does not automatically delete your
          account or data from our servers.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Children's Privacy</h2>
        <p className="mb-4">
          The Platform is not directed at anyone under the age of 13. We do not knowingly collect
          personally identifiable information from children under 13. If we discover that a child under 13
          has provided personal information, we will promptly delete it from our servers. If you are a
          parent or guardian and believe your child has provided us with personal information, please
          contact us immediately.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to This Privacy Policy</h2>
        <p className="mb-4">
          We may update this Privacy Policy from time to time. When we do, we will revise the "Effective
          Date" at the bottom of this page. We will notify you of material changes by posting the updated
          policy on this page and, where appropriate, through email or in-app notification. Your continued
          use of the Platform after any changes constitutes your acceptance of the revised Privacy Policy.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Your Consent</h2>
        <p className="mb-4">
          By using the Platform, you consent to the collection and processing of your information as
          described in this Privacy Policy.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="mb-4">
          If you have any questions about this Privacy Policy or our data practices, please contact us
          at{' '}
          <a
            href="mailto:Brockcoburn@smartertracks.com"
            className="text-blue-600 hover:underline"
          >
            Brockcoburn@smartertracks.com
          </a>
          .
        </p>

        <p className="mb-4 text-sm text-gray-500">
          This Privacy Policy is effective as of March 25, 2026.
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
