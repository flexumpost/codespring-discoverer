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
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeEmailProps {
  name: string
  subject: string
  bodyHtml: string
  loginUrl: string
  recoveryLink?: string | null
}

export const WelcomeEmail = ({ name, subject, bodyHtml, loginUrl, recoveryLink }: WelcomeEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://hokiuavxyoymcenqlvly.supabase.co/storage/v1/object/public/email-assets/flexum-logo.png"
          alt="Flexum Coworking"
          width="120"
          height="auto"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Velkommen, {name}!</Heading>
        <Section>
          <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </Section>
        <Section style={infoBox}>
          <Text style={infoText}>
            <strong>Din digitale postkasse</strong> er klar — her kan du se og håndtere al post, der modtages på dit kontor hos Flexum Coworking.
          </Text>
          <Text style={infoText}>
            Du vil også modtage en separat velkomst-e-mail til OfficeRnD, hvor du kan se og betale dine fakturaer.
          </Text>
        </Section>
        {recoveryLink ? (
          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button
              href={recoveryLink}
              style={button}
            >
              Sæt din adgangskode →
            </Button>
            <Text style={{ fontSize: '13px', color: '#666666', marginTop: '12px' }}>
              Når du har sat din adgangskode, kan du logge ind på <a href={loginUrl} style={{ color: 'hsl(222.2, 47.4%, 11.2%)' }}>din postkasse</a>.
            </Text>
          </Section>
        ) : (
          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button
              href={loginUrl}
              style={button}
            >
              Log ind i din postkasse →
            </Button>
          </Section>
        )}
        <Text style={footer}>
          Denne e-mail er sendt fra Flexum Coworking. Kontakt os hvis du har spørgsmål.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 47.4%, 11.2%)',
  margin: '0 0 20px',
}
const infoBox = {
  backgroundColor: '#f4f8fb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
}
const infoText = {
  fontSize: '14px',
  color: 'hsl(215.4, 16.3%, 46.9%)',
  lineHeight: '1.6' as const,
  margin: '0 0 10px',
}
const button = {
  backgroundColor: '#00aaeb',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
