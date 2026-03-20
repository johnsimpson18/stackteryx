import type { Metadata } from "next";
import {
  LegalPage,
  LegalSection,
  LegalSubSection,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Stackteryx",
  description: "Stackteryx Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="March 19, 2026">
      <LegalSection number="1" title="ACCEPTANCE OF TERMS">
        <p>
          Welcome to Stackteryx (&ldquo;Service&rdquo;), a service economics
          platform operated by Stackteryx Inc. (&ldquo;Company,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By
          accessing or using the Service, you agree to be bound by these Terms
          of Service (&ldquo;Terms&rdquo;). If you do not agree to all of these
          Terms, do not access or use the Service.
        </p>
        <p style={{ marginTop: 12 }}>
          These Terms apply to all visitors, users, and others who access or use
          the Service (&ldquo;Users&rdquo;). By using the Service, you represent
          that you are at least 18 years of age and have the legal capacity to
          enter into a binding agreement.
        </p>
      </LegalSection>

      <LegalSection number="2" title="DESCRIPTION OF SERVICE">
        <p>
          Stackteryx is a service economics platform designed for Managed
          Service Providers (MSPs). The platform helps MSPs design, price,
          manage, and sell their technology services through AI-powered tools
          including service design, pricing optimization, compliance analysis,
          proposal generation, and technology advisory capabilities.
        </p>
      </LegalSection>

      <LegalSection number="3" title="ACCOUNTS AND REGISTRATION">
        <LegalSubSection number="3.1" title="Account Creation">
          <p>
            To use most features of the Service, you must create an account. You
            may sign up using email/password credentials or third-party
            authentication providers (e.g., Google OAuth). You agree to provide
            accurate, current, and complete information during registration.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.2" title="Account Security">
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You must notify us immediately of any unauthorized use of
            your account or any other security breach.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.3" title="Organization Accounts">
          <p>
            The Service supports multi-user organizations. The account creator
            (&ldquo;Organization Owner&rdquo;) may invite team members with
            varying permission levels. The Organization Owner is responsible for
            managing access and ensuring all team members comply with these
            Terms.
          </p>
        </LegalSubSection>
        <LegalSubSection number="3.4" title="Account Accuracy">
          <p>
            You agree to keep your account information up to date. We may
            suspend or terminate accounts that contain inaccurate or outdated
            information.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="4" title="FREE TRIAL">
        <LegalSubSection number="4.1" title="Trial Access">
          <p>
            We may offer a free trial period for new accounts. During the trial,
            you will have access to Pro-tier features as described at the time of
            signup. No credit card is required for the trial.
          </p>
        </LegalSubSection>
        <LegalSubSection number="4.2" title="Trial Expiration">
          <p>
            Upon expiration of the trial period, your account will be
            automatically downgraded to the Free plan with limited access. Your
            data will be preserved. To continue with full access, you must
            subscribe to a paid plan.
          </p>
        </LegalSubSection>
        <LegalSubSection number="4.3" title="Trial Limitations">
          <p>
            Free trials are limited to one per organization. We reserve the
            right to modify, suspend, or discontinue trial offers at any time
            without notice.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="5" title="SUBSCRIPTION AND BILLING">
        <LegalSubSection number="5.1" title="Plans and Pricing">
          <p>
            The Service offers multiple subscription plans with varying features
            and limits. Current plan details and pricing are available on our
            website. We reserve the right to modify pricing with 30 days&apos;
            advance notice to active subscribers.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.2" title="Payment Processing">
          <p>
            Payments are processed through Stripe. By subscribing to a paid
            plan, you authorize us to charge your payment method on a recurring
            basis. You agree to Stripe&apos;s Terms of Service in addition to
            these Terms.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.3" title="Billing Cycle">
          <p>
            Subscriptions are billed monthly or annually, depending on the plan
            selected. Billing begins on the date of subscription and recurs on
            the same date each period.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.4" title="Cancellation">
          <p>
            You may cancel your subscription at any time from your account
            settings. Cancellation takes effect at the end of the current
            billing period. No refunds will be issued for partial billing
            periods.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.5" title="Downgrades">
          <p>
            If you downgrade your plan, the new plan takes effect at the start
            of the next billing cycle. Data exceeding the lower plan&apos;s
            limits will be preserved but may become read-only.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.6" title="Failed Payments">
          <p>
            If a payment fails, we will attempt to charge your payment method up
            to three additional times. After all attempts fail, your account may
            be downgraded to the Free plan.
          </p>
        </LegalSubSection>
        <LegalSubSection number="5.7" title="Taxes">
          <p>
            Prices do not include taxes. You are responsible for all applicable
            taxes, and we will collect taxes where required by law.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="6" title="ACCEPTABLE USE">
        <LegalSubSection number="6.1" title="Permitted Use">
          <p>
            You may use the Service only for lawful purposes consistent with its
            intended function as a business management tool for MSPs and
            technology service providers.
          </p>
        </LegalSubSection>
        <LegalSubSection number="6.2" title="Prohibited Conduct">
          <p>You agree not to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, listStyleType: "disc" }}>
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its systems</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated tools (bots, scrapers) to access the Service without written permission</li>
            <li>Transmit viruses, malware, or other harmful code</li>
            <li>Impersonate another person or entity</li>
            <li>Use the Service to generate misleading, fraudulent, or deceptive content for clients</li>
          </ul>
        </LegalSubSection>
        <LegalSubSection number="6.3" title="Enforcement">
          <p>
            We reserve the right to investigate and take appropriate action
            against violations, including suspending or terminating accounts and
            reporting conduct to law enforcement where applicable.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="7" title="INTELLECTUAL PROPERTY">
        <LegalSubSection number="7.1" title="Our Intellectual Property">
          <p>
            The Service, including its design, features, code, AI models, and
            branding, is owned by Stackteryx Inc. and protected by intellectual
            property laws. Nothing in these Terms grants you ownership rights in
            the Service.
          </p>
        </LegalSubSection>
        <LegalSubSection number="7.2" title="Your Content">
          <p>
            You retain ownership of all data and content you upload to the
            Service (&ldquo;Your Content&rdquo;). By using the Service, you
            grant us a limited, non-exclusive license to use, process, and
            display Your Content solely to operate and improve the Service.
          </p>
        </LegalSubSection>
        <LegalSubSection number="7.3" title="AI-Generated Content">
          <p>
            Content generated by the Service&apos;s AI features (proposals, CTO
            briefs, service descriptions) is provided for your use. You may use,
            modify, and distribute AI-generated content for your business
            purposes. We do not claim ownership of AI-generated content produced
            using your data.
          </p>
        </LegalSubSection>
        <LegalSubSection number="7.4" title="Feedback">
          <p>
            If you provide feedback, suggestions, or ideas about the Service, we
            may use them without obligation to you. You assign to us all rights
            in any feedback you provide.
          </p>
        </LegalSubSection>
        <LegalSubSection number="7.5" title="Trademarks">
          <p>
            &ldquo;Stackteryx&rdquo; and related logos are trademarks of
            Stackteryx Inc. You may not use our trademarks without written
            permission.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="8" title="DATA AND PRIVACY">
        <LegalSubSection number="8.1" title="Data Processing">
          <p>
            Your use of the Service involves the processing of business data
            including client information, service pricing, and tool catalogs. We
            process this data as described in our Privacy Policy.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.2" title="Data Ownership">
          <p>
            You retain full ownership of all business data you input into the
            Service. We will not sell, share, or monetize your business data for
            any purpose other than operating the Service.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.3" title="Data Security">
          <p>
            We implement industry-standard security measures to protect your
            data. However, no method of electronic storage or transmission is
            100% secure, and we cannot guarantee absolute security.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.4" title="Data Portability">
          <p>
            You may export your data from the Service at any time using the
            available export features. Upon account termination, we will provide
            a reasonable period for data export before deletion.
          </p>
        </LegalSubSection>
        <LegalSubSection number="8.5" title="AI Data Usage">
          <p>
            The Service uses AI models provided by third-party providers (e.g.,
            Anthropic). Your business data may be sent to these providers for
            processing but is not used to train their models. See our Privacy
            Policy for more details.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="9" title="THIRD-PARTY SERVICES">
        <p>
          The Service integrates with third-party services including Supabase
          (database and authentication), Stripe (payment processing), and
          Anthropic (AI processing). Your use of the Service may be subject to
          the terms and policies of these third-party providers. We are not
          responsible for the practices of third-party services.
        </p>
      </LegalSection>

      <LegalSection number="10" title="DISCLAIMER OF WARRANTIES">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
          AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </p>
        <p style={{ marginTop: 12 }}>
          AI-generated content (proposals, briefs, compliance analysis) is
          provided for informational purposes and should be reviewed before use
          with clients. We do not guarantee the accuracy, completeness, or
          suitability of AI-generated content.
        </p>
      </LegalSection>

      <LegalSection number="11" title="LIMITATION OF LIABILITY">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, STACKTERYX INC. AND ITS
          OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
          ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES ARISING
          FROM YOUR USE OF THE SERVICE.
        </p>
        <p style={{ marginTop: 12 }}>
          OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR
          USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN
          THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
      </LegalSection>

      <LegalSection number="12" title="INDEMNIFICATION">
        <p>
          You agree to indemnify, defend, and hold harmless Stackteryx Inc. and
          its officers, directors, employees, and agents from any claims,
          liabilities, damages, losses, and expenses (including reasonable
          attorney&apos;s fees) arising from: (a) your use of the Service; (b)
          your violation of these Terms; (c) your violation of any applicable
          law; or (d) your content or data uploaded to the Service.
        </p>
      </LegalSection>

      <LegalSection number="13" title="TERMINATION">
        <LegalSubSection number="13.1" title="By You">
          <p>
            You may terminate your account at any time by contacting support or
            using the account deletion feature in Settings. Termination does not
            entitle you to a refund of any fees already paid.
          </p>
        </LegalSubSection>
        <LegalSubSection number="13.2" title="By Us">
          <p>
            We may suspend or terminate your account at any time for violation
            of these Terms, non-payment, or at our sole discretion with
            reasonable notice. In cases of serious violations, we may terminate
            immediately without notice.
          </p>
        </LegalSubSection>
        <LegalSubSection number="13.3" title="Effect of Termination">
          <p>
            Upon termination, your right to access the Service ceases
            immediately. We will retain your data for 30 days following
            termination to allow for data export, after which it will be
            permanently deleted.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="14" title="GOVERNING LAW AND DISPUTES">
        <LegalSubSection number="14.1" title="Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the State of Delaware, without regard to its conflict of
            law provisions.
          </p>
        </LegalSubSection>
        <LegalSubSection number="14.2" title="Dispute Resolution">
          <p>
            Any disputes arising from these Terms or your use of the Service
            shall first be addressed through good-faith negotiation between the
            parties.
          </p>
        </LegalSubSection>
        <LegalSubSection number="14.3" title="Arbitration">
          <p>
            If negotiation fails, disputes shall be resolved through binding
            arbitration administered by the American Arbitration Association
            (AAA) under its Commercial Arbitration Rules.
          </p>
        </LegalSubSection>
        <LegalSubSection number="14.4" title="Class Action Waiver">
          <p>
            You agree that disputes will be resolved on an individual basis and
            waive any right to participate in a class action lawsuit or
            class-wide arbitration.
          </p>
        </LegalSubSection>
        <LegalSubSection number="14.5" title="Exceptions">
          <p>
            Nothing in this section prevents either party from seeking
            injunctive or equitable relief in a court of competent jurisdiction
            for matters involving intellectual property or unauthorized access.
          </p>
        </LegalSubSection>
      </LegalSection>

      <LegalSection number="15" title="GENERAL PROVISIONS">
        <LegalSubSection number="15.1" title="Entire Agreement">
          <p>
            These Terms, together with the Privacy Policy, constitute the entire
            agreement between you and Stackteryx Inc. regarding the Service.
          </p>
        </LegalSubSection>
        <LegalSubSection number="15.2" title="Modifications">
          <p>
            We may modify these Terms at any time by posting the updated Terms
            on the Service. Material changes will be communicated via email or
            in-app notification. Your continued use of the Service after changes
            constitutes acceptance.
          </p>
        </LegalSubSection>
        <LegalSubSection number="15.3" title="Severability">
          <p>
            If any provision of these Terms is found invalid or unenforceable,
            the remaining provisions shall continue in full force and effect.
          </p>
        </LegalSubSection>
        <LegalSubSection number="15.4" title="Waiver">
          <p>
            Our failure to enforce any right or provision of these Terms shall
            not constitute a waiver of that right or provision.
          </p>
        </LegalSubSection>
        <LegalSubSection number="15.5" title="Assignment">
          <p>
            You may not assign or transfer your account or these Terms without
            our written consent. We may assign these Terms in connection with a
            merger, acquisition, or sale of assets.
          </p>
        </LegalSubSection>
        <LegalSubSection number="15.6" title="Force Majeure">
          <p>
            We shall not be liable for any failure to perform due to causes
            beyond our reasonable control, including natural disasters, war,
            terrorism, or infrastructure failures.
          </p>
        </LegalSubSection>
        <LegalSubSection number="15.7" title="Contact">
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:legal@stackteryx.com" style={{ color: "#c8f135" }}>
              legal@stackteryx.com
            </a>
            .
          </p>
        </LegalSubSection>
      </LegalSection>
    </LegalPage>
  );
}
