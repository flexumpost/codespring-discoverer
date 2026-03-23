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
  Text,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeShipmentEmailProps {
  name: string
  subject: string
  bodyHtml: string
  confirmationUrl: string
}

export const WelcomeShipmentEmail = ({
  name,
  subject,
  bodyHtml,
  confirmationUrl,
}: WelcomeShipmentEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png" alt="Flexum" width="120" height="auto" style={{ marginBottom: '40px' }} />
        <Heading style={h1}>{subject}</Heading>
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <div style={buttonSection} dangerouslySetInnerHTML={{ __html: `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${confirmationUrl}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="18%" stroke="f" fillcolor="#00aaeb">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Sæt din adgangskode →</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${confirmationUrl}" style="background-color:#00aaeb;color:#ffffff;font-size:14px;font-weight:600;border-radius:0.5rem;padding:12px 24px;text-decoration:none;display:inline-block;mso-line-height-rule:exactly;">Sæt din adgangskode →</a>
<!--<![endif]-->
        ` }} />
        <Text style={hint}>Linket er aktivt i 24 timer.</Text>
        <Text style={footer}>
          Denne e-mail er sendt fra Flexum. Kontakt os hvis du har spørgsmål.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeShipmentEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 84%, 4.9%)',
  margin: '0 0 20px',
}
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const hint = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
