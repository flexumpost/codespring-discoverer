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

interface NewShipmentEmailProps {
  name: string
  subject: string
  bodyHtml: string
  loginUrl: string
}

export const NewShipmentEmail = ({ name, subject, bodyHtml, loginUrl }: NewShipmentEmailProps) => (
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
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>{subject}</Heading>
        <Section>
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          {/* Bulletproof button with VML fallback for Outlook */}
          <div dangerouslySetInnerHTML={{ __html: `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${loginUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" stroke="f" fillcolor="#00aaeb">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Se din post →</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${loginUrl}" style="background-color:#00aaeb;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Se din post →</a>
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

export default NewShipmentEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 47.4%, 11.2%)',
  margin: '0 0 20px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
