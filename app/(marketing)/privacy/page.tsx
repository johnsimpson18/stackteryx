import type { Metadata } from "next";
import {
  LegalPage,
  LegalSection,
  LegalSubSection,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Stackteryx",
  description: "Stackteryx Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="March 19, 2026">
      <p
        style={{
          fontSize: 16,
          color: "#A7B0BE",
          lineHeight: 1.7,
          fontFamily: "var(--font-mono-alt)",
        }}
      >
        Stackteryx Inc. (&ldquo;Company,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting
        your privacy. This Privacy Policy explains how we collect, use,
        disclose, and safeguard your information when you use the Stackteryx
        platform (&ldquo;Service&rdquo;). Please read this policy carefully. By
        using the Service, you consent to the data practices described herein.
      </p>

      <LegalSection number="1" title="INFORMATION WE COLLECT">
        <LegalSubSection number="1.1" title="Information You Provide">
          <p>We collect information you directly provide, including:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, listStyleType: "disc" }}>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Account Information:</strong>{" "}
              Name, email address, password, and organization details when you
              create an account.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Business Data:</strong> Tool
              catalogs, vendor information, service configurations, client
              details, pricing data, and proposals you create within the
              Service.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Communication Data:</strong>{" "}
              Messages sent through the Intelligence Chat, support requests, and
              feedback you provide.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Payment Information:</strong>{" "}
              Billing details processed through Stripe. We do not store full
              credit card numbers on our servers.
            </li>
          </ul>
        </LegalSubSection>
        <LegalSubSection number="1.2" title="Information Collected Automatically">
          <p>
            When you use the Service, we automatically collect certain
            information:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, listStyleType: "disc" }}>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Usage Data:</strong> Pages
              visited, features used, actions taken, and time spent on the
              Service.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Device Information:</strong>{" "}
              Browser type, operating system, device type, and screen
              resolution.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Log Data:</strong> IP address,
              access times, referring URLs, and error logs.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Cookies:</strong> Session
              cookies for authentication and preferences. See our cookie
              practices below.
            </li>
          </ul>
        </LegalSubSection>
        <LegalSubSection number="1.3" title="Information from Third Parties">
          <p>
            We may receive information from third-party services you connect,
            including Google (for OAuth authentication) and Stripe (for payment
            status). We only collect information necessary to operate the
            Service.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="2" title="HOW WE USE YOUR INFORMATION">
        <LegalSubSection number="2.1" title="Service Operation">
          <p>
            We use your information to provide, maintain, and improve the
            Service, including processing your business data, generating
            AI-powered outputs, and managing your account.
          </p>
        </LegalSubSection>
        <LegalSubSection number="2.2" title="AI Processing">
          <p>
            Your business data (tool catalogs, service configurations, client
            information) is sent to AI providers (currently Anthropic) to
            generate proposals, CTO briefs, compliance analysis, and other
            AI-powered features. This data is processed in real-time and is not
            used by AI providers to train their models.
          </p>
        </LegalSubSection>
        <LegalSubSection number="2.3" title="Communication">
          <p>
            We may use your email address to send transactional emails (account
            verification, password resets, billing receipts), service
            announcements, and product updates. You may opt out of non-essential
            communications at any time.
          </p>
        </LegalSubSection>
        <LegalSubSection number="2.4" title="Analytics and Improvement">
          <p>
            We use aggregated, anonymized usage data to understand how Users
            interact with the Service, identify areas for improvement, and
            develop new features.
          </p>
        </LegalSubSection>
        <LegalSubSection number="2.5" title="Security">
          <p>
            We use log data and usage patterns to detect and prevent fraud,
            abuse, and unauthorized access to the Service.
          </p>
        </LegalSubSection>
        <LegalSubSection number="2.6" title="Legal Compliance">
          <p>
            We may process your information to comply with applicable laws,
            regulations, legal processes, or governmental requests.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="3" title="HOW WE SHARE YOUR INFORMATION">
        <LegalSubSection number="3.1" title="Service Providers">
          <p>
            We share information with third-party service providers who assist
            in operating the Service:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, listStyleType: "disc" }}>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Supabase:</strong> Database
              hosting and user authentication.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Stripe:</strong> Payment
              processing and subscription management.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Anthropic:</strong> AI model
              processing for content generation.
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Vercel:</strong> Application
              hosting and delivery.
            </li>
          </ul>
        </LegalSubSection>
        <LegalSubSection number="3.2" title="Within Your Organization">
          <p>
            If you are part of an organization account, your activity and data
            within the Service may be visible to other members of your
            organization based on their permission level.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.3" title="Legal Requirements">
          <p>
            We may disclose your information if required by law, regulation,
            legal process, or governmental request, or to protect the rights,
            property, or safety of Stackteryx Inc., our Users, or the public.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.4" title="Business Transfers">
          <p>
            In the event of a merger, acquisition, or sale of all or a portion
            of our assets, your information may be transferred as part of the
            transaction. We will notify you of any such change.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.5" title="No Sale of Data">
          <p>
            We do not sell, rent, or trade your personal information or business
            data to third parties for marketing or advertising purposes.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="4" title="DATA STORAGE AND SECURITY">
        <LegalSubSection number="4.1" title="Storage Location">
          <p>
            Your data is stored on servers provided by Supabase and Vercel,
            primarily located in the United States. By using the Service, you
            consent to the transfer and storage of your data in the United
            States.
          </p>
        </LegalSubSection>
        <LegalSubSection number="4.2" title="Security Measures">
          <p>
            We implement industry-standard security measures including
            encryption in transit (TLS/SSL), encryption at rest, row-level
            security policies, secure authentication (including MFA support),
            and regular security audits.
          </p>
        </LegalSubSection>
        <LegalSubSection number="4.3" title="Limitations">
          <p>
            While we strive to protect your information, no electronic storage
            or transmission method is 100% secure. We cannot guarantee absolute
            security and are not responsible for unauthorized access resulting
            from factors beyond our reasonable control.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="5" title="DATA RETENTION">
        <p>
          We retain your data for as long as your account is active or as needed
          to provide the Service. If you delete your account, we will delete
          your data within 30 days, except where retention is required by law or
          for legitimate business purposes (e.g., fraud prevention, dispute
          resolution). Aggregated, anonymized data may be retained indefinitely
          for analytics purposes.
        </p>
      </LegalSection>

      <LegalSection number="6" title="YOUR RIGHTS AND CHOICES">
        <LegalSubSection number="6.1" title="Access and Portability">
          <p>
            You have the right to access your data and export it using the
            Service&apos;s built-in export features (PDF, DOCX exports for
            proposals and briefs).
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.2" title="Correction">
          <p>
            You may update or correct your account information at any time
            through the Settings page.
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.3" title="Deletion">
          <p>
            You may request deletion of your account and associated data by
            contacting support. Account deletion is permanent and cannot be
            reversed after the 30-day retention period.
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.4" title="Communication Preferences">
          <p>
            You may opt out of non-essential emails by using the unsubscribe
            link in any marketing email or by updating your preferences in
            Settings.
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.5" title="Cookie Preferences">
          <p>
            You may control cookies through your browser settings. Disabling
            essential cookies may affect Service functionality (e.g.,
            authentication).
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.6" title="California Residents">
          <p>
            If you are a California resident, you have additional rights under
            the California Consumer Privacy Act (CCPA), including the right to
            know what data we collect, the right to request deletion, and the
            right to opt out of data sales (we do not sell data).
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.7" title="European Residents">
          <p>
            If you are located in the European Economic Area (EEA), you have
            additional rights under GDPR, including the right to access,
            rectification, erasure, data portability, and the right to object to
            processing. Contact us to exercise these rights.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="7" title="CHILDREN&rsquo;S PRIVACY">
        <p>
          The Service is not intended for individuals under the age of 18. We do
          not knowingly collect personal information from children. If we become
          aware that we have collected data from a child under 18, we will take
          steps to delete that information promptly.
        </p>
      </LegalSection>

      <LegalSection number="8" title="THIRD-PARTY LINKS">
        <p>
          The Service may contain links to third-party websites or services that
          are not operated by us. We are not responsible for the privacy
          practices of these third parties. We encourage you to review the
          privacy policies of any third-party services you access.
        </p>
      </LegalSection>

      <LegalSection number="9" title="CHANGES TO THIS POLICY">
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be communicated via email or in-app notification at least 30 days
          before they take effect. Your continued use of the Service after
          changes constitutes acceptance of the updated policy. The &ldquo;Last
          updated&rdquo; date at the top of this page indicates when the policy
          was last revised.
        </p>
      </LegalSection>

      <LegalSection number="10" title="CONTACT US">
        <p>
          If you have any questions about this Privacy Policy or our data
          practices, please contact us:
        </p>
        <ul
          style={{
            marginTop: 12,
            paddingLeft: 20,
            listStyleType: "disc",
          }}
        >
          <li>
            Email:{" "}
            <a href="mailto:privacy@stackteryx.com" style={{ color: "#c8f135" }}>
              privacy@stackteryx.com
            </a>
          </li>
          <li>
            Legal inquiries:{" "}
            <a href="mailto:legal@stackteryx.com" style={{ color: "#c8f135" }}>
              legal@stackteryx.com
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
