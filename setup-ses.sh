#!/bin/bash

# Setup Amazon SES for Travel Diary App
# This script sets up SES for sending collaboration invitation emails

set -e

echo "🚀 Setting up Amazon SES for Travel Diary App..."

# Configuration
REGION="ap-northeast-1"
FROM_EMAIL="noreply@traveldiary.com"  # Replace with your domain
DOMAIN="traveldiary.com"  # Replace with your domain

echo "📧 Setting up SES in region: $REGION"

# 1. Verify email identity (for testing, use your email)
echo "📝 Please enter your email address for SES verification:"
read -p "Email: " ADMIN_EMAIL

if [ ! -z "$ADMIN_EMAIL" ]; then
    echo "🔍 Verifying email identity: $ADMIN_EMAIL"
    aws ses verify-email-identity \
        --email-address "$ADMIN_EMAIL" \
        --region "$REGION" || echo "⚠️  Email verification initiated (check your inbox)"
fi

# 2. Create SES configuration set
echo "⚙️  Creating SES configuration set..."
aws ses create-configuration-set \
    --configuration-set Name=travel-diary-emails \
    --region "$REGION" 2>/dev/null || echo "ℹ️  Configuration set may already exist"

# 3. Create email template for invitations
echo "📄 Creating email template for collaboration invites..."
cat > /tmp/invite-template.json << EOF
{
  "TemplateName": "TravelDiaryInvite",
  "Subject": "You're invited to collaborate on {{trip_title}}",
  "HtmlPart": "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Travel Diary Invitation</title></head><body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'><div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;'><h1 style='margin: 0; font-size: 28px;'>🌍 Travel Diary</h1><p style='margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;'>Collaborative Trip Planning</p></div><div style='background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;'><h2 style='color: #333; margin-top: 0;'>You're invited to collaborate!</h2><p style='color: #666; font-size: 16px; line-height: 1.6;'>{{inviter_name}} has invited you to collaborate on their trip:</p><div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'><h3 style='color: #333; margin: 0 0 10px 0;'>{{trip_title}}</h3><p style='color: #666; margin: 0;'><strong>Destination:</strong> {{destination}}</p><p style='color: #666; margin: 5px 0 0 0;'><strong>Dates:</strong> {{start_date}} - {{end_date}}</p><p style='color: #666; margin: 5px 0 0 0;'><strong>Your Role:</strong> {{role}}</p></div>{{#if message}}<div style='background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;'><p style='color: #1976d2; margin: 0; font-style: italic;'>\"{{message}}\"</p></div>{{/if}}<div style='text-align: center; margin: 30px 0;'><a href='{{accept_url}}' style='background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;'>✅ Accept Invitation</a><a href='{{decline_url}}' style='background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;'>❌ Decline</a></div><div style='border-top: 1px solid #e1e5e9; padding-top: 20px; margin-top: 30px;'><p style='color: #999; font-size: 14px; text-align: center; margin: 0;'>This invitation will expire in 7 days. If you have any questions, please contact {{inviter_email}}.</p></div></div></body></html>",
  "TextPart": "You're invited to collaborate on {{trip_title}}!\n\n{{inviter_name}} has invited you to collaborate on their trip:\n\nTrip: {{trip_title}}\nDestination: {{destination}}\nDates: {{start_date}} - {{end_date}}\nYour Role: {{role}}\n\n{{#if message}}Message from {{inviter_name}}:\n\"{{message}}\"\n\n{{/if}}To accept this invitation, visit: {{accept_url}}\nTo decline this invitation, visit: {{decline_url}}\n\nThis invitation will expire in 7 days.\n\n---\nTravel Diary - Collaborative Trip Planning\nhttps://d16hcqzmptnoh8.cloudfront.net"
}
EOF

aws ses create-template \
    --template file:///tmp/invite-template.json \
    --region "$REGION" 2>/dev/null || echo "ℹ️  Template may already exist"

# 4. Create email template for share notifications
echo "📄 Creating email template for share notifications..."
cat > /tmp/share-template.json << EOF
{
  "TemplateName": "TravelDiaryShare",
  "Subject": "{{trip_title}} - Shared Trip Link",
  "HtmlPart": "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Travel Diary Share</title></head><body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'><div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;'><h1 style='margin: 0; font-size: 28px;'>🌍 Travel Diary</h1><p style='margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;'>Trip Sharing</p></div><div style='background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;'><h2 style='color: #333; margin-top: 0;'>Trip Shared Successfully!</h2><p style='color: #666; font-size: 16px; line-height: 1.6;'>Your trip has been shared and is now accessible via the link below:</p><div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'><h3 style='color: #333; margin: 0 0 10px 0;'>{{trip_title}}</h3><p style='color: #666; margin: 0;'><strong>Destination:</strong> {{destination}}</p><p style='color: #666; margin: 5px 0 0 0;'><strong>Share Link:</strong></p><div style='background: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0; word-break: break-all;'><a href='{{share_url}}' style='color: #2196f3; text-decoration: none;'>{{share_url}}</a></div></div><div style='background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;'><p style='color: #856404; margin: 0; font-size: 14px;'><strong>Security Note:</strong> This link provides {{#if is_public}}public{{else}}limited{{/if}} access to your trip. {{#if password_protected}}A password is required to view the trip.{{/if}} The link expires on {{expires_at}}.</p></div></div></body></html>",
  "TextPart": "Your trip has been shared successfully!\n\nTrip: {{trip_title}}\nDestination: {{destination}}\n\nShare Link: {{share_url}}\n\nSecurity Note: This link provides {{#if is_public}}public{{else}}limited{{/if}} access to your trip. {{#if password_protected}}A password is required to view the trip.{{/if}} The link expires on {{expires_at}}.\n\n---\nTravel Diary - Collaborative Trip Planning\nhttps://d16hcqzmptnoh8.cloudfront.net"
}
EOF

aws ses create-template \
    --template file:///tmp/share-template.json \
    --region "$REGION" 2>/dev/null || echo "ℹ️  Template may already exist"

# 5. Check SES sending limits
echo "📊 Checking SES sending limits..."
aws ses get-send-quota --region "$REGION" 2>/dev/null || echo "⚠️  Unable to check send quota - may need additional permissions"

# 6. Create IAM policy for Lambda to use SES
echo "🔐 Creating IAM policy for SES access..."
cat > /tmp/ses-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendTemplatedEmail",
                "ses:SendRawEmail",
                "ses:GetSendQuota",
                "ses:GetSendStatistics"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam create-policy \
    --policy-name TravelDiarySESPolicy \
    --policy-document file:///tmp/ses-policy.json \
    --description "Policy for Travel Diary Lambda to send emails via SES" 2>/dev/null || echo "ℹ️  Policy may already exist"

# 7. Attach policy to Lambda execution role
LAMBDA_ROLE_NAME="travel-diary-prod-lambda-role-serverless"
POLICY_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/TravelDiarySESPolicy"

aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE_NAME" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || echo "ℹ️  Policy may already be attached"

# Cleanup temp files
rm -f /tmp/invite-template.json /tmp/share-template.json /tmp/ses-policy.json

echo "✅ SES setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Check your email ($ADMIN_EMAIL) and click the verification link"
echo "2. If using a custom domain, verify it in SES console"
echo "3. Request production access if needed (SES starts in sandbox mode)"
echo "4. Update the Lambda function with email sending functionality"
echo ""
echo "🔗 SES Console: https://console.aws.amazon.com/ses/home?region=$REGION"
