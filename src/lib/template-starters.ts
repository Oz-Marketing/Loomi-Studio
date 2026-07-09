/**
 * Default starter templates for new email template creation.
 *
 * Visual (Drag & Drop): Rich multi-component v2 JSON template (react-email)
 * Code (HTML): Custom email-safe HTML starter for direct editing
 */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Rich block-based starter for visual (Drag & Drop) mode — emits v2 JSON. */
function visualStarter(title: string) {
  const id = (suffix: string) => `b-${suffix}-${Math.random().toString(36).slice(2, 8)}`;
  const template = {
    version: '2',
    subject: title,
    preheader: '',
    settings: {
      bodyBg: '#f5f5f5',
      contentBg: '#ffffff',
      contentWidth: 600,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      textColor: '#1a1a1a',
    },
    blocks: [
      {
        id: id('hero'),
        type: 'section',
        props: {
          bgColor: '#1a1a2e',
          paddingTop: 64,
          paddingBottom: 64,
          paddingLeft: 40,
          paddingRight: 40,
          align: 'center',
        },
        children: [
          {
            id: id('h1'),
            type: 'heading',
            props: {
              text: 'Your Headline Goes Here',
              level: 1,
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 700,
              align: 'center',
              marginBottom: 12,
            },
          },
          {
            id: id('sub'),
            type: 'text',
            props: {
              text: "Add a brief description that captures your audience's attention.",
              color: '#e0e0e0',
              fontSize: 16,
              align: 'center',
              marginBottom: 24,
            },
          },
          {
            id: id('cta'),
            type: 'button',
            props: {
              text: 'Get Started',
              url: '#',
              bgColor: '#4f46e5',
              textColor: '#ffffff',
              align: 'center',
              borderRadiusTopLeft: 8,
              borderRadiusTopRight: 8,
              borderRadiusBottomRight: 8,
              borderRadiusBottomLeft: 8,
            },
          },
        ],
      },
      {
        id: id('body'),
        type: 'section',
        props: { paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40 },
        children: [
          {
            id: id('greeting'),
            type: 'heading',
            props: { text: 'Hi {{contact.first_name}},', level: 2, fontSize: 22, marginBottom: 16 },
          },
          {
            id: id('body-text'),
            type: 'text',
            props: {
              text: 'Thank you for being a valued member of our community. Replace this with your message.',
              fontSize: 15,
              lineHeight: '1.6',
              marginBottom: 0,
            },
          },
        ],
      },
    ],
  };
  return JSON.stringify(template, null, 2);
}

/** Custom raw-HTML starter for code (HTML) editing mode */
function codeStarter(title: string) {
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${safeTitle}</title>
  <style>
    /* ── Dark mode overrides ──
       Apple Mail, Outlook iOS, and recent Outlook macOS honor these. Gmail
       and Outlook.com apply their own forced inversion that ignores CSS.
       !important is required to win over the inline style attributes. */
    @media (prefers-color-scheme: dark) {
      .body-bg       { background-color: #0a0a0a !important; }
      .card          { background-color: #1a1a1a !important; border-color: #2a2a2a !important; }
      .eyebrow       { color: #8b85ff !important; }
      .headline      { color: #fafafa !important; }
      .body-text     { color: #d4d4d4 !important; }
      .divider       { border-top-color: #2a2a2a !important; }
      .section-label { color: #a1a1aa !important; }
      .feature-title { color: #fafafa !important; }
      .feature-text  { color: #d4d4d4 !important; }
      .footer-name   { color: #fafafa !important; }
      .footer-text   { color: #a1a1aa !important; }
      .link          { color: #8b85ff !important; }
      .link-muted    { color: #a1a1aa !important; }
    }
    /* ── Mobile responsive ──
       Shrink card padding and stack the feature columns on small viewports. */
    @media only screen and (max-width: 480px) {
      .card-pad    { padding-left: 24px !important; padding-right: 24px !important; }
      .feature-row { padding-left: 12px !important; padding-right: 12px !important; }
      .feature-col { display: block !important; width: 100% !important; max-width: 100% !important; padding: 0 0 24px !important; }
      .feature-col-last { padding-bottom: 0 !important; }
    }
  </style>
</head>
<body class="body-bg" bgcolor="#f5f5f7" style="margin:0; padding:0; background-color:#f5f5f7;">
  <!-- Preheader: hidden inbox preview text. Padded with zero-width chars so
       the inbox doesn't bleed into your body copy. -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Add a one-line preview that shows in inbox lists.
    &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <!-- Page wrapper -->
  <table role="presentation" class="body-bg" bgcolor="#f5f5f7" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; border-collapse:collapse; background-color:#f5f5f7;">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">

        <!-- Logo header (above the card) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%; max-width:600px;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <a href="{{location.website}}" style="text-decoration:none; border:0;">
                <img src="https://placehold.co/180x44/5046e4/ffffff?text=Your+Logo" width="180" height="44" alt="{{location.name}}" style="display:block; max-width:100%; height:auto; border:0; outline:none; margin:0 auto;">
              </a>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" class="card" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%; max-width:600px; border-collapse:separate; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">

          <!-- Hero image (edge-to-edge inside card) -->
          <tr>
            <td style="padding:0; font-size:0; line-height:0;">
              <img src="https://placehold.co/600x280/5046e4/ffffff?text=Hero+Image" width="600" height="280" alt="Hero image" style="display:block; width:100%; max-width:100%; height:auto; border:0; outline:none;">
            </td>
          </tr>

          <!-- Eyebrow + Headline -->
          <tr>
            <td class="card-pad" style="padding:40px 48px 0;">
              <p class="eyebrow" style="margin:0 0 12px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:16px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#5046e4;">
                {{location.name}}
              </p>
              <h1 class="headline" style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:32px; line-height:40px; font-weight:700; color:#0a0a0a;">
                Your headline goes here
              </h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td class="card-pad" style="padding:0 48px 24px;">
              <p class="body-text" style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:26px; color:#374151;">
                Hi {{contact.first_name}},
              </p>
              <p class="body-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:26px; color:#374151;">
                Start with a clear, conversational summary of the message — the offer, the update, the invitation. Keep it short and lead with the value to the reader.
              </p>
            </td>
          </tr>

          <!-- Primary CTA -->
          <tr>
            <td class="card-pad" style="padding:24px 48px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="#5046e4" style="border-radius:8px; background-color:#5046e4;">
                    <a href="#" style="display:inline-block; padding:14px 28px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:20px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Take action
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feature row — 3-up image grid -->
          <tr>
            <td class="card-pad divider" style="padding:32px 48px 16px; border-top:1px solid #e5e7eb;">
              <p class="section-label" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; line-height:14px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#6b7280;">
                What's inside
              </p>
            </td>
          </tr>
          <tr>
            <td class="feature-row" style="padding:0 36px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td class="feature-col" width="33%" valign="top" align="center" style="padding:0 12px;">
                    <img src="https://placehold.co/156x100/e5e7eb/6b7280?text=Image+1" width="156" height="100" alt="Feature one" style="display:block; max-width:100%; height:auto; border:0; outline:none; border-radius:8px; margin:0 auto 12px;">
                    <p class="feature-title" style="margin:0 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:20px; font-weight:600; color:#0a0a0a;">
                      Feature one
                    </p>
                    <p class="feature-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#374151;">
                      Short description goes here.
                    </p>
                  </td>
                  <td class="feature-col" width="33%" valign="top" align="center" style="padding:0 12px;">
                    <img src="https://placehold.co/156x100/e5e7eb/6b7280?text=Image+2" width="156" height="100" alt="Feature two" style="display:block; max-width:100%; height:auto; border:0; outline:none; border-radius:8px; margin:0 auto 12px;">
                    <p class="feature-title" style="margin:0 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:20px; font-weight:600; color:#0a0a0a;">
                      Feature two
                    </p>
                    <p class="feature-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#374151;">
                      Short description goes here.
                    </p>
                  </td>
                  <td class="feature-col feature-col-last" width="33%" valign="top" align="center" style="padding:0 12px;">
                    <img src="https://placehold.co/156x100/e5e7eb/6b7280?text=Image+3" width="156" height="100" alt="Feature three" style="display:block; max-width:100%; height:auto; border:0; outline:none; border-radius:8px; margin:0 auto 12px;">
                    <p class="feature-title" style="margin:0 0 4px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:20px; font-weight:600; color:#0a0a0a;">
                      Feature three
                    </p>
                    <p class="feature-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#374151;">
                      Short description goes here.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="card-pad divider" style="padding:24px 48px 40px; border-top:1px solid #e5e7eb;">
              <p class="footer-name" style="margin:0 0 6px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:22px; font-weight:600; color:#0a0a0a;">
                {{location.name}}
              </p>
              <p class="footer-text" style="margin:0 0 12px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:22px; color:#6b7280;">
                {{location.address}}<br>
                {{location.city}}, {{location.state}} {{location.postal_code}}<br>
                {{location.phone}}
              </p>
              <p class="footer-text" style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:22px; color:#6b7280;">
                <a href="{{location.website}}" class="link" style="color:#5046e4; text-decoration:none;">{{location.website}}</a>
                &nbsp;·&nbsp;
                <a href="{{unsubscribe_link}}" class="link-muted" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Get the appropriate starter template for the given editor mode.
 */
export function getStarterTemplate(mode: 'visual' | 'code', title = 'Untitled Template'): string {
  return mode === 'code' ? codeStarter(title) : visualStarter(title);
}
