import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>

        <p className="mb-4">
          This privacy policy applies to the Smarter Tracks app (hereby referred to as
          <strong> "Application"</strong>) for mobile devices that was created by BAC Tech (hereby
          referred to as <strong>"Service Provider"</strong>) as a Free service. This service is intended
          for use <strong>"AS IS"</strong>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Information Collection and Use</h2>
        <p className="mb-4">
          The Application collects information when you download and use it. This information may
          include information such as:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Your device's Internet Protocol address (e.g. IP address)</li>
          <li>The pages of the Application that you visit, the time and date of your visit, the time spent on those pages</li>
          <li>The time spent on the Application</li>
          <li>The operating system you use on your mobile device</li>
        </ul>
        <p className="mb-4">
          The Application does not gather precise information about the location of your mobile
          device.
        </p>
        <p className="mb-4">
          The Service Provider may use the information you provided to contact you from time to time
          to provide you with important information, required notices and marketing promotions.
        </p>
        <p className="mb-4">
          For a better experience, while using the Application, the Service Provider may require you
          to provide us with certain personally identifiable information, including but not limited
          to Email, Name. The information that the Service Provider request will be retained by them
          and used as described in this privacy policy.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Third Party Access</h2>
        <p className="mb-4">
          Only aggregated, anonymized data is periodically transmitted to external services to aid
          the Service Provider in improving the Application and their service. The Service Provider
          may share your information with third parties in the ways that are described in this
          privacy statement.
        </p>
        <p className="mb-4">
          Please note that the Application utilizes third-party services that have their own Privacy
          Policy about handling data. Below is the link to the Privacy Policy of the third-party
          service provider used by the Application:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            <a
              href="https://policies.google.com/privacy"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Play Services
            </a>
          </li>
        </ul>
        <p className="mb-4">
          The Service Provider may disclose User Provided and Automatically Collected Information:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>as required by law, such as to comply with a subpoena, or similar legal process;</li>
          <li>
            when they believe in good faith that disclosure is necessary to protect their rights,
            protect your safety or the safety of others, investigate fraud, or respond to a
            government request;
          </li>
          <li>
            with their trusted services providers who work on their behalf, do not have an
            independent use of the information we disclose to them, and have agreed to adhere to the
            rules set forth in this privacy statement.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Opt-Out Rights</h2>
        <p className="mb-4">
          You can stop all collection of information by the Application easily by uninstalling it.
          You may use the standard uninstall processes as may be available as part of your mobile
          device or via the mobile application marketplace or network.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Retention Policy</h2>
        <p className="mb-4">
          The Service Provider will retain User Provided data for as long as you use the Application
          and for a reasonable time thereafter. If you'd like them to delete User Provided Data that
          you have provided via the Application, please contact them at
          <a
            href="mailto:Brockcoburn@smartertracks.com"
            className="text-blue-600 hover:underline"
          >
            Brockcoburn@smartertracks.com
          </a>
          and they will respond in a reasonable time.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Children</h2>
        <p className="mb-4">
          The Service Provider does not use the Application to knowingly solicit data from or market
          to children under the age of 13.
        </p>
        <p className="mb-4">
          The Application does not address anyone under the age of 13. The Service Provider does not
          knowingly collect personally identifiable information from children under 13 years of age.
          In the case the Service Provider discover that a child under 13 has provided personal
          information, the Service Provider will immediately delete this from their servers. If you
          are a parent or guardian and you are aware that your child has provided us with personal
          information, please contact the Service Provider so that they will be able to take the
          necessary actions.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Security</h2>
        <p className="mb-4">
          The Service Provider is concerned about safeguarding the confidentiality of your
          information. The Service Provider provides physical, electronic, and procedural safeguards
          to protect information the Service Provider processes and maintains.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes</h2>
        <p className="mb-4">
          This Privacy Policy may be updated from time to time for any reason. The Service Provider
          will notify you of any changes to the Privacy Policy by updating this page with the new
          Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes,
          as continued use is deemed approval of all changes.
        </p>
        <p className="mb-4">This privacy policy is effective as of 2025-07-10.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Your Consent</h2>
        <p className="mb-4">
          By using the Application, you are consenting to the processing of your information as set
          forth in this Privacy Policy now and as amended by us.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="mb-4">
          If you have any questions regarding privacy while using the Application, or have questions
          about the practices, please contact the Service Provider via email at
          <a
            href="mailto:Brockcoburn@smartertracks.com"
            className="text-blue-600 hover:underline"
          >
            Brockcoburn@smartertracks.com
          </a>
          .
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