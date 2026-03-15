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
    <Preview>Du er blevet inviteret til Flexum</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png" alt="Flexum" width="120" height="auto" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Du er blevet inviteret</Heading>
        <Text style={text}>
          Du er blevet inviteret til at bruge{' '}
          <Link href={siteUrl} style={link}>
            <strong>Flexum</strong>
          </Link>
          . Klik på knappen nedenfor for at acceptere invitationen og oprette din konto.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Acceptér invitation
        </Button>
        <Text style={footer}>
          Hvis du ikke forventede denne invitation, kan du trygt ignorere denne e-mail.
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
const button = {
  backgroundColor: 'hsl(222.2, 47.4%, 11.2%)',
  color: 'hsl(210, 40%, 98%)',
  fontSize: '14px',
  borderRadius: '0.5rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
