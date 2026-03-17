/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Velkommen til Flexum Coworking post – sæt din adgangskode</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png" alt="Flexum" width="120" height="auto" style={{ marginBottom: '40px' }} />
        <Heading style={h1}>Velkommen til Flexum Coworking post</Heading>
        <Text style={text}>
          Din virksomhed har hermed fået en konto hos <strong>Flexum Coworking post</strong>.
        </Text>
        <Text style={text}>
          Her kommer du til at modtage billeder af dine forsendelser og kan bestemme hvad der skal ske med dem.
        </Text>
        <Text style={text}>
          Klik på knappen nedenfor for at sætte din adgangskode og logge ind for første gang.
        </Text>
        <Section style={buttonSection} dangerouslySetInnerHTML={{ __html: `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${confirmationUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#00aaeb">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Sæt din adgangskode →</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${confirmationUrl}" style="background-color:#00aaeb;color:#ffffff;font-size:14px;font-weight:600;border-radius:0.5rem;padding:12px 24px;text-decoration:none;display:inline-block;mso-line-height-rule:exactly;">Sæt din adgangskode →</a>
<!--<![endif]-->
        ` }} />
        <Text style={footer}>
          Hvis du ikke forventede denne e-mail, kan du trygt ignorere den.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 84%, 4.9%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215.4, 16.3%, 46.9%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
