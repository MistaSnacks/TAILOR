# TAILOR Email Templates

Custom email templates for Supabase Auth that match the TAILOR brand aesthetic.

## Design

- **Background**: Dark (#0a0a0b)
- **Card**: Slightly lighter (#111113) 
- **Primary gradient**: Mint to Turquoise (#14B8A6 → #06B6D4 → #00D9FF)
- **Border radius**: 12-16px
- **Typography**: System fonts for email compatibility

## Templates

| Template | File | Subject Line |
|----------|------|--------------|
| Signup Confirmation | `confirmation.html` | Confirm Your Email - TAILOR |
| Password Reset | `recovery.html` | Reset Your Password - TAILOR |
| Magic Link | `magic_link.html` | Your Magic Link - TAILOR |
| Email Change | `email_change.html` | Confirm Email Change - TAILOR |
| Invite | `invite.html` | You've Been Invited - TAILOR |

## How to Apply Templates

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (**Resume Wizard**)
3. Navigate to **Authentication** → **Email Templates**
4. For each template:
   - Click on the template type (e.g., "Confirm signup")
   - Copy the HTML content from the corresponding `.html` file
   - Paste into the **Body** field
   - Update the **Subject** line to match the table above
   - Click **Save**

### Option 2: Management API

```bash
# Set your credentials
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="alazeuxszuiylwwciabn"

# Update confirmation template
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_confirmation": "Confirm Your Email - TAILOR",
    "mailer_templates_confirmation_content": "<paste HTML here>",
    "mailer_subjects_recovery": "Reset Your Password - TAILOR",
    "mailer_templates_recovery_content": "<paste HTML here>",
    "mailer_subjects_magic_link": "Your Magic Link - TAILOR",
    "mailer_templates_magic_link_content": "<paste HTML here>",
    "mailer_subjects_invite": "You Have Been Invited - TAILOR",
    "mailer_templates_invite_content": "<paste HTML here>",
    "mailer_subjects_email_change": "Confirm Email Change - TAILOR",
    "mailer_templates_email_change_content": "<paste HTML here>"
  }'
```

## Template Variables

These variables are available in all templates:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The confirmation/action link |
| `{{ .SiteURL }}` | Your application's Site URL |
| `{{ .Email }}` | User's email address |
| `{{ .Token }}` | 6-digit OTP code |
| `{{ .TokenHash }}` | Hashed version of token |
| `{{ .NewEmail }}` | New email (only in email_change) |

## Testing

After applying templates:

1. Sign up with a new test email
2. Check that the email arrives with correct styling
3. Verify the confirmation link works
4. Test password reset flow
5. **Note**: Check spam/junk folder if email doesn't arrive

## Email Deliverability Tips

- Enable SPF, DKIM, and DMARC on your domain
- Consider using a custom SMTP provider (Resend, Postmark, SendGrid)
- Keep emails under 102KB to avoid Gmail clipping
- Test across email clients (Gmail, Outlook, Apple Mail)

