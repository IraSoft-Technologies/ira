import { COMPANY } from "@/data/company";

export interface ContactFormData {
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  country?: string;
  service: string;
  projectType: string;
  budget?: string;
  timeline?: string;
  description: string;
  preferredContact: string;
  consent: boolean;
  honeypot?: string;
}

export interface DispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: "live" | "development_logged";
  acknowledgmentSent?: boolean;
}

export interface JobApplicationData {
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  roleTitle: string;
  department?: string;
  experience: string;
  availability?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  coverNote: string;
  consent: boolean;
  resumeAttachment?: {
    filename: string;
    content: string; // base64
  };
}

interface ResendSendPayload {
  apiKey: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

function getFirstName(fullName: string): string {
  if (!fullName) return "there";
  const trimmed = fullName.trim();
  const first = trimmed.split(/\s+/)[0];
  return first || trimmed;
}

function resolveSender(role: "recruitment" | "consulting"): string {
  const configured = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.CAREERS_FROM_EMAIL ||
    ""
  ).trim();

  let emailOnly = COMPANY.emails.enquiry;

  if (configured) {
    const match = configured.match(/<([^>]+)>/);
    if (match && match[1]?.includes("@")) {
      emailOnly = match[1].trim();
    } else if (configured.includes("@")) {
      emailOnly = configured.trim();
    }
  }

  // Force official corporate verified identity in Title Case
  return `IraSoft Technologies <${emailOnly}>`;
}

async function sendViaResend(payload: ResendSendPayload): Promise<DispatchResult> {
  try {
    const body: Record<string, unknown> = {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    };

    if (payload.replyTo) {
      body.reply_to = payload.replyTo;
    }

    if (payload.attachments && payload.attachments.length > 0) {
      body.attachments = payload.attachments;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      console.error("[Resend API Error]:", errorJson);
      return {
        success: false,
        error: errorJson.message || `Resend API returned HTTP ${res.status}`,
        mode: "live",
      };
    }

    const json = await res.json();
    return {
      success: true,
      messageId: json.id,
      mode: "live",
    };
  } catch (err: any) {
    console.error("[Email Dispatch Exception]:", err);
    return {
      success: false,
      error: err.message || "Failed to connect to email dispatch service",
      mode: "live",
    };
  }
}

export async function dispatchEnquiryEmails(data: ContactFormData): Promise<DispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.ENQUIRY_NOTIFICATION_EMAIL || COMPANY.emails.enquiry;
  const fromEmail = resolveSender("consulting");
  const firstName = getFirstName(data.fullName);
  const refId = `IRA-ENQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // 1. Internal notification HTML for IraSoft consulting desk
  const htmlNotification = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>New Project Enquiry - IraSoft Technologies</title>
        <style>
          body { font-family: "Times New Roman", Times, Georgia, serif; background-color: #f5f8fa; margin: 0; padding: 24px; color: #263445; }
          .card { background-color: #ffffff; max-width: 620px; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(20,43,74,0.06); }
          .header { background-color: #142B4A; color: #ffffff; padding: 24px; text-align: left; }
          .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; }
          .header p { margin: 0; font-size: 13px; color: #159B9A; font-weight: 600; letter-spacing: 0.5px; }
          .body { padding: 28px; }
          .row { display: flex; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .label { width: 180px; font-weight: 700; color: #64748b; font-size: 13px; }
          .value { flex: 1; color: #142b4a; font-size: 14px; font-weight: 500; }
          .message-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-top: 14px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
          .footer { background-color: #f8fafc; padding: 16px 28px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header" style="background-color: #142B4A; color: #ffffff; padding: 24px; text-align: left;">
            <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; text-transform: none !important;">New Client Project Enquiry</h1>
            <p style="margin: 0; font-size: 13px; color: #159B9A; font-weight: 600; letter-spacing: 0.5px; text-transform: none !important;">IraSoft Technologies Enquiry Desk &bull; Ref: ${refId}</p>
          </div>
          <div class="body">
            <div class="row"><div class="label">Client Name:</div><div class="value">${escapeHtml(data.fullName)}</div></div>
            <div class="row"><div class="label">Business / Company:</div><div class="value">${escapeHtml(data.companyName || "Not specified")}</div></div>
            <div class="row"><div class="label">Email Address:</div><div class="value"><a href="mailto:${escapeHtml(data.email)}" style="color: #159B9A;">${escapeHtml(data.email)}</a></div></div>
            <div class="row"><div class="label">Phone Number:</div><div class="value"><a href="tel:${escapeHtml(data.phone)}" style="color: #159B9A;">${escapeHtml(data.phone)}</a></div></div>
            <div class="row"><div class="label">Country:</div><div class="value">${escapeHtml(data.country || "Not specified")}</div></div>
            <div class="row"><div class="label">Service Required:</div><div class="value" style="color: #142B4A; font-weight: 700;">${escapeHtml(data.service)}</div></div>
            <div class="row"><div class="label">Project Type:</div><div class="value">${escapeHtml(data.projectType)}</div></div>
            <div class="row"><div class="label">Estimated Budget:</div><div class="value">${escapeHtml(data.budget || "Prefer to discuss")}</div></div>
            <div class="row"><div class="label">Expected Timeline:</div><div class="value">${escapeHtml(data.timeline || "Not decided")}</div></div>
            <div class="row"><div class="label">Preferred Contact:</div><div class="value">${escapeHtml(data.preferredContact)}</div></div>
            
            <div style="margin-top: 20px;">
              <div class="label">Project Scope & Details:</div>
              <div class="message-box">${escapeHtml(data.description)}</div>
            </div>
          </div>
          <div class="footer">
            Submitted via IraSoft Technologies Corporate Portal &bull; ${now.toISOString()}
          </div>
        </div>
      </body>
    </html>
  `;

  // 2. Client acknowledgment email (PhonePe corporate style)
  const htmlClientConfirmation = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Enquiry Received - IraSoft Technologies</title>
        <style>
          body { font-family: "Times New Roman", Times, Georgia, serif; background-color: #f5f8fa; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(20,43,74,0.05); }
          .header { background-color: #142B4A; color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #159B9A; }
          .brand-title { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff; margin: 0; }
          .brand-subtitle { font-size: 13px; color: #159B9A; margin-top: 4px; font-weight: 600; }
          .content { padding: 32px; line-height: 1.7; font-size: 15px; color: #263445; }
          .salutation { font-size: 16px; font-weight: 700; color: #142B4A; margin-bottom: 18px; }
          .paragraph { margin: 0 0 16px 0; color: #334155; }
          .summary-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #159B9A; border-radius: 6px; padding: 18px 22px; margin: 24px 0; }
          .summary-title { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; color: #142B4A; margin-bottom: 10px; }
          .summary-row { font-size: 14px; margin-bottom: 6px; color: #475569; }
          .summary-row strong { color: #142B4A; }
          .signoff { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #334155; }
          .signoff-name { font-weight: 700; color: #142B4A; font-size: 15px; margin-top: 6px; }
          .signoff-company { font-size: 13px; font-weight: 600; color: #159B9A; letter-spacing: 0.5px; }
          .footer { background-color: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          .footer a { color: #159B9A; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background-color: #142B4A; color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #159B9A;">
            <h1 class="brand-title" style="font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff; margin: 0; text-transform: none !important; font-family: 'Times New Roman', Times, Georgia, serif;">IraSoft Technologies</h1>
            <div class="brand-subtitle" style="font-size: 13px; color: #159B9A; margin-top: 4px; font-weight: 600; text-transform: none !important;">Engineering Technology for Business Growth</div>
          </div>
          <div class="content">
            <div class="salutation">Hi ${escapeHtml(firstName)},</div>

            <p class="paragraph">
              Thank you for submitting your enquiry regarding <strong>${escapeHtml(data.service)}</strong>${data.companyName ? ` on behalf of <strong>${escapeHtml(data.companyName)}</strong>` : ""}. We appreciate your interest in partnering with the team at <strong>IraSoft Technologies</strong>.
            </p>

            <p class="paragraph">
              Our technical consulting and solutions team is currently reviewing your project requirements. A solutions specialist will contact you shortly via your preferred channel (<strong>${escapeHtml(data.preferredContact)}</strong>) to discuss your objectives and schedule an exploratory discussion.
            </p>

            <p class="paragraph">
              In the meantime, please feel free to refer to our company website at <a href="${COMPANY.websiteUrl}" style="color: #159B9A; font-weight: 600; text-decoration: underline;">${COMPANY.websiteUrl}</a> or review our recent case studies at <a href="${COMPANY.websiteUrl}/portfolio" style="color: #159B9A; font-weight: 600; text-decoration: underline;">${COMPANY.websiteUrl}/portfolio</a> to learn more about our solutions, our culture, and the work we do.
            </p>

            <div class="summary-card">
              <div class="summary-title">Enquiry Reference Details</div>
              <div class="summary-row"><strong>Service Requested:</strong> ${escapeHtml(data.service)}</div>
              <div class="summary-row"><strong>Project Type:</strong> ${escapeHtml(data.projectType)}</div>
              <div class="summary-row"><strong>Client Name:</strong> ${escapeHtml(data.fullName)}</div>
              <div class="summary-row"><strong>Preferred Contact:</strong> ${escapeHtml(data.preferredContact)}</div>
              <div class="summary-row"><strong>Reference Number:</strong> ${refId}</div>
              <div class="summary-row"><strong>Submission Date:</strong> ${dateFormatted}</div>
            </div>

            <p class="paragraph">
              If you have urgent questions, you can also reach our desk directly:
              <br />
              &bull; Official Phone / WhatsApp: <a href="${COMPANY.phone.whatsappUrl}" style="color: #159B9A; font-weight: 600; text-decoration: none;">${COMPANY.phone.display}</a>
              <br />
              &bull; Official Email: <a href="mailto:${COMPANY.emails.enquiry}" style="color: #159B9A; font-weight: 600; text-decoration: none;">${COMPANY.emails.enquiry}</a>
            </p>

            <p class="paragraph">
              Thank you again for your time and interest.
            </p>

            <div class="signoff">
              <div>Best regards,</div>
              <div class="signoff-name" style="font-weight: 700; color: #142B4A; font-size: 15px; margin-top: 6px; text-transform: none !important;">IraSoft Technologies Consulting Team</div>
              <div class="signoff-company" style="font-size: 13px; font-weight: 600; color: #159B9A; letter-spacing: 0.5px; text-transform: none !important;">IraSoft Technologies</div>
            </div>
          </div>
          <div class="footer">
            &copy; ${now.getFullYear()} ${COMPANY.legalName}. All Rights Reserved.<br />
            ${COMPANY.domain} &bull; <a href="mailto:${COMPANY.emails.enquiry}">${COMPANY.emails.enquiry}</a> &bull; ${COMPANY.phone.display}
          </div>
        </div>
      </body>
    </html>
  `;

  // If RESEND_API_KEY is not configured, record in development mode
  if (!apiKey) {
    console.info("[IraSoft Enquiry - DEV MODE (No RESEND_API_KEY)]:", {
      notificationTo: notificationEmail,
      clientEmail: data.email,
      refId,
      service: data.service,
      projectType: data.projectType,
      from: fromEmail,
      timestamp: now.toISOString(),
    });

    console.info(`[Dev Preview - Client Acknowledgment sent to ${data.email}]:\nHi ${firstName},\nThank you for submitting your enquiry regarding ${data.service}...`);

    return {
      success: true,
      mode: "development_logged",
      messageId: `dev-mock-${Date.now()}`,
      acknowledgmentSent: true,
    };
  }

  // Live dispatch via Resend REST API
  const primaryResult = await sendViaResend({
    apiKey,
    from: fromEmail,
    to: [notificationEmail],
    replyTo: data.email,
    subject: `[New Enquiry] ${data.service} - ${data.fullName} (${data.companyName || "Individual"}) [Ref: ${refId}]`,
    html: htmlNotification,
  });

  if (!primaryResult.success) {
    return primaryResult;
  }

  // Send acknowledgment email to client and await so serverless does not abort mid-flight
  let acknowledgmentSent = false;
  if (data.email) {
    const ackResult = await sendViaResend({
      apiKey,
      from: fromEmail,
      to: [data.email],
      replyTo: COMPANY.emails.enquiry,
      subject: `Enquiry Received: ${data.service} — IraSoft Technologies`,
      html: htmlClientConfirmation,
    });

    if (ackResult.success) {
      acknowledgmentSent = true;
    } else {
      console.warn("[Client Acknowledgment Email Non-Critical Notice]:", ackResult.error);
    }
  }

  return {
    ...primaryResult,
    acknowledgmentSent,
  };
}

export async function dispatchJobApplicationEmails(
  data: JobApplicationData
): Promise<DispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const notificationEmail =
    process.env.CAREERS_NOTIFICATION_EMAIL || COMPANY.emails.enquiry;
  const fromEmail = resolveSender("recruitment");
  const firstName = getFirstName(data.fullName);
  const refId = `IRA-APP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // 1. Internal notification HTML for IraSoft hiring desk
  const htmlNotification = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Job Application - ${escapeHtml(data.roleTitle)}</title>
        <style>
          body { font-family: "Times New Roman", Times, Georgia, serif; background-color: #f5f8fa; margin: 0; padding: 24px; color: #263445; }
          .card { background-color: #ffffff; max-width: 640px; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(20,43,74,0.06); }
          .header { background-color: #142B4A; color: #ffffff; padding: 24px; text-align: left; }
          .eyebrow { margin: 0 0 6px 0; font-size: 12px; color: #2dd4bf; font-weight: 700; letter-spacing: 0.5px; }
          .header h1 { margin: 0; font-size: 21px; font-weight: 700; color: #ffffff; }
          .body { padding: 28px; }
          .row { display: flex; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .label { width: 190px; font-weight: 700; color: #64748b; font-size: 13px; }
          .value { flex: 1; color: #142b4a; font-size: 14px; font-weight: 500; }
          .message-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-top: 10px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
          .footer { background-color: #f8fafc; padding: 16px 28px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header" style="background-color: #142B4A; color: #ffffff; padding: 24px; text-align: left;">
            <div class="eyebrow" style="margin: 0 0 6px 0; font-size: 12px; color: #2dd4bf; font-weight: 700; letter-spacing: 0.5px; text-transform: none !important;">Job Application &bull; IraSoft Technologies Careers</div>
            <h1 style="margin: 0; font-size: 21px; font-weight: 700; color: #ffffff; text-transform: none !important;">Job Application: ${escapeHtml(data.roleTitle)}</h1>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Ref: ${refId}</p>
          </div>
          <div class="body">
            <div class="row"><div class="label">Applicant Name:</div><div class="value">${escapeHtml(data.fullName)}</div></div>
            <div class="row"><div class="label">Position Applied For:</div><div class="value" style="color: #142B4A; font-weight: 700;">${escapeHtml(data.roleTitle)}${data.department ? ` (${escapeHtml(data.department)})` : ""}</div></div>
            <div class="row"><div class="label">Email Address:</div><div class="value"><a href="mailto:${escapeHtml(data.email)}" style="color: #159B9A;">${escapeHtml(data.email)}</a></div></div>
            <div class="row"><div class="label">Phone Number:</div><div class="value"><a href="tel:${escapeHtml(data.phone)}" style="color: #159B9A;">${escapeHtml(data.phone)}</a></div></div>
            <div class="row"><div class="label">Current Location:</div><div class="value">${escapeHtml(data.location || "Not specified")}</div></div>
            <div class="row"><div class="label">Experience:</div><div class="value">${escapeHtml(data.experience)}</div></div>
            <div class="row"><div class="label">Availability / Notice:</div><div class="value">${escapeHtml(data.availability || "Not specified")}</div></div>
            <div class="row"><div class="label">Portfolio / LinkedIn:</div><div class="value">${data.portfolioUrl ? `<a href="${escapeHtml(data.portfolioUrl)}" style="color: #159B9A;">${escapeHtml(data.portfolioUrl)}</a>` : "Not provided"}</div></div>
            <div class="row"><div class="label">Resume / CV Link:</div><div class="value">${data.resumeUrl ? `<a href="${escapeHtml(data.resumeUrl)}" style="color: #159B9A;">${escapeHtml(data.resumeUrl)}</a>` : data.resumeAttachment ? `Attached (${escapeHtml(data.resumeAttachment.filename)})` : "Not provided"}</div></div>

            <div style="margin-top: 20px;">
              <div class="label">Cover Note / Summary:</div>
              <div class="message-box">${escapeHtml(data.coverNote)}</div>
            </div>
          </div>
          <div class="footer">
            Submitted via IraSoft Technologies Careers Portal &bull; ${now.toISOString()}
          </div>
        </div>
      </body>
    </html>
  `;

  // 2. Candidate acknowledgment email (PhonePe corporate recruitment style)
  const htmlApplicantConfirmation = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Application Received - IraSoft Technologies</title>
        <style>
          body { font-family: "Times New Roman", Times, Georgia, serif; background-color: #f5f8fa; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(20,43,74,0.05); }
          .header { background-color: #142B4A; color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #159B9A; }
          .brand-title { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff; margin: 0; }
          .brand-subtitle { font-size: 13px; color: #159B9A; margin-top: 4px; font-weight: 600; }
          .content { padding: 32px; line-height: 1.7; font-size: 15px; color: #263445; }
          .salutation { font-size: 16px; font-weight: 700; color: #142B4A; margin-bottom: 18px; }
          .paragraph { margin: 0 0 16px 0; color: #334155; }
          .summary-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #159B9A; border-radius: 6px; padding: 18px 22px; margin: 24px 0; }
          .summary-title { font-size: 13px; font-weight: 700; letter-spacing: 0.5px; color: #142B4A; margin-bottom: 10px; }
          .summary-row { font-size: 14px; margin-bottom: 6px; color: #475569; }
          .summary-row strong { color: #142B4A; }
          .signoff { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #334155; }
          .signoff-name { font-weight: 700; color: #142B4A; font-size: 15px; margin-top: 6px; }
          .signoff-company { font-size: 13px; font-weight: 600; color: #159B9A; letter-spacing: 0.5px; }
          .footer { background-color: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          .footer a { color: #159B9A; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background-color: #142B4A; color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #159B9A;">
            <h1 class="brand-title" style="font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff; margin: 0; text-transform: none !important; font-family: 'Times New Roman', Times, Georgia, serif;">IraSoft Technologies</h1>
            <div class="brand-subtitle" style="font-size: 13px; color: #159B9A; margin-top: 4px; font-weight: 600; text-transform: none !important;">Careers &amp; Talent Acquisition</div>
          </div>
          <div class="content">
            <div class="salutation">Hi ${escapeHtml(firstName)},</div>

            <p class="paragraph">
              Thank you for submitting your application for the position of <strong>${escapeHtml(data.roleTitle)}${data.department ? ` (${escapeHtml(data.department)})` : ""}</strong>. We appreciate your interest in joining the team at <strong>IraSoft Technologies</strong>.
            </p>

            <p class="paragraph">
              Our hiring team is currently reviewing all applications. If your profile is shortlisted for this role, our team will contact you shortly to discuss the next steps in the interview process.
            </p>

            <p class="paragraph">
              In the meantime, please feel free to refer to our company website at <a href="${COMPANY.websiteUrl}" style="color: #159B9A; font-weight: 600; text-decoration: underline;">${COMPANY.websiteUrl}</a> to learn more about our culture, our values, and the work we do.
            </p>

            <div class="summary-card">
              <div class="summary-title">Application Reference Details</div>
              <div class="summary-row"><strong>Position Applied:</strong> ${escapeHtml(data.roleTitle)}</div>
              <div class="summary-row"><strong>Applicant Name:</strong> ${escapeHtml(data.fullName)}</div>
              <div class="summary-row"><strong>Experience Level:</strong> ${escapeHtml(data.experience)}</div>
              <div class="summary-row"><strong>Application Reference:</strong> ${refId}</div>
              <div class="summary-row"><strong>Submission Date:</strong> ${dateFormatted}</div>
            </div>

            <p class="paragraph">
              Thank you again for your time and interest.
            </p>

            <div class="signoff">
              <div>Best regards,</div>
              <div class="signoff-name" style="font-weight: 700; color: #142B4A; font-size: 15px; margin-top: 6px; text-transform: none !important;">IraSoft Technologies Recruitment Team</div>
              <div class="signoff-company" style="font-size: 13px; font-weight: 600; color: #159B9A; letter-spacing: 0.5px; text-transform: none !important;">IraSoft Technologies</div>
            </div>
          </div>
          <div class="footer">
            &copy; ${now.getFullYear()} ${COMPANY.legalName}. All Rights Reserved.<br />
            ${COMPANY.domain} &bull; <a href="mailto:${COMPANY.emails.enquiry}">${COMPANY.emails.enquiry}</a> &bull; ${COMPANY.phone.display}
          </div>
        </div>
      </body>
    </html>
  `;

  if (!apiKey) {
    console.info("[IraSoft Job Application - DEV MODE (No RESEND_API_KEY)]:", {
      caption: "Job Application",
      to: notificationEmail,
      applicantName: data.fullName,
      applicantEmail: data.email,
      refId,
      roleTitle: data.roleTitle,
      from: fromEmail,
      experience: data.experience,
      hasAttachment: Boolean(data.resumeAttachment),
      timestamp: now.toISOString(),
    });

    console.info(`[Dev Preview - Candidate Acknowledgment sent to ${data.email}]:\nHi ${firstName},\nThank you for submitting your application for the position of ${data.roleTitle}. We appreciate your interest in joining the team at IraSoft Technologies...`);

    return {
      success: true,
      mode: "development_logged",
      messageId: `dev-job-${Date.now()}`,
      acknowledgmentSent: true,
    };
  }

  // 1. Send primary notification to IraSoft hiring desk
  const primaryResult = await sendViaResend({
    apiKey,
    from: fromEmail,
    to: [notificationEmail],
    replyTo: data.email,
    subject: `Job Application: ${data.roleTitle} — ${data.fullName} [Ref: ${refId}]`,
    html: htmlNotification,
    attachments: data.resumeAttachment ? [data.resumeAttachment] : undefined,
  });

  if (!primaryResult.success) {
    return primaryResult;
  }

  // 2. Send acknowledgment email to applicant (PhonePe style) and await so serverless does not abort
  let acknowledgmentSent = false;
  if (data.email) {
    const ackResult = await sendViaResend({
      apiKey,
      from: fromEmail,
      to: [data.email],
      replyTo: COMPANY.emails.enquiry,
      subject: `Application Received: ${data.roleTitle} — IraSoft Technologies`,
      html: htmlApplicantConfirmation,
    });

    if (ackResult.success) {
      acknowledgmentSent = true;
    } else {
      console.warn("[Applicant Acknowledgment Email Non-Critical Notice]:", ackResult.error);
    }
  }

  return {
    ...primaryResult,
    acknowledgmentSent,
  };
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

