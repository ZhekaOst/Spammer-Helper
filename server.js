const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const config = require('./config');

const app = express();
const PORT = 3000;

const MESSAGE_TEMPLATES = [
  {
    id: 1,
    name: 'Привітання',
    subject: 'Привіт!',
    body: 'Вітаємо! Це тестове повідомлення від нашої розсилки.'
  },
  {
    id: 2,
    name: 'Реклама',
    subject: 'Спеціальна пропозиція',
    body: 'Шановний клієнте! У нас є для вас неймовірна пропозиція. Не пропустіть!'
  },
  {
    id: 3,
    name: 'Новини',
    subject: 'Останні новини',
    body: 'Дізнайтеся про останні новини нашої компанії. Ми постійно розвиваємось!'
  },
  {
    id: 4,
    name: 'Нагадування',
    subject: 'Нагадування про подію',
    body: 'Нагадуємо вам про майбутню подію. Будь ласка, не забудьте!'
  },
  {
    id: 5,
    name: 'Подяка',
    subject: 'Дякуємо!',
    body: 'Щиро дякуємо за вашу підтримку та співпрацю з нами!'
  }
];

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

async function getDb() {
  return await mysql.createConnection(config.db);
}

async function waitForDb(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const db = await getDb();
      await db.end();
      return;
    } catch (err) {
      console.log(`Очікування MySQL... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Не вдалося підключитись до MySQL');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

app.get('/', async (req, res) => {
  const db = await getDb();
  const [contacts] = await db.query(
    'SELECT * FROM contacts ORDER BY last_name, first_name, middle_name'
  );
  await db.end();
  res.render('index', { contacts, templates: MESSAGE_TEMPLATES });
});

app.post('/send', async (req, res) => {
  const { selectedContacts, templateId, customSubject, customBody } = req.body;

  if (!selectedContacts || selectedContacts.length === 0) {
    return res.redirect('/?error=no_contacts');
  }

  let subject, body;
  if (templateId && templateId !== 'custom') {
    const template = MESSAGE_TEMPLATES.find(t => t.id == templateId);
    subject = template.subject;
    body = template.body;
  } else {
    subject = customSubject;
    body = customBody;
  }

  const db = await getDb();
  const ids = Array.isArray(selectedContacts) ? selectedContacts : [selectedContacts];
  const placeholders = ids.map(() => '?').join(',');
  const [contacts] = await db.query(
    `SELECT * FROM contacts WHERE id IN (${placeholders})`,
    ids
  );
  await db.end();

  let sentCount = 0;
  let errors = [];

  for (const contact of contacts) {
    try {
      await transporter.sendMail({
        from: config.email.user,
        to: contact.email,
        subject: subject,
        text: `${contact.last_name} ${contact.first_name} ${contact.middle_name},\n\n${body}`
      });
      sentCount++;
    } catch (err) {
      errors.push(`${contact.email}: ${err.message}`);
    }
  }

  res.render('send_result', { sentCount, errors, total: contacts.length });
});

app.get('/manage', async (req, res) => {
  const db = await getDb();
  const [contacts] = await db.query(
    'SELECT * FROM contacts ORDER BY last_name, first_name, middle_name'
  );
  await db.end();
  res.render('manage', { contacts, error: req.query.error || null });
});

app.post('/manage/add', async (req, res) => {
  const { last_name, first_name, middle_name, email } = req.body;
  try {
    const db = await getDb();
    await db.query(
      'INSERT INTO contacts (last_name, first_name, middle_name, email) VALUES (?, ?, ?, ?)',
      [last_name, first_name, middle_name, email]
    );
    await db.end();
    res.redirect('/manage');
  } catch (err) {
    res.redirect('/manage?error=duplicate_email');
  }
});

app.get('/manage/edit/:id', async (req, res) => {
  const db = await getDb();
  const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
  await db.end();
  if (rows.length === 0) return res.redirect('/manage');
  res.render('edit', { contact: rows[0] });
});

app.post('/manage/edit/:id', async (req, res) => {
  const { last_name, first_name, middle_name, email } = req.body;
  try {
    const db = await getDb();
    await db.query(
      'UPDATE contacts SET last_name=?, first_name=?, middle_name=?, email=? WHERE id=?',
      [last_name, first_name, middle_name, email, req.params.id]
    );
    await db.end();
    res.redirect('/manage');
  } catch (err) {
    res.redirect('/manage?error=duplicate_email');
  }
});

app.post('/manage/delete/:id', async (req, res) => {
  const db = await getDb();
  await db.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
  await db.end();
  res.redirect('/manage');
});

waitForDb().then(() => {
  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
});
