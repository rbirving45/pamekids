import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../Layout/Header';
import Footer from '../Layout/Footer';
import SEO from '../SEO';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Terms of Service - PameKids"
        description="Terms of Service for PameKids - Children's Activities in Athens, Greece"
      />
      
      <div className="fixed top-0 left-0 right-0 z-header w-full">
        <Header />
      </div>
      
      {/* Add spacing to account for fixed header */}
      <div className="h-16"></div>
      
      <main className="flex-1 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-blue-500 mb-8">Terms of Service</h1>
          
          <div className="prose prose-blue max-w-none">
            <p className="mb-4">
              Last Updated: March 31, 2025
            </p>
            
            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to PameKids ("we," "our," or "us"). PameKids is a platform that helps parents discover children's activities in Greece. 
              By accessing or using our website, mobile application, or any other services provided by PameKids (collectively, the "Services"), 
              you agree to be bound by these Terms of Service ("Terms").
            </p>
            <p className="mb-4">
              These Terms constitute a legally binding agreement between you and PameKids. If you do not agree with these Terms, 
              please do not access or use our Services.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">2. Service Description</h2>
            <p className="mb-4">
              PameKids provides a map-based interface displaying information about various children's activities including indoor play centers, 
              outdoor activities, sports facilities, educational programs, and entertainment venues in Greece. Our platform allows users to:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>Browse and search for activities based on location, category, age range, and price</li>
              <li>View detailed information about each activity, including descriptions, hours, contact information, and photos</li>
              <li>Submit suggestions for new activities</li>
              <li>Report issues or updates regarding existing listings</li>
              <li>Subscribe to our newsletter for updates on activities</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">3. User Eligibility</h2>
            <p className="mb-4">
              Our Services are intended for use by parents, guardians, and other adults seeking information about children's activities. 
              By using our Services, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">4. User Account and Privacy</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">4.1 Location Data</h3>
            <p className="mb-4">
              Our Services may request access to your device's location information to provide location-based services. 
              You can control this permission through your device settings. We collect and process location data in accordance with our Privacy Policy.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">4.2 Newsletter Subscription</h3>
            <p className="mb-4">
              If you choose to subscribe to our newsletter, you agree to receive periodic communications from us. 
              You can unsubscribe at any time by following the unsubscribe instructions provided in the communication or by contacting us directly.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">4.3 Privacy Policy</h3>
            <p className="mb-4">
              Your use of our Services is also governed by our Privacy Policy, which describes our practices regarding the collection, 
              use, and disclosure of your personal information. By using our Services, you also consent to the practices described in our Privacy Policy.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">5. User Conduct</h2>
            <p className="mb-4">
              When using our Services, you agree not to:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>Use the Services for any illegal purpose or in violation of any local, state, national, or international law</li>
              <li>Violate or infringe the rights of others, including their intellectual property, privacy, or contractual rights</li>
              <li>Interfere with or disrupt the Services or servers or networks connected to the Services</li>
              <li>Attempt to gain unauthorized access to any portion of the Services or any systems or networks connected to the Services</li>
              <li>Use the Services to transmit any virus, worm, or other malicious code</li>
              <li>Use the Services to collect or harvest any information about other users</li>
              <li>Use the Services to send unsolicited communications, promotions, or advertisements</li>
              <li>Impersonate any person or entity or falsely state or misrepresent your affiliation with a person or entity</li>
              <li>Submit false, misleading, or inappropriate content to our platform</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">6. User Submissions</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">6.1 Activity Suggestions and Reports</h3>
            <p className="mb-4">
              When you submit activity suggestions or report issues through our platform, you:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>Represent that the information you provide is accurate, complete, and up-to-date to the best of your knowledge</li>
              <li>Grant us a non-exclusive, worldwide, royalty-free, perpetual, irrevocable right to use, reproduce, modify, adapt, publish, translate, and distribute the content you submit</li>
              <li>Understand that we reserve the right to edit, remove, or decline to publish any submission at our sole discretion</li>
            </ul>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">6.2 Pro Tips and User Feedback</h3>
            <p className="mb-4">
              When you submit "Pro Tips" or other feedback about locations:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>You agree not to submit content that is unlawful, defamatory, harassing, threatening, or otherwise objectionable</li>
              <li>You understand that your submissions are not confidential and may be viewed by other users</li>
              <li>You acknowledge that we may use your feedback to improve our Services</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">7. Intellectual Property Rights</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">7.1 Our Content</h3>
            <p className="mb-4">
              The Services, including all text, graphics, user interfaces, visual interfaces, photographs, trademarks, logos, videos, sounds, 
              music, artwork, computer code, and other materials contained therein (collectively, "Content"), are owned, controlled, or licensed 
              by or to PameKids and are protected by copyright, trademark, and other intellectual property laws. Except as expressly provided in 
              these Terms, no part of the Services and no Content may be copied, reproduced, republished, uploaded, posted, publicly displayed, 
              encoded, translated, transmitted, or distributed in any way to any other computer, server, website, or other medium for publication 
              or distribution or for any commercial enterprise, without our express prior written consent.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">7.2 Limited License</h3>
            <p className="mb-4">
              Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable license 
              to access and use the Services for your personal, non-commercial use.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">8. Third-Party Services and Content</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">8.1 Third-Party Services</h3>
            <p className="mb-4">
              Our Services may integrate with or contain links to third-party websites, applications, or services (such as Google Maps). 
              We do not control and are not responsible for the content or practices of these third parties. We provide these links solely 
              for your convenience, and the inclusion of any link does not imply our endorsement of the linked site or service.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">8.2 Location Information</h3>
            <p className="mb-4">
              The information about activities and venues displayed on our platform is collected from various sources, including user submissions 
              and public data. While we strive to ensure the accuracy of this information, we make no guarantees about its completeness, reliability, 
              or currentness. You should always verify critical information (such as opening hours, prices, and contact details) directly with the 
              venue before planning your visit.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">9. Disclaimers and Limitation of Liability</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">9.1 Disclaimer of Warranties</h3>
            <p className="mb-4">
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, 
              BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. 
              WE DO NOT GUARANTEE THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT ANY DEFECTS WILL BE CORRECTED.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">9.2 Limitation of Liability</h3>
            <p className="mb-4">
              TO THE FULLEST EXTENT PERMITTED BY LAW, PAMEKIDS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
              OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, 
              GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES</li>
              <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES</li>
              <li>ANY CONTENT OBTAINED FROM THE SERVICES</li>
              <li>UNAUTHORIZED ACCESS, USE OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT</li>
            </ul>
            <p className="mb-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS RELATED TO THE SERVICES EXCEED THE AMOUNT PAID BY YOU TO PAMEKIDS, 
              IF ANY, FOR ACCESS TO OR USE OF THE SERVICES DURING THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">10. Indemnification</h2>
            <p className="mb-4">
              You agree to defend, indemnify, and hold harmless PameKids and its officers, directors, employees, and agents from and against 
              any claims, liabilities, damages, losses, and expenses, including, without limitation, reasonable legal and accounting fees, 
              arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your 
              violation of any rights of another.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">11. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. If we make material changes to these Terms, we will provide notice 
              through our Services or by other means. Your continued use of the Services after the changes take effect constitutes your 
              acceptance of the revised Terms.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">12. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your access to all or part of the Services, without notice, for any conduct that we, in our sole 
              discretion, believe violates these Terms or is harmful to other users of the Services or third parties, or for any other reason.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">13. Governing Law and Jurisdiction</h2>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of Greece, without regard to its conflict of law provisions. 
              You agree to submit to the personal and exclusive jurisdiction of the courts located in Athens, Greece for the resolution of any 
              disputes arising out of or relating to these Terms or the Services.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">14. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. 
              The invalid or unenforceable provision shall be replaced by a valid and enforceable provision that comes closest to the intention 
              underlying the invalid provision.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">15. Entire Agreement</h2>
            <p className="mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and PameKids regarding your use of the 
              Services and supersede any prior agreements between you and PameKids relating to your use of the Services.
            </p>

            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">16. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms, please contact us at:
              <br />
              <a href="mailto:info@pamekids.com" className="text-blue-500 hover:text-blue-700">
                info@pamekids.com
              </a>
            </p>
            
            <p className="mt-8 mb-4">
              <Link to="/" className="text-blue-500 hover:text-blue-700">
                Return to Home
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;