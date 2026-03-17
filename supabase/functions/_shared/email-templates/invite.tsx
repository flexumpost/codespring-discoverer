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
    <Preview>Velkommen til Flexum – sæt din adgangskode</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png" alt="Flexum" width="120" height="auto" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Velkommen til Flexum</Heading>
        <Text style={text}>
          Din virksomhed er nu oprettet hos{' '}
          <Link href={siteUrl} style={link}>
            <strong>Flexum</strong>
          </Link>
          . Vi håndterer din post, så du kan fokusere på det vigtige.
        </Text>
        <Text style={text}>
          Klik på knappen nedenfor for at sætte din adgangskode og logge ind for første gang.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Sæt din adgangskode →
          </Button>
        </Section>
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
const link = { color: 'inherit', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = {
  backgroundColor: '#00aaeb',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '0.5rem',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
