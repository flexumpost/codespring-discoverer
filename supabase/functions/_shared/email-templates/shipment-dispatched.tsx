/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ShipmentDispatchedEmailProps {
  name: string
  subject: string
  bodyHtml: string
  loginUrl: string
  trackingNumber?: string
  stampNumber?: string
  mailTypeLabel?: string
}

export const ShipmentDispatchedEmail = ({
  name,
  subject,
  bodyHtml,
  loginUrl,
  trackingNumber,
  stampNumber,
  mailTypeLabel,
}: ShipmentDispatchedEmailProps) => {
  const trackingUrl = trackingNumber
    ? `https://tracking.postnord.com/tracking.html?id=${encodeURIComponent(trackingNumber)}`
    : null

  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png"
            alt="Flexum"
            width="120"
            height="auto"
            style={{ marginBottom: '40px' }}
          />
          <Heading style={h1}>{subject}</Heading>
          <Section>
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </Section>

          {(stampNumber || mailTypeLabel) && (
            <Section style={infoBox}>
              {mailTypeLabel && (
                <Text style={infoText}>
                  <strong>Type:</strong> {mailTypeLabel === 'pakke' ? 'Pakke' : 'Brev (DAO)'}
                </Text>
              )}
              {stampNumber && (
                <Text style={infoText}>
                  <strong>Stempelnummer:</strong> {stampNumber}
                </Text>
              )}
            </Section>
          )}

          {trackingUrl && (
            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <div dangerouslySetInnerHTML={{ __html: `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${trackingUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" stroke="f" fillcolor="#00aaeb">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Spor din pakke →</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${trackingUrl}" style="background-color:#00aaeb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Spor din pakke →</a>
<!--<![endif]-->
              ` }} />
            </Section>
          )}

          <Section style={{ textAlign: 'center' as const, margin: '16px 0 32px' }}>
            <div dangerouslySetInnerHTML={{ __html: `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${loginUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" stroke="f" fillcolor="#00aaeb">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Gå til postkasse →</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${loginUrl}" style="background-color:#00aaeb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Gå til postkasse →</a>
<!--<![endif]-->
            ` }} />
          </Section>

          <Text style={footer}>
            Denne e-mail er sendt fra Flexum. Kontakt os hvis du har spørgsmål.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ShipmentDispatchedEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 47.4%, 11.2%)',
  margin: '0 0 20px',
}
const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
}
const infoText = {
  fontSize: '14px',
  color: 'hsl(215.4, 16.3%, 46.9%)',
  margin: '4px 0',
  lineHeight: '1.6' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
