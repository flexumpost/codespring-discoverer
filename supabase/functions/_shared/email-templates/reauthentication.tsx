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

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL =
  'https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Preview>Din bekræftelseskode til Flexum Coworking</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Flexum Coworking" width="120" height="auto" style={logo} />
        <Heading style={h1}>Bekræft din identitet</Heading>
        <Text style={text}>Brug koden nedenfor for at bekræfte din identitet hos <strong>Flexum Coworking</strong>:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Koden udløber om kort tid. Hvis du ikke har anmodet om dette, kan du roligt ignorere e-mailen.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#00aaeb',
  letterSpacing: '4px',
  margin: '20px 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
