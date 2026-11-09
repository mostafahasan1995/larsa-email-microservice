const { connect, StringCodec } = require('nats');

async function sendEmailEvent() {
  // Connect to local NATS server
  const nc = await connect({ servers: 'nats://localhost:4223' });
  const sc = StringCodec();
  
  // Prepare your email payload (must match your listener's expected JSON)
  const emailData = {
    to: 'obada.maleh@larsa.org',
    subject: 'Hello from NATS!',
    message: 'This is a test email sent via NATS event.',
    headers: { 'X-Custom-Header': 'NATS-Test' },
    others: {}
  };

  // Publish on the subject 'email:send'
  nc.publish('email:send', sc.encode(JSON.stringify(emailData)));

  console.log('Email event sent!');
  await nc.drain(); // close connection gracefully
}

sendEmailEvent().catch(console.error);