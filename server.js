const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const app = express();
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'r1walz',
    password: '',
    database: 'smart-brain'
  }
})

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
  knex('users').select('*').then(data => res.json(data));
});

app.post('/signin', (req, res) => {
  knex('login')
    .select('email', 'hash')
    .where({ email: req.body.email })
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);

      if (isValid) {
        return knex('users')
          .where({ email: req.body.email })
          .then(user => res.json(user[0]))
          .catch(err => res.status(400).json('unable to signin'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const hash = bcrypt.hashSync(password);

  knex.transaction(trx => {
    trx('login').insert({
      hash: hash,
      email: email
    })
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => res.json(user[0]));
      })
      .then(trx.commit)
      .catch(trx.rollback)
  })
    .catch(err => res.status(400).json('unable to register'))
});

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;

  knex('users')
    .select('*')
    .where({ id })
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
});

app.put('/image', (req, res) => {
  const { id } = req.body;

  knex('users')
    .where({ id })
    .increment('entries', 1)
    .returning('entries')
    .then(entries => res.json(entries[0]))
    .catch(err => res.status(400).json('unable to get count'))
});

app.listen(3000, () => {
  console.log("app is running on port 3000.")
});