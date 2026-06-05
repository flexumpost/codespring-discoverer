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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL =
  'https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png'

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Preview>Dit login-link til Flexum Coworking</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Flexum Coworking" width="120" height="auto" style={logo} />
        <Heading style={h1}>Dit login-link</Heading>
        <Text style={text}>
          Klik på knappen nedenfor for at logge ind på <strong>Flexum Coworking</strong>. Linket udløber om kort tid.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Log ind →
          </Button>
        </Section>
        <Text style={fallback}>
          Virker knappen ikke? Kopiér dette link ind i din browser:<br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Text style={footer}>
          Hvis du ikke har anmodet om dette link, kan du roligt ignorere e-mailen.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 47.4%, 11.2%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215.4, 16.3%, 46.9%)',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const link = { color: '#00aaeb', textDecoration: 'underline', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: '#00aaeb',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '6px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const fallback = {
  fontSize: '12px',
  color: '#666666',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
