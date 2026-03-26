import { Link } from 'react-router-dom'

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Terms &amp; Conditions</h1>

        <p className="mb-4">
          These Terms and Conditions ("Terms") govern your access to and use of the Smarter Tracks
          platform, including the mobile application, web portal, and all related services (collectively,
          the <strong>"Platform"</strong>), operated by BAC Tech LLC (<strong>"Company," "we," "us,"</strong>{' '}
          or <strong>"our"</strong>). By accessing or using the Platform, you (<strong>"User," "you,"</strong>{' '}
          or <strong>"your"</strong>) agree to be bound by these Terms. If you do not agree, do not use the
          Platform.
        </p>

        <p className="mb-4">
          The Platform is a business software tool designed for contractors, businesses, and professionals
          to manage tool and equipment inventory. It is not intended for personal consumer use.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Use of the Platform</h2>
        <p className="mb-4">
          By using the Platform, you represent that you are at least 18 years of age and have the legal
          authority to enter into these Terms on behalf of yourself or the organization you represent. You
          agree to use the Platform only for lawful business purposes and in accordance with these Terms.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Intellectual Property</h2>
        <p className="mb-4">
          All trademarks, copyrights, database rights, source code, and other intellectual property rights
          related to the Platform remain the exclusive property of the Company. You may not copy, modify,
          distribute, reverse engineer, decompile, or create derivative works of the Platform or any part
          thereof without prior written consent.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Account Security &amp; Responsibility</h2>
        <p className="mb-4">
          You are responsible for maintaining the confidentiality of your account credentials, including
          your password, and for all activity that occurs under your account. You agree to notify us
          immediately of any unauthorized use of your account. We are not liable for any loss or damage
          arising from your failure to protect your login information or from unauthorized access to your
          account, whether or not you have notified us.
        </p>
        <p className="mb-4">
          You may not share your account with unauthorized individuals. If you provide access to employees
          or team members, you are responsible for their compliance with these Terms.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Acceptable Use Policy</h2>
        <p className="mb-4">You agree not to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Use the Platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
          <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Platform.</li>
          <li>Interfere with, disrupt, or place an undue burden on the Platform or its infrastructure.</li>
          <li>Attempt to gain unauthorized access to any portion of the Platform or any systems or networks connected to it.</li>
          <li>Use any automated means (bots, scrapers, crawlers) to access, monitor, or collect data from the Platform.</li>
          <li>Upload or transmit viruses, malware, or other harmful code.</li>
          <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
          <li>Use the Platform to commit fraud or facilitate any illegal activity.</li>
        </ul>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Tool &amp; Equipment Tracking Disclaimer</h2>
        <p className="mb-4">
          The Platform provides digital recordkeeping tools for tracking tool and equipment inventory.{' '}
          <strong>
            The Platform does not physically track, locate, insure, secure, or safeguard any tools or
            equipment.
          </strong>{' '}
          We are not responsible for the theft, loss, damage, depreciation, or misplacement of any
          physical tools, equipment, or assets, regardless of whether such items were recorded in the
          Platform.
        </p>
        <p className="mb-4">
          The Platform is a recordkeeping aid only. You acknowledge that the Platform does not replace
          physical security measures, insurance coverage, or asset management best practices.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Financial &amp; Valuation Disclaimer</h2>
        <p className="mb-4">
          Any tool values, equipment costs, depreciation estimates, or other financial figures displayed
          within the Platform are <strong>estimates only</strong> based on user-provided data. The Platform
          does not provide and should not be relied upon as:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Accounting or bookkeeping advice</li>
          <li>Tax preparation or tax advice</li>
          <li>Insurance valuations or appraisals</li>
          <li>Certified financial reporting</li>
          <li>Business valuations</li>
        </ul>
        <p className="mb-4">
          You are solely responsible for verifying any figures with a qualified professional before using
          them for tax filings, insurance claims, financial statements, or any other official purpose.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Data Accuracy &amp; User Responsibility</h2>
        <p className="mb-4">
          You are solely responsible for the accuracy, completeness, and legality of all data you enter into
          the Platform, including but not limited to tool descriptions, quantities, values, employee
          assignments, and any other information. We do not verify, audit, or guarantee the accuracy,
          completeness, or reliability of any user-entered data.
        </p>
        <p className="mb-4">
          Any reports, summaries, or calculations generated by the Platform are based entirely on the data
          you provide. Errors in your data will result in errors in the Platform's output.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Service Provided "As Is" &amp; "As Available"</h2>
        <p className="mb-4">
          THE PLATFORM IS PROVIDED ON AN <strong>"AS IS"</strong> AND{' '}
          <strong>"AS AVAILABLE"</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE
          UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Uptime &amp; Service Availability</h2>
        <p className="mb-4">
          We strive to maintain high availability of the Platform, but we do not guarantee any specific
          uptime, continuous operation, or uninterrupted access. The Platform may be temporarily
          unavailable due to scheduled maintenance, updates, infrastructure issues, or circumstances
          beyond our control. We are not liable for any loss or damage resulting from any downtime or
          service interruption.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Data Loss &amp; Backup Disclaimer</h2>
        <p className="mb-4">
          While we take reasonable measures to protect data stored on our systems, we are not responsible
          for any loss, corruption, or unavailability of your data. You acknowledge that it is your
          responsibility to maintain independent backups of any critical data. We are not liable for any
          damages arising from data loss, regardless of cause.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Limitation of Liability</h2>
        <p className="mb-4">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS
          OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Loss of profits or revenue</li>
          <li>Loss of data or business information</li>
          <li>Loss, theft, or damage to physical tools or equipment</li>
          <li>Business interruption or downtime</li>
          <li>Cost of procurement of substitute goods or services</li>
          <li>Any damages arising from reliance on information provided by the Platform</li>
        </ul>
        <p className="mb-4">
          IN ALL CASES, OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING OUT OF OR
          RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER OF (A) THE
          TOTAL AMOUNT YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT
          GIVING RISE TO THE CLAIM, OR (B) FIFTY DOLLARS ($50.00 USD).
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Indemnification</h2>
        <p className="mb-4">
          You agree to indemnify, defend, and hold harmless the Company and its officers, directors,
          employees, agents, and affiliates from and against any and all claims, liabilities, damages,
          losses, costs, and expenses (including reasonable attorneys' fees) arising out of or in
          connection with: (a) your use of or access to the Platform; (b) your violation of these Terms;
          (c) your violation of any applicable law or regulation; (d) any data or content you submit to
          the Platform; or (e) any dispute between you and a third party related to the Platform or data
          within it.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Third-Party Services</h2>
        <p className="mb-4">
          The Platform integrates with and relies upon third-party services to provide its functionality.
          We are not responsible for the availability, accuracy, security, or practices of any third-party
          service, and we are not liable for any outages, data issues, or failures caused by third-party
          providers. Your use of these third-party services is governed by their respective terms:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            <a href="https://policies.google.com/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Google Play Services
            </a>
          </li>
          <li>
            <a href="https://www.apple.com/legal/internet-services/itunes/us/terms.html" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Apple App Store / Apple Media Services
            </a>
          </li>
          <li>
            <a href="https://supabase.com/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Supabase (Database &amp; Authentication)
            </a>
          </li>
          <li>
            <a href="https://stripe.com/legal/ssa" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Stripe (Payment Processing)
            </a>
          </li>
          <li>
            <a href="https://expo.dev/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Expo / EAS (Application Services)
            </a>
          </li>
          <li>
            <a href="https://vercel.com/legal/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Vercel (Web Hosting)
            </a>
          </li>
        </ul>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">14. Payment &amp; Subscription Terms</h2>
        <p className="mb-4">
          Certain features of the Platform may require a paid subscription. All fees are stated at the time
          of purchase and are processed by our third-party payment provider, Stripe. By subscribing, you
          authorize us to charge your payment method on a recurring basis until you cancel. You may cancel
          your subscription at any time, but no refunds will be provided for partial billing periods unless
          required by applicable law.
        </p>
        <p className="mb-4">
          We reserve the right to change pricing at any time. We will provide reasonable notice before any
          price changes take effect for existing subscribers.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">15. Modifications to the Platform</h2>
        <p className="mb-4">
          We reserve the right to modify, update, or discontinue the Platform (or any part of it) at any
          time, with or without notice. We are not liable to you or any third party for any modification,
          suspension, or discontinuance of the Platform. You agree to accept updates to the Platform when
          offered. The Platform is currently available on iOS, Android, and web; system requirements may
          change over time.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">16. Termination &amp; Suspension</h2>
        <p className="mb-4">
          We may suspend or terminate your access to the Platform at any time, with or without cause, and
          with or without notice, including but not limited to situations where we reasonably believe you
          have violated these Terms, engaged in fraudulent activity, or pose a risk to other users or our
          systems.
        </p>
        <p className="mb-4">
          Upon termination: (a) all rights and licenses granted to you under these Terms will immediately
          cease; (b) you must stop using the Platform and delete any copies of the application from your
          devices; (c) we may, but are not obligated to, delete your data after a reasonable retention
          period. Provisions of these Terms that by their nature should survive termination will survive,
          including but not limited to Sections 5, 6, 7, 8, 11, 12, and 18.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">17. Internet Connectivity &amp; Device Requirements</h2>
        <p className="mb-4">
          Certain features of the Platform require an active internet connection. We are not responsible if
          the Platform does not function at full capacity due to lack of internet access. You are
          responsible for any data charges incurred from your mobile network provider, including roaming
          charges. You are also responsible for ensuring your device remains charged and operational.
        </p>
        <p className="mb-4">
          We strongly advise against jailbreaking or rooting your device, as doing so may compromise
          security and cause the Platform to malfunction.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">18. Governing Law &amp; Dispute Resolution</h2>
        <p className="mb-4">
          These Terms shall be governed by and construed in accordance with the laws of the State of
          Florida, United States, without regard to its conflict of law provisions.
        </p>
        <p className="mb-4">
          Any dispute arising out of or relating to these Terms or your use of the Platform shall first be
          attempted to be resolved through good-faith negotiation. If the dispute cannot be resolved within
          thirty (30) days, it shall be resolved through binding arbitration administered in accordance
          with the rules of the American Arbitration Association, with the arbitration taking place in
          Florida. You agree to waive any right to a jury trial or to participate in a class action lawsuit
          against the Company.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">19. Changes to These Terms</h2>
        <p className="mb-4">
          We may update these Terms from time to time. When we do, we will revise the "Effective Date"
          at the bottom of this page. We will notify you of material changes by posting the updated Terms
          on this page and, where appropriate, by email or in-app notification. Your continued use of the
          Platform after any changes constitutes your acceptance of the revised Terms.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">20. Severability</h2>
        <p className="mb-4">
          If any provision of these Terms is found to be unenforceable or invalid by a court of competent
          jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and
          the remaining provisions shall remain in full force and effect.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">21. Entire Agreement</h2>
        <p className="mb-4">
          These Terms, together with our{' '}
          <Link to="/privacy-policy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          , constitute the entire agreement between you and the Company regarding your use of the Platform
          and supersede all prior agreements and understandings, whether written or oral.
        </p>

        {/* ------------------------------------------------------------------ */}
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="mb-4">
          If you have any questions about these Terms and Conditions, please contact us at{' '}
          <a
            href="mailto:Brockcoburn@smartertracks.com"
            className="text-blue-600 hover:underline"
          >
            Brockcoburn@smartertracks.com
          </a>
          .
        </p>

        <p className="mb-4 text-sm text-gray-500">
          These Terms and Conditions are effective as of March 25, 2026.
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
